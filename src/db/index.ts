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
  }
  
}

export const db = new TodoDB();

// データベースの初期化とエラーハンドリング
export async function initializeDB() {
  try {
    await db.open();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
