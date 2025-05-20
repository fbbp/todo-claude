import { expect } from '@playwright/test';
import { test } from '../fixtures/base-fixture';

test.describe('Task Management', () => {
  // 各テストの前にアプリを初期化
  test.beforeEach(async ({ appReady, page }) => {
    // アプリのホームページにアクセス
    await page.goto('/');
  });

  test('should create a new task', async ({ page }) => {
    // 新規タスク作成ボタンをクリック
    await page.getByRole('button', { name: '新規タスク', exact: true }).click();
    
    // フォームが表示されることを確認
    const taskForm = page.locator('form');
    await expect(taskForm).toBeVisible();
    
    // タスク名を入力
    await page.getByLabel('タイトル').fill('E2Eテスト用タスク');
    
    // 日付と時間を設定（動的な日付形式のため厳密な値チェックは難しい）
    const dateInput = page.getByLabel('日付');
    await dateInput.click();
    await dateInput.fill(getTomorrowDate());
    
    // タスク作成ボタンをクリック
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // フォームが閉じられることを確認
    await expect(taskForm).toBeHidden();
    
    // 作成したタスクが表示されることを確認
    const taskItem = page.getByText('E2Eテスト用タスク');
    await expect(taskItem).toBeVisible();
  });

  test('should mark a task as completed', async ({ page }) => {
    // 最初にタスクを作成
    await page.getByRole('button', { name: '新規タスク', exact: true }).click();
    await page.getByLabel('タイトル').fill('完了テスト用タスク');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // 作成したタスクを検索
    const taskItem = page.getByText('完了テスト用タスク');
    await expect(taskItem).toBeVisible();
    
    // タスク項目の親要素を取得
    const taskCard = taskItem.locator('xpath=ancestor::div[contains(@class, "card")]');
    
    // チェックボックスを見つけてクリック
    const checkbox = taskCard.locator('input[type="checkbox"]');
    await checkbox.check();
    
    // チェックボックスが選択状態になったことを確認
    await expect(checkbox).toBeChecked();
    
    // タスクのスタイルが完了状態になったか確認（クラス名またはスタイルの変化）
    await expect(taskCard).toHaveClass(/completed/);
  });

  test('should delete a task', async ({ page }) => {
    // 最初にタスクを作成
    await page.getByRole('button', { name: '新規タスク', exact: true }).click();
    await page.getByLabel('タイトル').fill('削除テスト用タスク');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // 作成したタスクを検索
    const taskItem = page.getByText('削除テスト用タスク');
    await expect(taskItem).toBeVisible();
    
    // タスク項目の親要素を取得
    const taskCard = taskItem.locator('xpath=ancestor::div[contains(@class, "card")]');
    
    // 削除ボタン（またはメニューボタン）をクリック
    const menuButton = taskCard.getByRole('button', { name: 'アクション' });
    await menuButton.click();
    
    // 表示されたメニューから削除を選択
    await page.getByRole('menuitem', { name: '削除' }).click();
    
    // 確認ダイアログが表示されることを確認
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible();
    
    // 確認ボタンをクリック
    await page.getByRole('button', { name: '削除', exact: true }).click();
    
    // タスクが削除されたことを確認
    await expect(taskItem).not.toBeVisible();
  });

  test('should edit a task', async ({ page }) => {
    // 最初にタスクを作成
    await page.getByRole('button', { name: '新規タスク', exact: true }).click();
    await page.getByLabel('タイトル').fill('編集前のタスク');
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // 作成したタスクを検索
    const taskItem = page.getByText('編集前のタスク');
    await expect(taskItem).toBeVisible();
    
    // タスク項目の親要素を取得
    const taskCard = taskItem.locator('xpath=ancestor::div[contains(@class, "card")]');
    
    // 編集ボタン（またはメニューボタン）をクリック
    const menuButton = taskCard.getByRole('button', { name: 'アクション' });
    await menuButton.click();
    
    // 表示されたメニューから編集を選択
    await page.getByRole('menuitem', { name: '編集' }).click();
    
    // 編集フォームが表示されることを確認
    const taskForm = page.locator('form');
    await expect(taskForm).toBeVisible();
    
    // タイトルを変更
    await page.getByLabel('タイトル').fill('編集後のタスク');
    
    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // 編集したタスクが表示されることを確認
    const editedTaskItem = page.getByText('編集後のタスク');
    await expect(editedTaskItem).toBeVisible();
    
    // 元のタスク名が表示されていないことを確認
    await expect(page.getByText('編集前のタスク')).not.toBeVisible();
  });
});

/**
 * 明日の日付をYYYY-MM-DD形式で取得
 */
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}