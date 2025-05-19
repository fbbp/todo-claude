import { create } from 'zustand';
import { db } from '../db';
import type { Task } from '../db';
import { RRule } from 'rrule';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (task: Partial<Task>) => Promise<string | undefined>;
  update: (id: string, updates: Partial<Task>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
}

export const useTasks = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  
  load: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await db.tasks.toArray();
      set({ tasks, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  add: async (draft) => {
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      // draft から id を除外して新しいタスクを作成
      const { id: _, ...draftWithoutId } = draft;

      const task: Task = {
        id,
        title: draft.title || '',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        ...draftWithoutId,
      };

      await db.tasks.add(task);
      set({ tasks: [...get().tasks, task] });

      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      return undefined;
    }
  },
  
  update: async (id, updates) => {
    try {
      const now = Date.now();
      await db.tasks.update(id, { ...updates, updatedAt: now });
      
      const updatedTasks = get().tasks.map(task => 
        task.id === id 
          ? { ...task, ...updates, updatedAt: now } 
          : task
      );
      set({ tasks: updatedTasks });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  remove: async (id) => {
    try {
      await db.tasks.delete(id);
      set({ tasks: get().tasks.filter(task => task.id !== id) });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  toggleStatus: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    
    const newStatus = task.status === 'pending' ? 'done' : 'pending';
    
    // タスクが完了し、繰り返しルールがある場合、次のタスクを作成
    if (newStatus === 'done' && task.repeatRule && task.dueAt) {
      try {
        const rrule = RRule.fromString(task.repeatRule);
        const currentDue = new Date(task.dueAt);
        
        // 現在の期日より後の次の繰り返し日を取得
        const nextDate = rrule.after(currentDue, false);
        
        if (nextDate) {
          // 繰り返しタスクを作成
          const nextTask: Partial<Task> = {
            title: task.title,
            dueAt: nextDate.getTime(),
            durationMin: task.durationMin,
            categoryId: task.categoryId,
            checklist: task.checklist?.map(item => ({ ...item, checked: false })),
            repeatRule: task.repeatRule,
            repeatParentId: task.repeatParentId || task.id, // 初回の場合は現在のタスクが親
            repeatCount: (task.repeatCount || 0) + 1,
            repeatUntil: task.repeatUntil,
          };
          
          await get().add(nextTask);
        }
      } catch (error) {
        console.error('Failed to create recurring task:', error);
      }
    }
    
    await get().update(id, { status: newStatus });
  },
}));