import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, initializeDB } from './index';
import type { Task, Category } from './index';
import * as operations from './operations';
import * as transaction from './transaction';

describe('Transaction Operations', () => {
  beforeEach(async () => {
    await db.open();
    await db.tasks.clear();
    await db.categories.clear();
    await db.settings.clear();
  });

  afterEach(async () => {
    await db.tasks.clear();
    await db.categories.clear();
    await db.settings.clear();
  });

  it('should execute a read-write transaction', async () => {
    // トランザクションで複数の操作を実行
    const result = await transaction.executeTransaction([db.tasks], async () => {
      // 複数のタスクを追加
      const id1 = await operations.createTask({
        title: 'Task 1',
        status: 'pending' as const,
      });
      
      const id2 = await operations.createTask({
        title: 'Task 2',
        status: 'pending' as const,
      });
      
      // 結果を返す
      return { id1, id2 };
    });
    
    // トランザクションが成功したことを確認
    expect(result.id1).toBeDefined();
    expect(result.id2).toBeDefined();
    
    // データが正しく保存されたことを確認
    const tasks = await db.tasks.toArray();
    expect(tasks.length).toBe(2);
  });
  
  it('should roll back transaction on error', async () => {
    // 初期状態で1つのタスクを作成
    await operations.createTask({
      title: 'Initial Task',
      status: 'pending' as const,
    });
    
    // エラーを発生させるトランザクション
    await expect(
      transaction.executeTransaction([db.tasks], async () => {
        // 正常に追加されるタスク
        await operations.createTask({
          title: 'Task in Transaction',
          status: 'pending' as const,
        });
        
        // エラーを発生させる
        throw new Error('Intentional error to cause rollback');
      })
    ).rejects.toThrow('Intentional error');
    
    // ロールバックされたことを確認（最初の1つだけ残る）
    const tasks = await db.tasks.toArray();
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Initial Task');
  });
  
  it('should batch update tasks', async () => {
    // 複数のタスクを作成
    const ids: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      const id = await operations.createTask({
        title: `Task ${i + 1}`,
        status: 'pending' as const,
      });
      ids.push(id);
    }
    
    // バッチ更新を実行
    const updateCount = await transaction.batchUpdateTasks(
      ids,
      { status: 'done' as const }
    );
    
    expect(updateCount).toBe(5);
    
    // すべてのタスクが更新されたことを確認
    const updatedTasks = await operations.getAllTasks();
    expect(updatedTasks.every(task => task.status === 'done')).toBe(true);
  });
  
  it('should batch delete tasks', async () => {
    // 複数のタスクを作成
    const ids: string[] = [];
    
    for (let i = 0; i < 5; i++) {
      const id = await operations.createTask({
        title: `Task ${i + 1}`,
        status: 'pending' as const,
      });
      ids.push(id);
    }
    
    // 追加のタスク（削除対象外）
    await operations.createTask({
      title: 'Task Not Deleted',
      status: 'pending' as const,
    });
    
    // バッチ削除を実行
    const deleteCount = await transaction.batchDeleteTasks(ids);
    
    expect(deleteCount).toBe(5);
    
    // 指定したタスクだけが削除されたことを確認
    const remainingTasks = await operations.getAllTasks();
    expect(remainingTasks.length).toBe(1);
    expect(remainingTasks[0].title).toBe('Task Not Deleted');
  });
  
  it('should acquire and release operation lock', async () => {
    let lockAcquired = false;
    
    await transaction.withOperationLock('test-lock', async () => {
      lockAcquired = true;
      
      // ロックが取得されている間、同じロックの別取得は失敗するはず
      const nestedLockPromise = transaction.withOperationLock('test-lock', async () => {
        return 'This should not execute';
      });
      
      // タイムアウトを設定
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Lock timeout')), 200);
      });
      
      // ネストされたロック取得がタイムアウトするか、エラーになることを確認
      await expect(Promise.race([nestedLockPromise, timeoutPromise]))
        .rejects.toThrow();
      
      return 'Lock test complete';
    });
    
    expect(lockAcquired).toBe(true);
    
    // ロック解放後は再取得できるはず
    const result = await transaction.withOperationLock('test-lock', async () => {
      return 'Lock acquired after release';
    });
    
    expect(result).toBe('Lock acquired after release');
  });
  
  it('should export and import all data', async () => {
    // テストデータの作成
    const categoryId = await operations.createCategory({
      name: 'Test Category',
      color: '#ff0000',
    });
    
    await operations.createTask({
      title: 'Task 1',
      status: 'pending' as const,
      categoryId,
    });
    
    await operations.createTask({
      title: 'Task 2',
      status: 'done' as const,
      categoryId,
    });
    
    await operations.setSetting('theme', 'dark');
    
    // データエクスポート
    const exportedData = await transaction.exportAllData();
    
    // データをクリア
    await db.tasks.clear();
    await db.categories.clear();
    await db.settings.clear();
    
    // データが空になったことを確認
    expect(await db.tasks.count()).toBe(0);
    expect(await db.categories.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    
    // データインポート
    await transaction.importAllData(exportedData);
    
    // データが正しくインポートされたことを確認
    const tasks = await operations.getAllTasks();
    const categories = await operations.getAllCategories();
    const theme = await operations.getSetting<string>('theme');
    
    expect(tasks.length).toBe(2);
    expect(categories.length).toBe(1);
    expect(categories[0].name).toBe('Test Category');
    expect(theme).toBe('dark');
  });
  
  it('should execute bulk operations in a transaction', async () => {
    // 複数の操作を一括実行
    const results = await transaction.executeBulkOperations([
      () => operations.createCategory({
        name: 'Category 1',
        color: '#ff0000',
      }),
      () => operations.createCategory({
        name: 'Category 2',
        color: '#00ff00',
      }),
      () => operations.createTask({
        title: 'Task 1',
        status: 'pending' as const,
      }),
    ]);
    
    expect(results.length).toBe(3);
    
    // データが正しく保存されたことを確認
    const categories = await operations.getAllCategories();
    const tasks = await operations.getAllTasks();
    
    expect(categories.length).toBe(2);
    expect(tasks.length).toBe(1);
  });
});