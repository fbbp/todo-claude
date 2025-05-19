import { useEffect, useState } from 'react';
import { Plus, Bell } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { TaskCard } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import { TimelineBar } from '@/components/TimelineBar';
import { CategoryBadge } from '@/components/CategoryBadge';
import { ServiceWorkerUpdate } from '@/components/ServiceWorkerUpdate';
import { Button } from '@/components/ui/button';
import { useTasks } from '../store/useTasks';
import { useCategories } from '../store/useCategories';
import type { Task } from '../db';
import { useNotifications } from '../hooks/useNotifications';
import { useServiceWorker } from '../hooks/useServiceWorker';

export function HomePage() {
  const { tasks, loading, load, add, update, remove, toggleStatus } = useTasks();
  const { categories, load: loadCategories } = useCategories();
  const { permission, requestPermission, scheduleNotification, cancelNotification } = useNotifications();
  const { isOffline } = useServiceWorker();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [selectedDate] = useState(new Date());
  
  useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const todayTasks = tasks.filter((task: any) => {
    if (selectedCategory && task.categoryId !== selectedCategory) {
      return false;
    }
    if (!task.dueAt) return false;
    return task.dueAt >= todayStart.getTime() && task.dueAt <= todayEnd.getTime();
  });
  
  const noDueTasks = tasks.filter((task: any) => {
    if (selectedCategory && task.categoryId !== selectedCategory) {
      return false;
    }
    return !task.dueAt;
  });
  
  const handleAddTask = async (taskData: Partial<Task>) => {
    const taskId = await add({
      ...taskData,
      categoryId: selectedCategory || undefined,
    });

    if (taskId && taskData.dueAt) {
      const newTask = { ...taskData, id: taskId } as Task;
      scheduleNotification(newTask);
    }
  };
  
  const handleEditTask = async (taskData: Partial<Task>) => {
    if (editingTask?.id) {
      await update(editingTask.id, taskData);
      if (taskData.dueAt) {
        const updatedTask = { ...editingTask, ...taskData } as Task;
        scheduleNotification(updatedTask);
      } else {
        cancelNotification(editingTask.id);
      }
    }
  };
  
  const handleDeleteTask = async (id: string) => {
    await remove(id);
    cancelNotification(id);
  };
  
  const openTaskForm = (task?: Task) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">読み込み中...</div>;
  }
  
  return (
    <div className="flex h-screen flex-col">
      <Navbar
        onAddClick={() => openTaskForm()}
      />
      
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-6xl p-4">
          {/* オフライン表示と通知設定 */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isOffline && (
                <div className="rounded-md bg-yellow-50 px-3 py-1 text-sm text-yellow-800">
                  オフライン
                </div>
              )}
            </div>

            {permission !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const result = await requestPermission();
                  if (result === 'granted') {
                    // Schedule notifications for existing tasks
                    tasks.forEach(task => {
                      if (task.dueAt) {
                        scheduleNotification(task);
                      }
                    });
                  }
                }}
              >
                <Bell className="h-4 w-4 mr-1" />
                通知を有効にする
              </Button>
            )}
          </div>
          {/* カテゴリーフィルター */}
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
            <CategoryBadge
              category={{ name: 'すべて', color: '#6366F1', order: 0 }}
              selected={selectedCategory === null}
              onClick={() => setSelectedCategory(null)}
            />
            {categories.map((category: any) => (
              <CategoryBadge
                key={category.id}
                category={category}
                selected={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id!)}
              />
            ))}
          </div>
          
          {/* タイムライン */}
          <div className="mb-8">
            <TimelineBar tasks={todayTasks} date={selectedDate} />
          </div>
          
          {/* 今日のタスク */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">今日のタスク</h2>
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground">今日のタスクはありません</p>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleStatus}
                    onClick={openTaskForm}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* 期限なしタスク */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">期限なし</h2>
            {noDueTasks.length === 0 ? (
              <p className="text-muted-foreground">期限なしのタスクはありません</p>
            ) : (
              <div className="space-y-3">
                {noDueTasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleStatus}
                    onClick={openTaskForm}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* FAB */}
          <Button
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:hidden"
            size="icon"
            onClick={() => openTaskForm()}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
      
      {/* タスクフォーム */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        onDelete={handleDeleteTask}
      />
      
      {/* Service Worker更新通知 */}
      <ServiceWorkerUpdate />
    </div>
  );
}