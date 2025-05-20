import { defineConfig, devices } from '@playwright/test';

/**
 * Playwrightの設定ファイル
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // テストファイルの場所
  testDir: './e2e/tests',
  
  // テスト間の残留状態を防ぐ
  fullyParallel: true,
  
  // すべてのテストを通して一意の処理IDを表示
  forbidOnly: !!process.env.CI,
  
  // CIで失敗したテストを再試行
  retries: process.env.CI ? 2 : 0,
  
  // 並列実行するワーカー数
  workers: process.env.CI ? 1 : undefined,
  
  // テストレポーターを設定
  reporter: 'html',
  
  // 共有設定
  use: {
    // ベースURL
    baseURL: 'http://localhost:5173',
    
    // すべてのテストでトレースを取得
    trace: 'on-first-retry',
    
    // スクリーンショットを撮影
    screenshot: 'only-on-failure',
  },

  // テストプロジェクトの設定
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'offline',
      use: { 
        ...devices['Desktop Chrome'],
        offline: true,
      },
    },
  ],

  // ローカルWebサーバーの設定
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});