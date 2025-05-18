# 01 アーキテクチャ設計 (Web/PWA)

作成日: 2025-05-18

## 1. 概要
本アプリは **React 18 + TypeScript** をフロントエンドに採用し、静的ホスティングは **GitHub Pages** で行う。  
すべてのデータはブラウザ内の **IndexedDB** に保存され、**Service Worker** によって静的アセットとローカル API をキャッシュすることで **完全オフライン** 動作を実現する **Progressive Web App (PWA)** である。

### 技術スタック
| レイヤ | 技術・ライブラリ |
| ------ | --------------- |
| ビルド | Vite + Vitest |
| UI     | React 18, Tailwind CSS, shadcn/ui |
| 状態管理 | Zustand |
| データ永続化 | IndexedDB (Dexie.js) |
| ルーティング | React Router v6 |
| キャッシュ | Service Worker (Workbox) |
| 通知 | Notification API + Service Worker Timers |
| デプロイ | GitHub Actions → GitHub Pages |

## 2. ハイレベル構成図
```
       ┌────────────┐
       │ React App  │
       │ (Zustand)  │
       └───▲───┬────┘
           │   │
           │   │ IndexedDB (Dexie.js)
           │   ▼
       ┌───┴──────────┐
       │ ServiceWorker│
       │  - Cache API │
       │  - BG Timers │
       └───▲──────────┘
           │
           │ Static Assets (pre‑cached)
           ▼
      GitHub Pages (CDN)
```

- **初回ロード**: 静的アセットをプリキャッシュし、その後はオフライン起動可能  
- **データ操作**: React から Dexie.js DAO を介して IndexedDB に CRUD  
- **通知**: タスク登録時に Service Worker へ `postMessage` → `setTimeout` でローカル通知予約  
- **更新**: Workbox `skipWaiting()` & `clients.claim()` で即時アップデート

## 3. オフライン戦略
- **100% ローカル**: 外部ネットワークに一切依存しない  
- JSON エクスポート / インポートで端末移行  
- Dexie バージョン管理でスキーマ移行を自動化

## 4. セキュリティ
- オプションで **パスワードロック + AES 暗号化** (Web Crypto)  
- Trusted Types, CSP で XSS 対策  
- HTTPS (GitHub Pages) で Service Worker を有効化