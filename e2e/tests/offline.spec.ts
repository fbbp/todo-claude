import { expect } from '@playwright/test';
import { test } from '@playwright/test';

// オフラインモード専用のテスト
test.describe('Offline Mode', () => {
  // offline プロジェクトでのみテストを実行
  test.use({ offline: true });

  test('should work offline after initial load', async ({ page }) => {
    // オンラインでページを読み込む（キャッシュに保存）
    await page.goto('/');
    
    // ページがロードされたことを確認
    await expect(page.locator('nav')).toBeVisible();
    
    // オフラインモードに切り替え
    await page.context().setOffline(true);
    
    // ページを再読み込み
    await page.reload();
    
    // ページがオフラインでも動作することを確認
    await expect(page.locator('nav')).toBeVisible();
    
    // 新規タスク作成ボタンが機能することを確認
    await page.getByRole('button', { name: '新規タスク', exact: true }).click();
    
    // フォームが表示されることを確認
    const taskForm = page.locator('form');
    await expect(taskForm).toBeVisible();
    
    // タスク名を入力
    await page.getByLabel('タイトル').fill('オフラインでのタスク');
    
    // タスク作成ボタンをクリック
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // フォームが閉じられることを確認
    await expect(taskForm).toBeHidden();
    
    // 作成したタスクが表示されることを確認
    const taskItem = page.getByText('オフラインでのタスク');
    await expect(taskItem).toBeVisible();
    
    // オフラインインジケーターが表示されることを確認（アプリの実装による）
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();
  });

  test('should sync data when back online', async ({ page }) => {
    // オンラインでページを読み込む
    await page.goto('/');
    
    // ページがロードされたことを確認
    await expect(page.locator('nav')).toBeVisible();
    
    // オフラインモードに切り替え
    await page.context().setOffline(true);
    
    // オフラインでタスクを作成
    await page.getByRole('button', { name: '新規タスク', exact: true }).click();
    await page.getByLabel('タイトル').fill('オフライン同期テスト');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // 作成したタスクが表示されることを確認
    const taskItem = page.getByText('オフライン同期テスト');
    await expect(taskItem).toBeVisible();
    
    // オンラインモードに戻す
    await page.context().setOffline(false);
    
    // 少し待機して同期が完了することを待つ
    await page.waitForTimeout(1000);
    
    // 別のタブ/セッションをシミュレート（同期の確認）
    const newContext = await page.context().browser().newContext();
    const newPage = await newContext.newPage();
    await newPage.goto(page.url());
    
    // 新しいセッションでもタスクが表示されることを確認
    const syncedTaskItem = newPage.getByText('オフライン同期テスト');
    await expect(syncedTaskItem).toBeVisible();
    
    // クリーンアップ
    await newContext.close();
  });

  test('should show offline UI elements when connection is lost', async ({ page }) => {
    // オンラインでページを読み込む
    await page.goto('/');
    
    // ページが正常にロードされたことを確認
    await expect(page.locator('nav')).toBeVisible();
    
    // オフラインモードに切り替え
    await page.context().setOffline(true);
    
    // オフラインインジケーターが表示されることを確認（アプリの実装による）
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    await expect(offlineIndicator).toBeVisible();
    
    // オフラインモードに関連するUIの変化を確認
    // 例: オフラインバッジ、オフラインモード通知など
    
    // 再びオンラインに戻す
    await page.context().setOffline(false);
    
    // オフラインインジケーターが非表示になることを確認
    await expect(offlineIndicator).toBeHidden();
  });
});