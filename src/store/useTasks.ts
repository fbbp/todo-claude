import { create } from 'zustand';
import { db } from '../db';
import type { Task } from '../db';

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
      const { id: draftId, ...draftWithoutId } = draft;

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
    await get().update(id, { status: newStatus });
  },
}));