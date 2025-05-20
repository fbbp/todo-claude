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
      const result = await initializeDB();
      expect(result).toHaveProperty('success', true);
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
    
    it('should update a task', async () => {
      // まず新しいタスクを作成
      const now = Date.now();
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        title: 'Original Title',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      
      await db.tasks.add(task);
      
      // タスクを更新
      const updateTime = now + 1000;
      await db.tasks.update(id, {
        title: 'Updated Title',
        status: 'done',
        updatedAt: updateTime
      });
      
      // 更新されたタスクを取得して検証
      const updatedTask = await db.tasks.get(id);
      expect(updatedTask).not.toBeUndefined();
      expect(updatedTask?.title).toBe('Updated Title');
      expect(updatedTask?.status).toBe('done');
      expect(updatedTask?.updatedAt).toBe(updateTime);
      expect(updatedTask?.createdAt).toBe(now); // 作成時間は変わらない
    });
    
    it('should delete a task', async () => {
      // タスクを作成
      const now = Date.now();
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        title: 'Task to Delete',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      
      await db.tasks.add(task);
      
      // 作成されたことを確認
      let savedTask = await db.tasks.get(id);
      expect(savedTask).not.toBeUndefined();
      
      // タスクを削除
      await db.tasks.delete(id);
      
      // 削除されたことを確認
      savedTask = await db.tasks.get(id);
      expect(savedTask).toBeUndefined();
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
    
    it('should update existing settings', async () => {
      // 設定を保存
      await db.settings.put({ key: 'theme', value: 'light' });
      
      // 同じキーで別の値を保存（更新）
      await db.settings.put({ key: 'theme', value: 'dark' });
      
      // 更新された値が取得できることを確認
      const theme = await db.settings.get('theme');
      expect(theme?.value).toBe('dark');
    });
    
    it('should delete settings', async () => {
      // 設定を保存
      await db.settings.put({ key: 'tempSetting', value: 'temporary' });
      
      // 存在することを確認
      let setting = await db.settings.get('tempSetting');
      expect(setting?.value).toBe('temporary');
      
      // 設定を削除
      await db.settings.delete('tempSetting');
      
      // 削除されたことを確認
      setting = await db.settings.get('tempSetting');
      expect(setting).toBeUndefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid table access gracefully', async () => {
      // @ts-expect-error - 意図的に型エラーを無視してテスト
      const invalidTable = db.nonExistentTable;
      expect(invalidTable).toBeUndefined();
    });
    
    it('should throw error when accessing closed database', async () => {
      await db.close();
      
      // 閉じたDBへのアクセスでエラーが発生することを確認
      await expect(db.tasks.toArray()).rejects.toThrow();
      
      // テスト後はDBを再オープン
      await db.open();
    });
    
    it('should handle duplicate key errors', async () => {
      const now = Date.now();
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        title: 'Duplicate Task',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      
      // 最初のタスク追加は成功するはず
      await db.tasks.add(task);
      
      // 同じIDで再度追加するとエラーになるはず
      await expect(db.tasks.add(task)).rejects.toThrow();
    });
  });
  
  describe('Task Recurrence', () => {
    it('should support recurrence rule field', async () => {
      const now = Date.now();
      const id = crypto.randomUUID();
      const task: Task = {
        id,
        title: 'Recurring Task',
        status: 'pending',
        repeatRule: 'FREQ=DAILY;INTERVAL=1',
        repeatCount: 0,
        repeatUntil: now + 7 * 24 * 60 * 60 * 1000, // 1週間後
        createdAt: now,
        updatedAt: now,
      };
      
      await db.tasks.add(task);
      
      const savedTask = await db.tasks.get(id);
      expect(savedTask?.repeatRule).toBe('FREQ=DAILY;INTERVAL=1');
    });
    
    it('should query tasks by parentId', async () => {
      const now = Date.now();
      const parentId = crypto.randomUUID();
      
      // 親タスク
      await db.tasks.add({
        id: parentId,
        title: 'Parent Task',
        status: 'pending',
        repeatRule: 'FREQ=DAILY;INTERVAL=1',
        createdAt: now,
        updatedAt: now,
      });
      
      // 子タスク（繰り返し）
      await db.tasks.bulkAdd([
        {
          id: crypto.randomUUID(),
          title: 'Child Task 1',
          status: 'pending',
          repeatParentId: parentId,
          repeatCount: 1,
          createdAt: now + 1000,
          updatedAt: now + 1000,
        },
        {
          id: crypto.randomUUID(),
          title: 'Child Task 2',
          status: 'pending',
          repeatParentId: parentId,
          repeatCount: 2,
          createdAt: now + 2000,
          updatedAt: now + 2000,
        }
      ]);
      
      // 親IDで検索
      const childTasks = await db.tasks
        .where('repeatParentId')
        .equals(parentId)
        .toArray();
      
      expect(childTasks).toHaveLength(2);
      
      // repeatCountでソートして比較
      const sortedTasks = [...childTasks].sort((a, b) => 
        (a.repeatCount || 0) - (b.repeatCount || 0)
      );
      
      expect(sortedTasks[0].repeatCount).toBe(1);
      expect(sortedTasks[1].repeatCount).toBe(2);
    });
  });
});
