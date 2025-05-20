import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, initializeDB } from './index';
import * as operations from './operations';
import * as migration from './migration';

describe('Database Migration', () => {
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

  it('should get current database version', async () => {
    const version = await migration.getCurrentDbVersion();
    
    // テスト実行時の最新バージョンであることを確認
    expect(version).toBeGreaterThan(0);
    expect(version).toBeLessThanOrEqual(4); // 最新バージョンを更新したら変更
  });

  it('should record migration history', async () => {
    // マイグレーション情報を記録
    await migration.recordMigration(2, true);
    await migration.recordMigration(3, false, 'Test error message');
    
    // 履歴を取得
    const history = await migration.getMigrationHistory();
    
    expect(history.length).toBe(2);
    expect(history[0].version).toBe(2);
    expect(history[0].success).toBe(true);
    expect(history[1].version).toBe(3);
    expect(history[1].success).toBe(false);
    expect(history[1].error).toBe('Test error message');
  });

  it('should backup and restore database', async () => {
    // テストデータ作成
    const categoryId = await operations.createCategory({
      name: 'Test Category',
      color: '#ff0000',
    });
    
    await operations.createTask({
      title: 'Test Task',
      status: 'pending' as const,
      categoryId,
    });
    
    await operations.setSetting('theme', 'dark');
    
    // バックアップを作成
    const backup = await migration.backupDatabase();
    
    // バックアップにデータが含まれていることを確認
    expect(backup.tasks.length).toBe(1);
    expect(backup.categories.length).toBe(1);
    expect(backup.settings.length).toBe(1);
    expect(backup.version).toBeGreaterThan(0);
    
    // データをクリア
    await db.tasks.clear();
    await db.categories.clear();
    await db.settings.clear();
    
    // データが空になったことを確認
    expect(await db.tasks.count()).toBe(0);
    
    // バックアップから復元
    const restored = await migration.restoreDatabase(backup);
    expect(restored).toBe(true);
    
    // データが復元されたことを確認
    const tasks = await operations.getAllTasks();
    const categories = await operations.getAllCategories();
    const theme = await operations.getSetting<string>('theme');
    
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Test Task');
    expect(categories.length).toBe(1);
    expect(categories[0].name).toBe('Test Category');
    expect(theme).toBe('dark');
  });

  it('should check database health', async () => {
    // 健全なデータベース状態を作成
    await operations.createCategory({
      name: 'Default',
      color: '#cccccc',
    });
    
    await operations.createTask({
      title: 'Health Check Task',
      status: 'pending' as const,
    });
    
    // ヘルスチェック実行
    const health = await migration.checkDatabaseHealth();
    
    expect(health.healthy).toBe(true);
    expect(health.version).toBeGreaterThan(0);
    expect(health.tasksCount).toBe(1);
    expect(health.categoriesCount).toBe(1);
    expect(health.errors.length).toBe(0);
  });
});