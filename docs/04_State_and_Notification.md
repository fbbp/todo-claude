# 04 状態管理 & 通知設計

作成日: 2025-05-18

## Zustand ストア例
```ts
const useTasks = create<TaskStore>((set, get) => ({{
  tasks: [],
  load: async () => {{
    const all = await db.tasks.toArray();
    set({{ tasks: all }});
  }},
  add: async (draft) => {{
    const id = crypto.randomUUID();
    const now = Date.now();
    const task = {{ id, status: 'pending', createdAt: now, updatedAt: now, ...draft }};
    await db.tasks.add(task);
    set({{ tasks: [...get().tasks, task] }});
    scheduleReminder(task);
    return id;
  }},
}}));
```

## 通知スケジュール
1. タスク追加時に `postMessage` で Service Worker へ送信  
2. SW 内で `setTimeout` でローカル通知を予約  
3. 期限到達 → `showNotification`  
4. 通知クリック → `clients.openWindow('/')` でアプリ復帰 & タスクフォーカス

### スヌーズ
- Notification action `"snooze"` を実装  
- クリックで `now + snoozeMin` に再スケジュール

## Service Worker スニペット
```ts
self.addEventListener('message', (e) => {{
  if (e.data?.type === 'SCHEDULE') {{
    schedule(e.data.task);
  }}
}});
function schedule(task) {{
  const diff = task.dueAt - Date.now();
  setTimeout(() => {{
    self.registration.showNotification(task.title, {{
      body: '期限です',
      tag: task.id,
      actions: [{{ action: 'snooze', title: '後で' }}],
    }});
  }}, diff);
}}
```