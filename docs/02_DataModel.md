# 02 データモデル設計 (IndexedDB / Dexie.js)

作成日: 2025-05-18

## テーブル設計

### tasks
| フィールド | 型 | 主キー | 説明 |
| ---------- | --- | ------ | ---- |
| id         | string(UUID) | ✔ | タスク ID |
| title      | string | | タスク名 |
| dueAt      | number \| null | | 期日 (Unix ms) |
| durationMin| number \| null | | 見積もり時間 (分) |
| categoryId | string \| null | | カテゴリー参照 |
| status     | string | | `pending` / `done` |
| checklist  | object[] | | サブタスク { id, text, checked } |
| repeatRule | string \| null | | iCal RRULE |
| createdAt  | number | | 生成時刻 (ms) |
| updatedAt  | number | | 更新時刻 (ms) |

### categories
| フィールド | 型 | 主キー | 説明 |
| ---------- | --- | ------ | ---- |
| id   | string(UUID) | ✔ | カテゴリー ID |
| name | string | | 名称 |
| color| string | | HEX |
| order| number | | 表示順 |

### settings
| key | value 型 | 説明 |
| --- | -------- | ---- |
| notifyBeforeMin | number | 事前通知 (分) |
| theme | string | `light` / `dark` |
| snoozeMin | number | スヌーズ間隔 (分) |

## Dexie スキーマ例
```ts
const db = new Dexie('todo');
db.version(1).stores({{
  tasks: "id, status, dueAt",
  categories: "id, order",
  settings: "key"
}});
```

## インデックス
- `tasks.dueAt` 昇順インデックス  
- `tasks.status+dueAt` 複合インデックス