# 03 コンポーネント & ナビゲーション設計

作成日: 2025-05-18

## ディレクトリ構成
```
src/
├─ app.tsx
├─ components/
│  ├─ TaskCard.tsx
│  ├─ TaskForm.tsx
│  ├─ TimelineBar.tsx
│  ├─ CategoryBadge.tsx
│  └─ IconButton.tsx
├─ pages/
│  ├─ HomePage.tsx
│  ├─ AllTasksPage.tsx
│  ├─ CategoriesPage.tsx
│  └─ SettingsPage.tsx
├─ routes.tsx
├─ store/
│  ├─ useTasks.ts
│  └─ useSettings.ts
├─ db/
│  └─ index.ts
├─ sw/
│  └─ sw.ts
└─ assets/
```

## ルーティング (React Router v6)
| パス | 画面 |
| ---- | ---- |
| `/` | HomePage (今日のタスク) |
| `/all` | AllTasksPage |
| `/categories` | CategoriesPage |
| `/settings` | SettingsPage |
| `/task/:id?` | TaskForm (モーダル) |

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={{<Layout />}}>
      <Route index element={{<HomePage />}} />
      <Route path="all" element={{<AllTasksPage />}} />
      <Route path="categories" element={{<CategoriesPage />}} />
      <Route path="settings" element={{<SettingsPage />}} />
    </Route>
  </Routes>
</BrowserRouter>
```

## 主なコンポーネント
| 名称 | 説明 |
| ---- | ---- |
| TaskCard | タスク表示・完了切替 |
| TaskForm | タスク追加 / 編集フォーム |
| TimelineBar | 日タイムライン & 現時刻 |
| CategoryBadge | タグ & フィルタ |
| Navbar | 画面上部ナビ |