import { db } from './index';
import type { Table } from 'dexie';

/**
 * 読み取り/書き込みトランザクションを実行する
 * @param tables 操作するテーブルの配列
 * @param callback トランザクション内で実行するコールバック関数
 * @returns コールバック関数の戻り値
 */
export async function executeTransaction<T>(
  tables: Table<any>[],
  callback: () => Promise<T>
): Promise<T> {
  try {
    let result: T;
    await db.transaction('rw', tables, async () => {
      result = await callback();
    });
    return result!;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * 読み取り専用トランザクションを実行する
 * @param tables 操作するテーブルの配列
 * @param callback トランザクション内で実行するコールバック関数
 * @returns コールバック関数の戻り値
 */
export async function executeReadOnlyTransaction<T>(
  tables: Table<any>[],
  callback: () => Promise<T>
): Promise<T> {
  try {
    let result: T;
    await db.transaction('r', tables, async () => {
      result = await callback();
    });
    return result!;
  } catch (error) {
    console.error('Read-only transaction failed:', error);
    throw error;
  }
}

/**
 * 全テーブルに対するトランザクションを実行する
 * @param mode トランザクションモード ('rw' または 'r')
 * @param callback トランザクション内で実行するコールバック関数
 * @returns コールバック関数の戻り値
 */
export async function executeFullTransaction<T>(
  mode: 'rw' | 'r',
  callback: () => Promise<T>
): Promise<T> {
  const tables = [db.tasks, db.categories, db.settings];
  try {
    let result: T;
    await db.transaction(mode, tables, async () => {
      result = await callback();
    });
    return result!;
  } catch (error) {
    console.error(`Full database transaction (${mode}) failed:`, error);
    throw error;
  }
}

/**
 * バルク操作をトランザクション内で実行する
 * @param operations 実行する操作の配列
 * @returns 全操作の結果の配列
 */
export async function executeBulkOperations<T>(
  operations: Array<() => Promise<T>>
): Promise<T[]> {
  return executeFullTransaction('rw', async () => {
    const results: T[] = [];
    for (const operation of operations) {
      results.push(await operation());
    }
    return results;
  });
}

/**
 * 複数のタスクを一度に更新するバッチ操作
 * @param taskIds 更新するタスクIDの配列
 * @param updates 適用する更新内容
 * @returns 更新されたタスク数
 */
export async function batchUpdateTasks(
  taskIds: string[],
  updates: Partial<Omit<any, 'id' | 'createdAt'>>
): Promise<number> {
  if (taskIds.length === 0) return 0;
  
  return executeTransaction([db.tasks], async () => {
    let updatedCount = 0;
    
    // トランザクション内で各タスクを更新
    for (const id of taskIds) {
      try {
        // タスクが存在するかチェック
        const exists = await db.tasks.get(id);
        if (exists) {
          await db.tasks.update(id, { ...updates, updatedAt: Date.now() });
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to update task ${id}:`, error);
        // トランザクション内のエラーは自動的にロールバックされる
        throw error;
      }
    }
    
    return updatedCount;
  });
}

/**
 * 複数のタスクを一度に削除するバッチ操作
 * @param taskIds 削除するタスクIDの配列
 * @returns 削除されたタスク数
 */
export async function batchDeleteTasks(taskIds: string[]): Promise<number> {
  if (taskIds.length === 0) return 0;
  
  return executeTransaction([db.tasks], async () => {
    // タスクの存在確認
    const existingTasks = await db.tasks
      .where('id')
      .anyOf(taskIds)
      .toArray();
    
    const existingIds = existingTasks.map(task => task.id!);
    
    // 存在するタスクのみを削除
    await db.tasks.bulkDelete(existingIds);
    
    return existingIds.length;
  });
}

/**
 * データベース操作で冪等性（べきとうせい）を確保するためのロックを取得する
 * 同じIDに対する操作が同時に実行されることを防ぐ
 * @param lockId ロックの一意のID
 * @param callback ロック取得後に実行するコールバック関数
 * @returns コールバック関数の戻り値
 */
export async function withOperationLock<T>(
  lockId: string,
  callback: () => Promise<T>
): Promise<T> {
  const lockKey = `lock:${lockId}`;
  
  try {
    // ロックを取得
    const acquireLock = async (): Promise<boolean> => {
      try {
        await db.settings.add({ key: lockKey, value: Date.now() });
        return true;
      } catch (error) {
        // ロックが既に存在する場合
        return false;
      }
    };
    
    // 最大10回ロック取得を試みる
    let locked = false;
    for (let i = 0; i < 10; i++) {
      locked = await acquireLock();
      if (locked) break;
      
      // ロックが取れなかった場合は少し待ってリトライ
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 1秒以上経過したロックは強制解放
      const lock = await db.settings.get(lockKey);
      if (lock && (Date.now() - (lock.value as number)) > 1000) {
        await db.settings.delete(lockKey);
      }
    }
    
    if (!locked) {
      throw new Error(`Failed to acquire operation lock: ${lockId}`);
    }
    
    // ロックを取得できたらコールバックを実行
    return await callback();
  } finally {
    // 処理完了後に必ずロックを解放
    try {
      await db.settings.delete(lockKey);
    } catch (error) {
      console.error(`Failed to release operation lock ${lockId}:`, error);
    }
  }
}

/**
 * データエクスポート用のトランザクション
 * すべてのデータを一貫性のある状態で取得する
 */
export async function exportAllData(): Promise<{
  tasks: any[];
  categories: any[];
  settings: any[];
}> {
  return executeReadOnlyTransaction([db.tasks, db.categories, db.settings], async () => {
    const tasks = await db.tasks.toArray();
    const categories = await db.categories.toArray();
    const settings = await db.settings.toArray();
    
    return { tasks, categories, settings };
  });
}

/**
 * データインポート用のトランザクション
 * すべてのデータを一貫性を保ちながらインポートする
 */
export async function importAllData(data: {
  tasks?: any[];
  categories?: any[];
  settings?: any[];
}): Promise<boolean> {
  return executeFullTransaction('rw', async () => {
    // まず既存のデータをクリア
    await db.tasks.clear();
    await db.categories.clear();
    await db.settings.clear();
    
    // データを順番にインポート
    if (data.categories && data.categories.length > 0) {
      await db.categories.bulkAdd(data.categories);
    }
    
    if (data.tasks && data.tasks.length > 0) {
      await db.tasks.bulkAdd(data.tasks);
    }
    
    if (data.settings && data.settings.length > 0) {
      await db.settings.bulkAdd(data.settings);
    }
    
    return true;
  });
}