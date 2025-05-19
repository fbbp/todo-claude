import { useEffect, useState } from 'react';
import { Archive, CheckCircle, Circle, Filter, Search, SortAsc, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { TaskCard } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/store/useTasks';
import { useCategories } from '@/store/useCategories';
import type { Task } from '@/db';

type FilterStatus = 'all' | 'pending' | 'done' | 'archived';
type SortBy = 'createdAt' | 'dueAt' | 'title' | 'status';

export function AllTasksPage() {
  const { tasks, loading, load, update, remove, toggleStatus } = useTasks();
  const { categories, load: loadCategories } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  
  useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);
  
  // フィルタリングとソート
  const filteredAndSortedTasks = tasks
    .filter(task => {
      // ステータスフィルター
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      
      // カテゴリーフィルター
      if (filterCategory !== 'all' && task.categoryId !== filterCategory) {
        return false;
      }
      
      // 検索フィルター
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.checklist?.some(item => item.text.toLowerCase().includes(query))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
        case 'dueAt':
          compareValue = (a.dueAt || 0) - (b.dueAt || 0);
          break;
        case 'status':
          compareValue = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
        default:
          compareValue = a.createdAt - b.createdAt;
          break;
      }
      
      return sortAsc ? compareValue : -compareValue;
    });
  
  // 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(task => task.id!)));
    }
  };
  
  // タスクの選択切り替え
  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };
  
  // 一括アーカイブ
  const archiveSelected = async () => {
    for (const taskId of selectedTasks) {
      await update(taskId, { status: 'archived' });
    }
    setSelectedTasks(new Set());
  };
  
  // 一括削除
  const deleteSelected = async () => {
    if (!confirm(`${selectedTasks.size}件のタスクを削除しますか？この操作は取り消せません。`)) {
      return;
    }
    
    for (const taskId of selectedTasks) {
      await remove(taskId);
    }
    setSelectedTasks(new Set());
  };
  
  const openTaskForm = (task?: Task) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };
  
  const handleTaskSubmit = async (taskData: Partial<Task>) => {
    if (editingTask?.id) {
      await update(editingTask.id, taskData);
    }
  };
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">読み込み中...</div>;
  }
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl mx-auto p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-4">全タスク</h1>
            
            {/* フィルター・検索部分 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">フィルター & 検索</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 検索ボックス */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="タスクを検索..."
                    className="pl-10"
                  />
                </div>
                
                {/* フィルターとソート */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* ステータスフィルター */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">ステータス</label>
                    <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="pending">未完了</SelectItem>
                        <SelectItem value="done">完了</SelectItem>
                        <SelectItem value="archived">アーカイブ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* カテゴリーフィルター */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">カテゴリー</label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id!}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* ソート */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">並び順</label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">作成日</SelectItem>
                        <SelectItem value="dueAt">期限</SelectItem>
                        <SelectItem value="title">タイトル</SelectItem>
                        <SelectItem value="status">ステータス</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* ソート順 */}
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => setSortAsc(!sortAsc)}
                      className="w-full"
                    >
                      <SortAsc className={`h-4 w-4 mr-2 ${sortAsc ? '' : 'rotate-180'}`} />
                      {sortAsc ? '昇順' : '降順'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 選択されたタスクの操作 */}
          {selectedTasks.size > 0 && (
            <div className="mb-4 p-4 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTasks.size}件選択中
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={archiveSelected}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  アーカイブ
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  削除
                </Button>
              </div>
            </div>
          )}
          
          {/* タスク一覧 */}
          <div className="space-y-3">
            {/* 全選択チェックボックス */}
            {filteredAndSortedTasks.length > 0 && (
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Checkbox
                  checked={selectedTasks.size === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">すべて選択</span>
                <span className="text-sm text-muted-foreground">
                  ({filteredAndSortedTasks.length}件のタスク)
                </span>
              </div>
            )}
            
            {/* タスク一覧 */}
            {filteredAndSortedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3">
                <Checkbox
                  checked={selectedTasks.has(task.id!)}
                  onCheckedChange={() => toggleTaskSelection(task.id!)}
                />
                <div className="flex-1">
                  <TaskCard
                    task={task}
                    onToggle={toggleStatus}
                    onClick={() => openTaskForm(task)}
                  />
                </div>
              </div>
            ))}
            
            {/* 空状態 */}
            {filteredAndSortedTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
                    ? '条件に一致するタスクがありません'
                    : 'タスクがありません'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* タスク編集フォーム */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        task={editingTask}
        onSubmit={handleTaskSubmit}
        onDelete={editingTask?.id ? () => remove(editingTask.id!) : undefined}
      />
    </div>
  );
}