import { db, type Task, type Category } from './index';
import * as operations from './operations';

/**
 * クエリのパフォーマンスを計測する
 * @param name クエリの名前
 * @param queryFn 実行するクエリ関数
 * @returns 結果と実行時間
 */
export async function measureQueryPerformance<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<{ name: string; result: T; executionTime: number }> {
  console.time(`Query: ${name}`);
  const startTime = performance.now();
  
  const result = await queryFn();
  
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  console.timeEnd(`Query: ${name}`);
  
  return {
    name,
    result,
    executionTime
  };
}

/**
 * サンプルデータを生成する
 * @param taskCount 生成するタスクの数
 * @param categoryCount 生成するカテゴリの数
 */
export async function generateSampleData(
  taskCount: number = 1000,
  categoryCount: number = 10
): Promise<void> {
  // 既存のデータをクリア
  await db.tasks.clear();
  await db.categories.clear();
  
  // カテゴリの生成
  const categoryIds: string[] = [];
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];
  
  console.log('Generating categories...');
  for (let i = 0; i < categoryCount; i++) {
    const id = await operations.createCategory({
      name: `Category ${i + 1}`,
      color: colors[i % colors.length],
      order: i
    });
    categoryIds.push(id);
  }
  
  // タスクの生成
  console.log(`Generating ${taskCount} tasks...`);
  const now = Date.now();
  const statuses: Task['status'][] = ['pending', 'done', 'archived'];
  
  for (let i = 0; i < taskCount; i++) {
    // ランダムな値を生成
    const status = statuses[Math.floor(Math.random() * 3)];
    const categoryId = Math.random() > 0.2
      ? categoryIds[Math.floor(Math.random() * categoryIds.length)]
      : undefined; // 20%のタスクはカテゴリなし
    
    // ランダムな日付 (今日から前後30日)
    const daysOffset = Math.floor(Math.random() * 60) - 30;
    const dueAt = Math.random() > 0.3
      ? now + daysOffset * 24 * 60 * 60 * 1000
      : undefined; // 30%のタスクは期限なし
    
    // ランダムな作成日時 (過去30日以内)
    const createdDaysAgo = Math.floor(Math.random() * 30);
    const createdAt = now - createdDaysAgo * 24 * 60 * 60 * 1000;
    
    // チェックリスト (10%のタスクのみ)
    const hasChecklist = Math.random() < 0.1;
    const checklist = hasChecklist
      ? Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
          id: crypto.randomUUID(),
          text: `Checklist item ${j + 1}`,
          checked: Math.random() > 0.5
        }))
      : undefined;
    
    // タスク作成
    await operations.createTask({
      title: `Task ${i + 1}`,
      status,
      categoryId,
      dueAt,
      createdAt,
      updatedAt: createdAt,
      checklist
    });
    
    // 進捗表示
    if ((i + 1) % 100 === 0 || i === taskCount - 1) {
      console.log(`Generated ${i + 1}/${taskCount} tasks`);
    }
  }
  
  console.log('Sample data generation completed!');
}

/**
 * インデックスのパフォーマンスをテストする
 */
export async function testIndexPerformance(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  // タスク数のカウントを取得
  const taskCount = await db.tasks.count();
  console.log(`Testing performance with ${taskCount} tasks`);
  
  // 1. ステータスでフィルタリング
  const statusQuery = await measureQueryPerformance('Status filter: pending', () => 
    db.tasks.where('status').equals('pending').toArray()
  );
  results['statusFilter'] = statusQuery.executionTime;
  console.log(`Found ${statusQuery.result.length} pending tasks in ${statusQuery.executionTime.toFixed(2)}ms`);
  
  // 2. 日付範囲でフィルタリング
  const now = Date.now();
  const weekLater = now + 7 * 24 * 60 * 60 * 1000;
  const dateRangeQuery = await measureQueryPerformance('Date range filter: next 7 days', () => 
    db.tasks.where('dueAt').between(now, weekLater).toArray()
  );
  results['dateRangeFilter'] = dateRangeQuery.executionTime;
  console.log(`Found ${dateRangeQuery.result.length} tasks due in next 7 days in ${dateRangeQuery.executionTime.toFixed(2)}ms`);
  
  // 3. 複合条件でフィルタリング
  const compoundQuery = await measureQueryPerformance('Compound filter: pending + next 7 days', () => 
    db.tasks
      .where('[status+dueAt]')
      .between(['pending', now], ['pending', weekLater])
      .toArray()
  );
  results['compoundFilter'] = compoundQuery.executionTime;
  console.log(`Found ${compoundQuery.result.length} pending tasks due in next 7 days in ${compoundQuery.executionTime.toFixed(2)}ms`);
  
  // 4. カテゴリでフィルタリング
  const categories = await db.categories.toArray();
  if (categories.length > 0) {
    const sampleCategoryId = categories[0].id!;
    const categoryQuery = await measureQueryPerformance(`Category filter: ${categories[0].name}`, () => 
      db.tasks.where('categoryId').equals(sampleCategoryId).toArray()
    );
    results['categoryFilter'] = categoryQuery.executionTime;
    console.log(`Found ${categoryQuery.result.length} tasks in category "${categories[0].name}" in ${categoryQuery.executionTime.toFixed(2)}ms`);
    
    // 5. カテゴリ+ステータスでフィルタリング
    const categoryStatusQuery = await measureQueryPerformance(`Category+Status filter: ${categories[0].name} + pending`, () => 
      db.tasks
        .where('[categoryId+status]')
        .equals([sampleCategoryId, 'pending'])
        .toArray()
    );
    results['categoryStatusFilter'] = categoryStatusQuery.executionTime;
    console.log(`Found ${categoryStatusQuery.result.length} pending tasks in category "${categories[0].name}" in ${categoryStatusQuery.executionTime.toFixed(2)}ms`);
  }
  
  // 6. クエリ結果の並べ替え
  const sortQuery = await measureQueryPerformance('Sort by creation date', () => 
    db.tasks.orderBy('createdAt').reverse().toArray()
  );
  results['sortCreatedAt'] = sortQuery.executionTime;
  console.log(`Sorted all tasks by creation date in ${sortQuery.executionTime.toFixed(2)}ms`);
  
  // 7. 更新日時での並べ替え
  const sortUpdatedQuery = await measureQueryPerformance('Sort by update date', () => 
    db.tasks.orderBy('updatedAt').reverse().toArray()
  );
  results['sortUpdatedAt'] = sortUpdatedQuery.executionTime;
  console.log(`Sorted all tasks by update date in ${sortUpdatedQuery.executionTime.toFixed(2)}ms`);
  
  return results;
}