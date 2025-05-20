import { db, type Task, type Category, type Setting } from './index';

// --------- Task操作関数 ---------

/**
 * タスクを取得する
 * @param id タスクID
 * @returns タスクオブジェクトまたはundefined
 */
export async function getTask(id: string): Promise<Task | undefined> {
  return db.tasks.get(id);
}

/**
 * すべてのタスクを取得する
 * @returns タスクの配列
 */
export async function getAllTasks(): Promise<Task[]> {
  return db.tasks.toArray();
}

/**
 * ステータスでタスクをフィルタリングする
 * @param status タスクのステータス
 * @returns 指定したステータスのタスク配列
 */
export async function getTasksByStatus(
  status: Task['status']
): Promise<Task[]> {
  return db.tasks.where('status').equals(status).toArray();
}

/**
 * 現在日時以降に期限があるタスクをフィルタリングする
 * @param status オプションのステータスフィルター
 * @param includeCurrent 現在時刻ちょうどのタスクも含めるか (デフォルトtrue)
 * @returns 期限が近いタスクの配列
 */
export async function getUpcomingTasks(
  status: Task['status'] = 'pending',
  includeCurrent: boolean = true
): Promise<Task[]> {
  const now = Date.now();
  
  // Dexieではnullやundefinedを含む複合キーは正しく動作しないことがあるため、
  // まず期限があるタスクのみを取得し、その後にメモリ上でフィルタリングする
  const tasksWithDueDate = await db.tasks
    .where('status')
    .equals(status)
    .and(task => !!task.dueAt)
    .toArray();
  
  // 現在時刻との比較方法を選択
  return includeCurrent
    ? tasksWithDueDate.filter(task => (task.dueAt || 0) >= now) // 現在時刻を含む
    : tasksWithDueDate.filter(task => (task.dueAt || 0) > now); // 現在時刻を含まない
}

/**
 * カテゴリでタスクをフィルタリングする
 * @param categoryId カテゴリID
 * @param status オプションのステータスフィルター
 * @returns 指定したカテゴリのタスク配列
 */
export async function getTasksByCategory(
  categoryId: string,
  status?: Task['status']
): Promise<Task[]> {
  if (status) {
    return db.tasks
      .where('[categoryId+status]')
      .equals([categoryId, status])
      .toArray();
  }
  return db.tasks.where('categoryId').equals(categoryId).toArray();
}

/**
 * 親タスクから派生したタスクを取得する
 * @param parentId 親タスクID
 * @returns 子タスクの配列
 */
export async function getChildTasks(parentId: string): Promise<Task[]> {
  return db.tasks.where('repeatParentId').equals(parentId).toArray();
}

/**
 * タスクを作成する
 * @param task タスクデータ (IDがない場合は自動生成)
 * @returns 作成されたタスクのID
 */
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  const now = Date.now();
  const id = task.id || crypto.randomUUID();
  
  const newTask: Task = {
    ...task,
    id,
    status: task.status || 'pending',
    createdAt: now,
    updatedAt: now
  };
  
  await db.tasks.add(newTask);
  return id;
}

/**
 * タスクを更新する
 * @param id タスクID
 * @param updates 更新するフィールド
 * @returns 更新が成功したかどうか
 */
export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id' | 'createdAt'>>
): Promise<boolean> {
  const task = await db.tasks.get(id);
  if (!task) return false;
  
  const updatedTask = {
    ...updates,
    updatedAt: Date.now()
  };
  
  await db.tasks.update(id, updatedTask);
  return true;
}

/**
 * タスクを削除する
 * @param id タスクID
 * @returns 削除が成功したかどうか
 */
export async function deleteTask(id: string): Promise<boolean> {
  const task = await db.tasks.get(id);
  if (!task) return false;
  
  await db.tasks.delete(id);
  return true;
}

/**
 * タスクをアーカイブする
 * @param id タスクID
 * @returns アーカイブが成功したかどうか
 */
export async function archiveTask(id: string): Promise<boolean> {
  return updateTask(id, { status: 'archived' });
}

// --------- Category操作関数 ---------

/**
 * カテゴリを取得する
 * @param id カテゴリID
 * @returns カテゴリオブジェクトまたはundefined
 */
export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id);
}

/**
 * すべてのカテゴリを順序付きで取得する
 * @returns カテゴリの配列
 */
export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy('order').toArray();
}

/**
 * カテゴリを作成する
 * @param category カテゴリデータ (IDがない場合は自動生成)
 * @returns 作成されたカテゴリのID
 */
export async function createCategory(
  category: Omit<Category, 'id'> & { id?: string }
): Promise<string> {
  const id = category.id || crypto.randomUUID();
  
  // 同じ名前のカテゴリがないか確認
  const existingCategory = await db.categories
    .where('name')
    .equals(category.name)
    .first();
    
  if (existingCategory) {
    throw new Error(`Category with name "${category.name}" already exists`);
  }
  
  // 最大の順序を取得
  let maxOrder = 0;
  const categories = await db.categories.toArray();
  if (categories.length > 0) {
    maxOrder = Math.max(...categories.map(c => c.order));
  }
  
  const newCategory: Category = {
    ...category,
    id,
    order: category.order !== undefined ? category.order : maxOrder + 1
  };
  
  await db.categories.add(newCategory);
  return id;
}

/**
 * カテゴリを更新する
 * @param id カテゴリID
 * @param updates 更新するフィールド
 * @returns 更新が成功したかどうか
 */
export async function updateCategory(
  id: string,
  updates: Partial<Omit<Category, 'id'>>
): Promise<boolean> {
  const category = await db.categories.get(id);
  if (!category) return false;
  
  // 名前を変更する場合、重複チェック
  if (updates.name && updates.name !== category.name) {
    const existingCategory = await db.categories
      .where('name')
      .equals(updates.name)
      .first();
      
    if (existingCategory) {
      throw new Error(`Category with name "${updates.name}" already exists`);
    }
  }
  
  await db.categories.update(id, updates);
  return true;
}

/**
 * カテゴリを削除する
 * @param id カテゴリID
 * @param reassignTasksTo 関連タスクの再割り当て先カテゴリID
 * @returns 削除が成功したかどうか
 */
export async function deleteCategory(
  id: string,
  reassignTasksTo?: string
): Promise<boolean> {
  // デフォルトカテゴリは削除不可
  const category = await db.categories.get(id);
  if (!category || category.name === 'Default') {
    return false;
  }
  
  // トランザクションを使用
  try {
    await db.transaction('rw', [db.categories, db.tasks], async () => {
      // カテゴリに関連するタスクを更新
      if (reassignTasksTo) {
        // 再割り当て先カテゴリが存在するか確認
        const targetCategory = await db.categories.get(reassignTasksTo);
        if (!targetCategory) {
          throw new Error('Target category for reassignment does not exist');
        }
        
        // タスクを再割り当て
        await db.tasks
          .where('categoryId')
          .equals(id)
          .modify({ categoryId: reassignTasksTo });
      } else {
        // カテゴリを未分類に
        await db.tasks
          .where('categoryId')
          .equals(id)
          .modify({ categoryId: undefined });
      }
      
      // カテゴリ削除
      await db.categories.delete(id);
    });
    
    return true;
  } catch (error) {
    console.error('Failed to delete category:', error);
    return false;
  }
}

/**
 * カテゴリの順序を更新する
 * @param orderedIds カテゴリIDの新しい順序
 * @returns 更新が成功したかどうか
 */
export async function updateCategoryOrder(orderedIds: string[]): Promise<boolean> {
  try {
    await db.transaction('rw', db.categories, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.categories.update(orderedIds[i], { order: i });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Failed to update category order:', error);
    return false;
  }
}

// --------- Setting操作関数 ---------

/**
 * 設定を取得する
 * @param key 設定キー
 * @returns 設定値 (型指定可能)
 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const setting = await db.settings.get(key);
  return setting?.value as T | undefined;
}

/**
 * 設定を保存する
 * @param key 設定キー
 * @param value 設定値
 * @returns 保存が成功したかどうか
 */
export async function setSetting<T>(key: string, value: T): Promise<boolean> {
  try {
    await db.settings.put({ key, value });
    return true;
  } catch (error) {
    console.error(`Failed to save setting "${key}":`, error);
    return false;
  }
}

/**
 * 設定を削除する
 * @param key 設定キー
 * @returns 削除が成功したかどうか
 */
export async function deleteSetting(key: string): Promise<boolean> {
  try {
    await db.settings.delete(key);
    return true;
  } catch (error) {
    console.error(`Failed to delete setting "${key}":`, error);
    return false;
  }
}

/**
 * 複数の設定をバッチで保存する
 * @param settings 設定のキーと値のペア
 * @returns 保存が成功したかどうか
 */
export async function setSettingsBatch(
  settings: Record<string, unknown>
): Promise<boolean> {
  try {
    await db.transaction('rw', db.settings, async () => {
      for (const [key, value] of Object.entries(settings)) {
        await db.settings.put({ key, value });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Failed to save settings batch:', error);
    return false;
  }
}