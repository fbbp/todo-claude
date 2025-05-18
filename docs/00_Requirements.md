# ToDo アプリ要件定義書 (Web/PWA 版)
作成日: 2025-05-18

## 1. アプリの目的
「タスクの抜け漏れ」「時間管理」を、**外部ネットワークに依存しないシングルページ Web アプリ**で解決する。  
ブラウザだけで完結し、離線状態でもフル機能を利用できるオフラインファースト PWA として提供する。

## 2. ターゲットユーザー
- ノート PC やタブレットのブラウザでタスク管理したい人
- 会社や病院など Wi‑Fi が制限された環境でも使える ToDo アプリを必要とする人  
- Windows / macOS / iPadOS / ChromeOS などマルチ OS のデスクトップ・タブレット利用者

## 3. コア機能
1. **今日のタスク・タイムライン表示**  
   - 当日のタスクを時系列に表示し現在時刻ラインで残り時間を可視化
2. **タスク CRUD・サブタスク管理**  
   - タイトル・期日・所要時間・カテゴリー・チェックリストを登録/編集
3. **オフライン動作 & ローカル保存**  
   - IndexedDB + Service Worker でデータをローカル保持し通信不要
4. **リマインダー通知 (ブラウザ通知 + バッジ)**  
   - Notification API + Web Alarms (setTimeout/Service Worker) でリマインド
5. **カテゴリー / フィルタリング**  
   - タグ付け・色分け・コンテキスト切替
6. **繰り返しタスク・習慣トラッカー**  
   - RRULE 文字列をローカル解析し次回発生を自動生成
7. **データエクスポート / インポート**  
   - JSON ファイルとしてバックアップおよび他端末へ持ち運び可能
8. **PWA インストール**  
   - ホーム画面追加でネイティブアプリのように起動

## 4. 画面構成
| 画面 | 概要 |
| ---- | ---- |
| Home / Today | 当日タスクのタイムライン表示、追加・完了操作 |
| All Tasks | カレンダー or リストで全タスク閲覧 |
| Task Edit Modal | タスク詳細入力 (タイトル・日時・サブタスクなど) |
| Categories | カテゴリー作成・編集・並び替え |
| Settings | 通知・テーマ・データエクスポート/インポート |

## 5. 技術スタック
| レイヤ | 技術 |
| ------ | ---- |
| フロントエンド | **React 18 + TypeScript** (Vite) |
| UI ライブラリ | shadcn/ui, lucide-react, Tailwind CSS |
| 状態管理 | Zustand (ローカル), React Context |
| データ永続化 | **IndexedDB** (dexie.js) + LocalStorage フォールバック |
| オフライン & キャッシュ | **Service Worker** (Workbox) + Cache Storage |
| 通知 | Notification API + Page/Service‑Worker Timers |
| デプロイ | **GitHub Pages** (gh‑pages) & GitHub Actions CI/CD |
| バージョニング | SemVer / GitHub Releases |

### オフラインアーキテクチャ
```
┌───────────────┐
│ React UI      │
│  - Zustand    │
│  - Hooks      │
└──▲────────────┘
   │                          
   │ IndexedDB (dexie.js)       
┌──┴────────────┐
│ ServiceWorker │  ← Workbox runtime caching
│  - Cache API  │
│  - BG Sync    │
└───────────────┘
```
- 初回アクセス時にすべての静的アセットを Cache Storage へプリキャッシュ  
- データは IndexedDB に保存し、画面ロード時に同期  
- 通知は Service Worker がスケジューリングしオフラインでも発火  
- `export.json` に全データを出力し手動バックアップ可

## 6. UI / UX ポリシー
- **シンプルで情報過多を避ける**淡色ベース + アクセント 1 色  
- 現在時刻ライン・残り時間バーで**時間感覚を可視化**  
- 1 クリックでタスク追加、タイトル入力だけでも保存可能  
- 文字サイズ・コントラスト比 4.5:1 を担保し読みやすさを最優先  
- 広告・解析スクリプトなしで**気が散らない画面**  
- キーボードショートカット提供 (例: `n` で新規タスク)

## 7. データモデル (IndexedDB)
| テーブル | 主キー | フィールド |
| -------- | ------ | ---------- |
| tasks | id (uuid) | title, dueAt, durationMin, categoryId, status, checklist[], repeatRule, createdAt, updatedAt |
| categories | id (uuid) | name, color, order |
| settings | key | value |

## 8. ビルド & デプロイ
1. `npm run build` で `dist/` 生成 (Vite)  
2. GitHub Actions が `gh-pages` ブランチへ静的ファイルを push  
3. GitHub Pages が自動公開 (PWA 対応)  

## 9. テスト
- **ユニット:** Jest + Testing Library  
- **E2E:** Playwright (Chromium) – オフラインモード・通知許可を含む  
- **アクセシビリティ:** axe-core CI  

## 10. 将来拡張オプション
- WebRTC でピア同期 (LAN 内デバイス間共有)  
- WASM ベースのローカル AI モジュールでタスク自動分類  
- Optional: 外部クラウド同期用プラグイン (利用可能な環境のみ)

