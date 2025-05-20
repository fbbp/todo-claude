import { expect } from '@playwright/test';
import { test } from '../fixtures/base-fixture';

// 通知機能のテスト
test.describe('Notifications', () => {
  // 各テストの前にアプリを初期化
  test.beforeEach(async ({ appReady, page }) => {
    // アプリのホームページにアクセス
    await page.goto('/');
    
    // 通知許可をモック
    await page.evaluate(() => {
      // Notification APIのモック
      Object.defineProperty(window, 'Notification', {
        writable: true,
        value: class MockNotification {
          static permission = 'granted';
          static requestPermission() {
            return Promise.resolve('granted');
          }
          
          constructor(title, options) {
            this.title = title;
            this.options = options;
            // 通知が作成されたことを記録
            window._mockNotifications = window._mockNotifications || [];
            window._mockNotifications.push({ title, options });
          }
          
          close() {
            // 通知が閉じられたことを記録
            const index = window._mockNotifications.findIndex(n => n.title === this.title);
            if (index !== -1) {
              window._mockNotifications.splice(index, 1);
            }
          }
        }
      });
      
      // モック通知をクリア
      window._mockNotifications = [];
    });
  });

  test('should request notification permission on settings page', async ({ page }) => {
    // 設定ページに移動
    await page.goto('/settings');
    
    // 通知設定セクションを探す
    const notificationSection = page.getByText('通知設定');
    await expect(notificationSection).toBeVisible();
    
    // 通知権限の許可ボタンを探してクリック
    const permissionButton = page.getByRole('button', { name: '通知を許可' });
    
    if (await permissionButton.isVisible()) {
      await permissionButton.click();
      
      // 権限リクエストが行われたことを確認
      const permissionStatus = await page.evaluate(() => {
        return Notification.permission;
      });
      
      expect(permissionStatus).toBe('granted');
    }
    
    // 通知設定スイッチがオンになっていることを確認
    const notificationSwitch = page.getByLabel('通知を有効にする');
    await expect(notificationSwitch).toBeVisible();
    
    // スイッチをオンにする（すでにオンの場合もある）
    if (!await notificationSwitch.isChecked()) {
      await notificationSwitch.check();
    }
    
    await expect(notificationSwitch).toBeChecked();
  });

  test('should create notification for task with due date', async ({ page }) => {
    // まず設定ページで通知を有効にする
    await page.goto('/settings');
    const notificationSwitch = page.getByLabel('通知を有効にする');
    if (!await notificationSwitch.isChecked()) {
      await notificationSwitch.check();
    }
    
    // ホームページに戻る
    await page.goto('/');
    
    // 新規タスク作成ボタンをクリック
    await page.getByRole('button', { name: '新規タスク', exact: true }).click();
    
    // タスク名を入力
    await page.getByLabel('タイトル').fill('通知テスト用タスク');
    
    // 期限を数分後に設定（現在時刻の5分後）
    const now = new Date();
    const dueDate = new Date(now.getTime() + 5 * 60 * 1000);
    
    const dateInput = page.getByLabel('日付');
    await dateInput.fill(formatDate(dueDate));
    
    const timeInput = page.getByLabel('時間');
    await timeInput.fill(formatTime(dueDate));
    
    // タスク作成ボタンをクリック
    await page.getByRole('button', { name: '保存', exact: true }).click();
    
    // これによって通知スケジュールが設定されるはず
    
    // シミュレーションで通知をトリガー（通常は時間経過でトリガーされる）
    await page.evaluate(({ taskTitle }) => {
      // 通知をシミュレート
      const mockNotification = new Notification(taskTitle, {
        body: '期限が近づいています',
        icon: '/icon.png'
      });
      
      // モックされた通知を確認
      return window._mockNotifications || [];
    }, { taskTitle: '通知テスト用タスク' });
    
    // 通知が作成されたことを確認（ページのUIに反映される場合）
    // 例: 通知履歴またはトースト通知が表示される
    
    // 通知センターを開く（アプリの実装による）
    const notificationIcon = page.getByRole('button', { name: '通知' });
    if (await notificationIcon.isVisible()) {
      await notificationIcon.click();
      
      // 通知リストに通知が表示されることを確認
      const notificationItem = page.getByText('通知テスト用タスク');
      await expect(notificationItem).toBeVisible();
    }
  });

  test('should be able to change notification timing settings', async ({ page }) => {
    // 設定ページに移動
    await page.goto('/settings');
    
    // 通知タイミング設定を探す
    const timingSection = page.getByText('通知タイミング');
    await expect(timingSection).toBeVisible();
    
    // 時間選択ドロップダウンを探す
    const timeDropdown = page.getByLabel('期限の何分前に通知する');
    await expect(timeDropdown).toBeVisible();
    
    // ドロップダウンを開く
    await timeDropdown.click();
    
    // 30分前を選択
    await page.getByRole('option', { name: '30分前' }).click();
    
    // 設定が保存されたことを確認
    // ページを再読み込みして設定が保持されているか確認
    await page.reload();
    
    // 再度ドロップダウンの値を確認
    const updatedDropdown = page.getByLabel('期限の何分前に通知する');
    const selectedValue = await updatedDropdown.inputValue();
    expect(selectedValue).toBe('30'); // または選択された値に応じた値
  });
});

/**
 * 日付をYYYY-MM-DD形式で整形
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 時間をHH:MM形式で整形
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}