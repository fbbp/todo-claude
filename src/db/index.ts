import Dexie, { type Table } from 'dexie';

export interface Task {
  id?: string;
  title: string;
  dueAt?: number;
  durationMin?: number;
  categoryId?: string;
  status: 'pending' | 'done' | 'archived';
  checklist?: Array<{
    id: string;
    text: string;
    checked: boolean;
  }>;
  repeatRule?: string;
  repeatParentId?: string; // 繰り返し元のタスクID
  repeatCount?: number; // 何回目の繰り返しか
  repeatUntil?: number; // 繰り返しの終了日時
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id?: string;
  name: string;
  color: string;
  order: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export class TodoDB extends Dexie {
  tasks!: Table<Task>;
  categories!: Table<Category>;
  settings!: Table<Setting>;

  constructor() {
    super('todo');
    
    // Version 1: Initial schema
    this.version(1).stores({
      tasks: 'id, status, dueAt, categoryId',
      categories: 'id, order',
      settings: 'key',
    });
    
    // Version 2: Enhanced indexes and archived status
    this.version(2).stores({
      tasks: 'id, status, dueAt, categoryId, [status+dueAt], [categoryId+status], createdAt',
      categories: 'id, order, name',
      settings: 'key',
    }).upgrade(async () => {
      // アーカイブ機能のためのデータ移行は不要（新しいステータスを追加しただけ）
      console.log('Upgraded database to version 2');
    });
    
    // Version 3: Task recurrence support
    this.version(3).stores({
      tasks: 'id, status, dueAt, categoryId, [status+dueAt], [categoryId+status], createdAt, repeatParentId',
      categories: 'id, order, name',
      settings: 'key',
    }).upgrade(async () => {
      // 繰り返しタスク機能のためのデータ移行は不要（新しいフィールドを追加しただけ）
      console.log('Upgraded database to version 3');
    });
    
    // Version 4: Optimized indexes for performance
    this.version(4).stores({
      tasks: 'id, status, dueAt, categoryId, [status+dueAt], [categoryId+status], createdAt, repeatParentId, updatedAt, *checklist',
      categories: 'id, order, name, color',
      settings: 'key, value',
    }).upgrade(async () => {
      console.log('Upgraded database to version 4: Optimized indexes');
      // インデックス最適化のためのデータ移行は不要
    });
  }
  
}

export const db = new TodoDB();

// 操作関数のエクスポート
export * from './operations';

// トランザクション関数のエクスポート
export * from './transaction';

// マイグレーション関数のエクスポート
export * from './migration';

// データベースの初期化とエラーハンドリング
export async function initializeDB() {
  try {
    // すでに開いている場合は閉じてから再オープン
    if (db.isOpen()) {
      await db.close();
    }
    
    await db.open();
    
    // データベースの整合性チェック
    await checkDatabaseIntegrity();
    
    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // エラーを返すが処理は続行できるようにする
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// データベースの整合性チェック
async function checkDatabaseIntegrity() {
  // 各テーブルが存在するかチェック
  const taskCount = await db.tasks.count();
  const categoryCount = await db.categories.count();
  const settingCount = await db.settings.count();
  
  console.log(`Database integrity check: Tasks=${taskCount}, Categories=${categoryCount}, Settings=${settingCount}`);
  
  // デフォルトカテゴリが存在しない場合は作成
  const defaultCategory = await db.categories
    .where('name')
    .equals('Default')
    .first();
    
  if (!defaultCategory) {
    await db.categories.add({
      id: crypto.randomUUID(),
      name: 'Default',
      color: '#94a3b8', // slate-400
      order: 0
    });
    console.log('Default category created');
  }
  
  return true;
}

// データベースのリセット（開発/テスト用）
export async function resetDatabase() {
  if (db.isOpen()) {
    try {
      await db.delete();
      console.log('Database deleted successfully');
    } catch (error) {
      console.error('Failed to delete database:', error);
    }
  }
  
  // データベースを再初期化
  return initializeDB();
}
