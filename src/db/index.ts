import Dexie, { type Table } from 'dexie';

export interface Task {
  id?: string;
  title: string;
  dueAt?: number;
  durationMin?: number;
  categoryId?: string;
  status: 'pending' | 'done';
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
    this.version(1).stores({
      tasks: 'id, status, dueAt, categoryId',
      categories: 'id, order',
      settings: 'key',
    });
  }
}

export const db = new TodoDB();
