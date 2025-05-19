import { db } from '@/db';
import type { Task, Category, Setting } from '@/db';

export interface ExportData {
  version: string;
  exportedAt: number;
  data: {
    tasks: Task[];
    categories: Category[];
    settings: Setting[];
  };
}

/**
 * 全データをエクスポート用のJSONオブジェクトとして取得
 */
export async function exportData(): Promise<ExportData> {
  const tasks = await db.tasks.toArray();
  const categories = await db.categories.toArray();
  const settings = await db.settings.toArray();

  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    data: {
      tasks,
      categories,
      settings,
    },
  };
}

/**
 * JSONデータをファイルとしてダウンロード
 */
export function downloadJSON(data: ExportData, filename?: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `todo-claude-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * ファイルを読み込んでJSONとしてパース
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * インポートデータの検証
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  
  const d = data as any;
  
  // 基本構造の確認
  if (!d.version || !d.exportedAt || !d.data) return false;
  if (typeof d.version !== 'string' || typeof d.exportedAt !== 'number') return false;
  if (!d.data.tasks || !d.data.categories || !d.data.settings) return false;
  if (!Array.isArray(d.data.tasks) || !Array.isArray(d.data.categories) || !Array.isArray(d.data.settings)) return false;
  
  // タスクの検証
  for (const task of d.data.tasks) {
    if (!task.title || typeof task.title !== 'string') return false;
    if (!task.status || !['pending', 'done', 'archived'].includes(task.status)) return false;
    if (!task.createdAt || typeof task.createdAt !== 'number') return false;
    if (!task.updatedAt || typeof task.updatedAt !== 'number') return false;
  }
  
  // カテゴリーの検証
  for (const category of d.data.categories) {
    if (!category.name || typeof category.name !== 'string') return false;
    if (!category.color || typeof category.color !== 'string') return false;
    if (typeof category.order !== 'number') return false;
  }
  
  // 設定の検証
  for (const setting of d.data.settings) {
    if (!setting.key || typeof setting.key !== 'string') return false;
  }
  
  return true;
}

/**
 * データのインポート
 * @param importMode - 'replace': 既存データを置き換え, 'merge': 既存データとマージ
 */
export async function importData(data: ExportData, importMode: 'replace' | 'merge' = 'replace') {
  if (!validateImportData(data)) {
    throw new Error('無効なインポートデータです');
  }
  
  await db.transaction('rw', db.tasks, db.categories, db.settings, async () => {
    if (importMode === 'replace') {
      // 既存データを削除
      await db.tasks.clear();
      await db.categories.clear();
      await db.settings.clear();
    }
    
    // 新しいIDマッピング（重複を避けるため）
    const idMapping = new Map<string, string>();
    
    // カテゴリーをインポート
    for (const category of data.data.categories) {
      const newId = crypto.randomUUID();
      if (category.id) {
        idMapping.set(category.id, newId);
      }
      
      await db.categories.add({
        ...category,
        id: newId,
      });
    }
    
    // タスクをインポート
    for (const task of data.data.tasks) {
      const newId = crypto.randomUUID();
      
      // カテゴリーIDをマッピング
      const categoryId = task.categoryId && idMapping.get(task.categoryId);
      
      await db.tasks.add({
        ...task,
        id: newId,
        categoryId: categoryId || task.categoryId,
      });
    }
    
    // 設定をインポート
    for (const setting of data.data.settings) {
      if (importMode === 'merge') {
        // マージモードでは既存の設定は上書きしない
        const existing = await db.settings.get(setting.key);
        if (!existing) {
          await db.settings.add(setting);
        }
      } else {
        await db.settings.put(setting);
      }
    }
  });
}