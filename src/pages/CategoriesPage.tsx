import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useCategories } from '@/store/useCategories';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategoryBadge } from '@/components/CategoryBadge';
import { Navbar } from '@/components/Navbar';
import type { Category } from '@/db';

export function CategoriesPage() {
  const { categories, loading, load, add, update, remove, reorder } = useCategories();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#6366F1',
  });

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: '#6366F1' });
    setFormOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await update(editingCategory.id!, {
        name: formData.name,
        color: formData.color,
      });
    } else {
      await add({
        name: formData.name,
        color: formData.color,
      });
    }

    setFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    setDeleteConfirm(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('dragIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'));
    
    if (dragIndex === dropIndex) return;

    const newCategories = [...categories];
    const [removed] = newCategories.splice(dragIndex, 1);
    newCategories.splice(dropIndex, 0, removed);
    
    await reorder(newCategories);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">読み込み中...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">カテゴリー管理</h1>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新しいカテゴリー
            </Button>
          </div>

          <div className="space-y-3">
            {categories.map((category, index) => (
              <Card
                key={category.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                role="article"
                className="cursor-move hover:shadow-md transition-shadow"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  
                  <div className="flex-1">
                    <CategoryBadge category={category} />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                      aria-label={`${category.name}を編集`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(category.id!)}
                      aria-label={`${category.name}を削除`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {categories.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                カテゴリーがありません。「新しいカテゴリー」ボタンから追加してください。
              </div>
            )}
          </div>
        </div>
      </div>

      {/* カテゴリー作成・編集ダイアログ */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'カテゴリーを編集' : '新しいカテゴリー'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">カテゴリー名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="仕事、プライベートなど"
                required
              />
            </div>

            <div>
              <Label htmlFor="color">カラー</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6366F1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">
                {editingCategory ? '更新' : '作成'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カテゴリーを削除しますか？</DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-gray-600">
            このカテゴリーを使用しているタスクからカテゴリーが削除されます。
            この操作は取り消せません。
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              削除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}