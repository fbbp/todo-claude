import { expect } from '@playwright/test';
import { test } from '../fixtures/base-fixture';

// 基本的なナビゲーションテスト
test.describe('Basic Navigation', () => {
  // 各テストの前にアプリを初期化
  test.beforeEach(async ({ appReady }) => {
    // この段階でアプリは準備完了
  });

  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Todo App/);
    
    // ナビゲーションバーが表示されていることを確認
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
    
    // 「今日のタスク」というテキストを含む要素が表示されていることを確認
    const todaySection = page.getByText('今日のタスク', { exact: false });
    await expect(todaySection).toBeVisible();
  });

  test('should navigate to categories page', async ({ page }) => {
    await page.goto('/');
    
    // ナビゲーションメニューのカテゴリーリンクをクリック
    await page.getByRole('link', { name: 'カテゴリー', exact: true }).click();
    
    // URLが変わったことを確認
    await expect(page).toHaveURL(/.*\/categories/);
    
    // ページタイトルを確認
    const pageTitle = page.getByRole('heading', { level: 1 });
    await expect(pageTitle).toHaveText('カテゴリー');
  });

  test('should navigate to all tasks page', async ({ page }) => {
    await page.goto('/');
    
    // ナビゲーションメニューの「すべてのタスク」リンクをクリック
    await page.getByRole('link', { name: 'すべてのタスク', exact: true }).click();
    
    // URLが変わったことを確認
    await expect(page).toHaveURL(/.*\/all-tasks/);
    
    // ページタイトルを確認
    const pageTitle = page.getByRole('heading', { level: 1 });
    await expect(pageTitle).toHaveText('すべてのタスク');
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    
    // ナビゲーションメニューの設定リンクをクリック
    await page.getByRole('link', { name: '設定', exact: true }).click();
    
    // URLが変わったことを確認
    await expect(page).toHaveURL(/.*\/settings/);
    
    // ページタイトルを確認
    const pageTitle = page.getByRole('heading', { level: 1 });
    await expect(pageTitle).toHaveText('設定');
  });
});

// レスポンシブデザインのテスト
test.describe('Responsive Design', () => {
  test('should display responsive layout on mobile', async ({ page }) => {
    // モバイルビューポートをエミュレート
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // モバイルメニューボタンが表示されるか確認
    const menuButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(menuButton).toBeVisible();
    
    // デスクトップナビゲーションは非表示であることを確認
    const desktopNav = page.locator('nav > ul');
    await expect(desktopNav).toBeHidden();
    
    // メニューをクリックして開く
    await menuButton.click();
    
    // モバイルメニューが表示されることを確認
    const mobileMenu = page.locator('div[role="dialog"]');
    await expect(mobileMenu).toBeVisible();
    
    // モバイルメニュー内でナビゲーションリンクが表示されることを確認
    const navLinks = mobileMenu.getByRole('link');
    await expect(navLinks).toHaveCount(4); // ホーム、カテゴリー、すべてのタスク、設定
  });
});