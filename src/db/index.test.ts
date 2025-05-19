import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, initializeDB } from './index';
import type { Task, Category } from './index';

describe('TodoDB', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.tasks.clear();
    await db.categories.clear();
    await db.settings.clear();
  });

  describe('Database Initialization', () => {
    it('should initialize database successfully', async () => {
      await expect(initializeDB()).resolves.toBeUndefined();
    });
  });

  describe('Tasks', () => {
    it('should create a task', async () => {
      const now = Date.now();
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        title: 'Test Task',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      await db.tasks.add(task);

      const savedTask = await db.tasks.get(id);
      expect(savedTask).toMatchObject(task);
    });

    it('should handle archived status', async () => {
      const now = Date.now();
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        title: 'Archived Task',
        status: 'archived',
        createdAt: now,
        updatedAt: now,
      };

      await db.tasks.add(task);

      const savedTask = await db.tasks.get(id);
      expect(savedTask?.status).toBe('archived');
      
      // Query archived tasks
      const archivedTasks = await db.tasks.where('status').equals('archived').toArray();
      expect(archivedTasks).toHaveLength(1);
      expect(archivedTasks[0].title).toBe('Archived Task');
    });

    it('should query tasks by status', async () => {
      const now = Date.now();
      await db.tasks.bulkAdd([
        { id: crypto.randomUUID(), title: 'Task 1', status: 'pending', createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'Task 2', status: 'done', createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'Task 3', status: 'pending', createdAt: now, updatedAt: now },
      ]);

      const pendingTasks = await db.tasks.where('status').equals('pending').toArray();
      expect(pendingTasks).toHaveLength(2);
    });

    it('should query tasks by dueAt', async () => {
      const now = Date.now();
      const tomorrow = now + 24 * 60 * 60 * 1000;

      await db.tasks.bulkAdd([
        { id: crypto.randomUUID(), title: 'Today Task', status: 'pending', dueAt: now, createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'Tomorrow Task', status: 'pending', dueAt: tomorrow, createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'No Due Task', status: 'pending', createdAt: now, updatedAt: now },
      ]);

      const todayTasks = await db.tasks
        .where('dueAt')
        .between(now - 1000, now + 1000)
        .toArray();
      expect(todayTasks).toHaveLength(1);
      expect(todayTasks[0].title).toBe('Today Task');
    });

    it('should use compound index for status and dueAt', async () => {
      const now = Date.now();
      const tomorrow = now + 24 * 60 * 60 * 1000;

      await db.tasks.bulkAdd([
        { id: crypto.randomUUID(), title: 'Pending Today', status: 'pending', dueAt: now, createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'Done Today', status: 'done', dueAt: now, createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'Pending Tomorrow', status: 'pending', dueAt: tomorrow, createdAt: now, updatedAt: now },
      ]);

      // Use compound index to query pending tasks due today
      const pendingToday = await db.tasks
        .where('[status+dueAt]')
        .between(['pending', now - 1000], ['pending', now + 1000])
        .toArray();
      
      expect(pendingToday).toHaveLength(1);
      expect(pendingToday[0].title).toBe('Pending Today');
    });

    it('should use compound index for categoryId and status', async () => {
      const now = Date.now();
      const categoryId = crypto.randomUUID();

      await db.tasks.bulkAdd([
        { id: crypto.randomUUID(), title: 'Work Pending', status: 'pending', categoryId, createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'Work Done', status: 'done', categoryId, createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), title: 'Personal Pending', status: 'pending', categoryId: crypto.randomUUID(), createdAt: now, updatedAt: now },
      ]);

      // Use compound index to query pending tasks in specific category
      const categoryPending = await db.tasks
        .where('[categoryId+status]')
        .equals([categoryId, 'pending'])
        .toArray();
      
      expect(categoryPending).toHaveLength(1);
      expect(categoryPending[0].title).toBe('Work Pending');
    });
  });

  describe('Categories', () => {
    it('should create a category', async () => {
      const id = crypto.randomUUID();
      const category: Category = {
        id,
        name: 'Work',
        color: '#6366F1',
        order: 1,
      };

      await db.categories.add(category);

      const savedCategory = await db.categories.get(id);
      expect(savedCategory).toMatchObject(category);
    });

    it('should query categories by order', async () => {
      await db.categories.bulkAdd([
        { id: crypto.randomUUID(), name: 'Work', color: '#6366F1', order: 1 },
        { id: crypto.randomUUID(), name: 'Personal', color: '#F97316', order: 2 },
        { id: crypto.randomUUID(), name: 'Home', color: '#10B981', order: 3 },
      ]);

      const sortedCategories = await db.categories.orderBy('order').toArray();
      expect(sortedCategories).toHaveLength(3);
      expect(sortedCategories[0].name).toBe('Work');
      expect(sortedCategories[2].name).toBe('Home');
    });
  });

  describe('Settings', () => {
    it('should save and retrieve settings', async () => {
      await db.settings.put({ key: 'theme', value: 'dark' });
      await db.settings.put({ key: 'notifyBeforeMin', value: 15 });

      const theme = await db.settings.get('theme');
      expect(theme?.value).toBe('dark');

      const notifyTime = await db.settings.get('notifyBeforeMin');
      expect(notifyTime?.value).toBe(15);
    });
  });
});
