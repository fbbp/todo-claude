import { test as base } from '@playwright/test';

/**
 * アプリケーション用のカスタムテストフィクスチャー
 */
export const test = base.extend({
  /**
   * アプリケーションがロードされるまで待機し、IndexedDBをクリアする
   */
  appReady: async ({ page }, use) => {
    // IndexedDBをクリアする
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // IndexedDBの接続をクローズする前に削除する
        const deleteRequest = indexedDB.deleteDatabase('todo');
        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = () => resolve(false);
      });
    });
    
    // アプリケーションを再度ロードする
    await page.goto('/');
    
    // アプリケーションがロードされるまで待機
    await page.waitForSelector('nav');
    
    await use(true);
  },
  
  /**
   * ダークモードを有効にする
   */
  darkMode: async ({ page }, use) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await use(true);
    await page.emulateMedia({ colorScheme: 'light' });
  },
});