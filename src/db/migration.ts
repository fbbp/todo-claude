import { db, TodoDB } from './index';
import type { Task, Category, Setting } from './index';

// マイグレーション情報を保存するための型
interface MigrationInfo {
  version: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * データベースバージョンの取得
 * @returns 現在のデータベースバージョン
 */
export async function getCurrentDbVersion(): Promise<number> {
  try {
    return db.verno;
  } catch (error) {
    console.error('Failed to get database version:', error);
    return 0;
  }
}

/**
 * マイグレーション情報の保存
 * @param version マイグレーションバージョン
 * @param success 成功したかどうか
 * @param error エラーメッセージ (失敗時)
 */
export async function recordMigration(
  version: number,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const migrationInfo: MigrationInfo = {
      version,
      timestamp: Date.now(),
      success,
      error
    };
    
    // マイグレーション履歴はsettingsテーブルに保存
    const key = `migration:${version}`;
    await db.settings.put({ key, value: migrationInfo });
  } catch (err) {
    console.error('Failed to record migration history:', err);
  }
}

/**
 * マイグレーション履歴の取得
 * @returns マイグレーション履歴の配列
 */
export async function getMigrationHistory(): Promise<MigrationInfo[]> {
  try {
    const migrationRecords = await db.settings
      .where('key')
      .startsWith('migration:')
      .toArray();
    
    // レコードを変換して返す
    return migrationRecords
      .map(record => record.value as MigrationInfo)
      .sort((a, b) => a.version - b.version);
  } catch (error) {
    console.error('Failed to get migration history:', error);
    return [];
  }
}

/**
 * 特定のバージョンへのマイグレーション処理
 * @param targetVersion ターゲットバージョン
 * @param db データベースインスタンス
 */
async function migrateToVersion(
  targetVersion: number,
  db: TodoDB
): Promise<void> {
  const currentVersion = db.verno;
  
  if (targetVersion < currentVersion) {
    throw new Error(
      `Cannot downgrade database from version ${currentVersion} to ${targetVersion}`
    );
  }
  
  if (targetVersion === currentVersion) {
    console.log(`Database is already at version ${currentVersion}`);
    return;
  }
  
  console.log(`Migrating database from version ${currentVersion} to ${targetVersion}...`);
  
  try {
    // バージョンごとのマイグレーション処理
    switch (targetVersion) {
      case 2:
        await migrateToV2(db);
        break;
      case 3:
        await migrateToV3(db);
        break;
      case 4:
        await migrateToV4(db);
        break;
      default:
        throw new Error(`Migration to version ${targetVersion} is not supported`);
    }
    
    // マイグレーション成功を記録
    await recordMigration(targetVersion, true);
    console.log(`Successfully migrated to version ${targetVersion}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await recordMigration(targetVersion, false, errorMessage);
    console.error(`Failed to migrate to version ${targetVersion}:`, error);
    throw error;
  }
}

/**
 * バージョン2へのマイグレーション実装
 */
async function migrateToV2(db: TodoDB): Promise<void> {
  // アーカイブ機能の追加: ステータスが'archived'に設定できるようになる
  
  // 既存のタスクにカスタムインデックスを追加
  await db.tasks.toCollection().modify(_task => {
    // アップグレードに必要な変更はなし
    // インデックスは自動的に生成される
  });
}

/**
 * バージョン3へのマイグレーション実装
 */
async function migrateToV3(db: TodoDB): Promise<void> {
  // 繰り返しタスク機能の追加
  await db.tasks.toCollection().modify(_task => {
    // 既存のタスクには繰り返し機能がないため、フィールドを追加するだけ
    if (!('repeatRule' in _task)) {
      _task.repeatRule = undefined;
    }
    if (!('repeatParentId' in _task)) {
      _task.repeatParentId = undefined;
    }
    if (!('repeatCount' in _task)) {
      _task.repeatCount = undefined;
    }
    if (!('repeatUntil' in _task)) {
      _task.repeatUntil = undefined;
    }
  });
}

/**
 * バージョン4へのマイグレーション実装
 */
async function migrateToV4(db: TodoDB): Promise<void> {
  // インデックス最適化
  
  // 既存のチェックリスト項目にインデックスを追加
  const tasksWithChecklist = await db.tasks
    .filter(task => !!task.checklist && task.checklist.length > 0)
    .toArray();
  
  console.log(`Updating ${tasksWithChecklist.length} tasks with checklist...`);
  
  // 各タスクを更新してチェックリストのインデックスを有効にする
  for (const task of tasksWithChecklist) {
    await db.tasks.update(task.id!, { checklist: task.checklist });
  }
}

/**
 * データベースのマイグレーション実行
 * 現在のバージョンからターゲットバージョンまで順次マイグレーション
 * @param targetVersion ターゲットバージョン (省略すると最新バージョン)
 */
export async function migrateDatabase(
  targetVersion?: number
): Promise<boolean> {
  // ターゲットバージョンが指定されていない場合は最新バージョンを使用
  const latestVersion = 4; // 現在の最新バージョン
  const target = targetVersion || latestVersion;
  
  try {
    // データベースが開いていることを確認
    if (!db.isOpen()) {
      await db.open();
    }
    
    const currentVersion = db.verno;
    console.log(`Current database version: ${currentVersion}`);
    
    // 下位バージョンへの移行はできない
    if (target < currentVersion) {
      console.error(`Cannot downgrade database from version ${currentVersion} to ${target}`);
      return false;
    }
    
    // 現在のバージョンから順にマイグレーション
    for (let version = currentVersion + 1; version <= target; version++) {
      await migrateToVersion(version, db);
    }
    
    return true;
  } catch (error) {
    console.error('Database migration failed:', error);
    return false;
  }
}

/**
 * データベースバックアップの取得
 * @returns バックアップデータ
 */
export async function backupDatabase(): Promise<{
  tasks: Task[];
  categories: Category[];
  settings: Setting[];
  version: number;
  timestamp: number;
}> {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
    
    const tasks = await db.tasks.toArray();
    const categories = await db.categories.toArray();
    const settings = await db.settings.toArray();
    
    return {
      tasks,
      categories,
      settings,
      version: db.verno,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Failed to backup database:', error);
    throw error;
  }
}

/**
 * データベースの復元
 * @param backup バックアップデータ
 */
export async function restoreDatabase(backup: {
  tasks: Task[];
  categories: Category[];
  settings: Setting[];
  version: number;
}): Promise<boolean> {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
    
    // トランザクションでデータを復元
    await db.transaction('rw', [db.tasks, db.categories, db.settings], async () => {
      // 既存のデータをクリア
      await db.tasks.clear();
      await db.categories.clear();
      await db.settings.clear();
      
      // データを復元
      if (backup.categories && backup.categories.length > 0) {
        await db.categories.bulkAdd(backup.categories);
      }
      
      if (backup.tasks && backup.tasks.length > 0) {
        await db.tasks.bulkAdd(backup.tasks);
      }
      
      if (backup.settings && backup.settings.length > 0) {
        await db.settings.bulkAdd(backup.settings);
      }
    });
    
    // 復元後、必要に応じてマイグレーション
    const currentVersion = db.verno;
    if (backup.version > currentVersion) {
      console.log(`Backup version (${backup.version}) is newer than current database version (${currentVersion}). Migrating...`);
      await migrateDatabase(backup.version);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to restore database:', error);
    return false;
  }
}

/**
 * データベースのヘルスチェック実行
 * @returns ヘルスチェック結果
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  version: number;
  tasksCount: number;
  categoriesCount: number;
  settingsCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let version = 0;
  let tasksCount = 0;
  let categoriesCount = 0;
  let settingsCount = 0;
  
  try {
    if (!db.isOpen()) {
      await db.open();
    }
    
    version = db.verno;
    
    // 各テーブルのレコード数を取得
    try {
      tasksCount = await db.tasks.count();
    } catch (error) {
      errors.push(`Tasks table error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      categoriesCount = await db.categories.count();
    } catch (error) {
      errors.push(`Categories table error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    try {
      settingsCount = await db.settings.count();
    } catch (error) {
      errors.push(`Settings table error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 基本的な整合性チェック
    if (categoriesCount === 0) {
      // デフォルトカテゴリがない場合は警告
      errors.push('No categories found. Default category may be missing.');
    }
    
    // インデックスの健全性チェック
    try {
      // テスト用のシンプルなクエリを実行
      await db.tasks.where('status').equals('pending').count();
      await db.categories.orderBy('order').first();
    } catch (error) {
      errors.push(`Index integrity error: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    errors.push(`General database error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return {
    healthy: errors.length === 0,
    version,
    tasksCount,
    categoriesCount,
    settingsCount,
    errors
  };
}