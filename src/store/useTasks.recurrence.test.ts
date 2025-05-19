import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from './useTasks';
import { db } from '../db';
import type { Task } from '../db';
import { RRule } from 'rrule';

vi.mock('../db', () => ({
  db: {
    tasks: {
      toArray: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('useTasks - Recurrence functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a recurring task when completing a task with repeatRule', async () => {
    const now = new Date('2023-12-01T10:00:00');
    vi.setSystemTime(now);

    const recurringTask: Task = {
      id: 'task-1',
      title: '毎日のタスク',
      dueAt: now.getTime(),
      status: 'pending',
      // 毎日繰り返し
      repeatRule: 'RRULE:FREQ=DAILY;INTERVAL=1',
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    const tasks = [recurringTask];
    vi.mocked(db.tasks.toArray).mockResolvedValue(tasks);

    const { result } = renderHook(() => useTasks());

    // 初期状態を設定
    await act(async () => {
      await result.current.load();
    });

    expect(result.current.tasks).toEqual(tasks);

    // タスクを完了させる
    await act(async () => {
      await result.current.toggleStatus('task-1');
    });

    // 元のタスクが更新されたことを確認
    expect(db.tasks.update).toHaveBeenCalledWith('task-1', expect.objectContaining({ 
      status: 'done',
      updatedAt: expect.any(Number),
    }));

    // 新しい繰り返しタスクが作成されたことを確認
    expect(db.tasks.add).toHaveBeenCalledWith(expect.objectContaining({
      title: '毎日のタスク',
      dueAt: new Date('2023-12-02T10:00:00').getTime(), // 次の日
      status: 'pending',
      repeatRule: 'RRULE:FREQ=DAILY;INTERVAL=1',
      repeatParentId: 'task-1',
      repeatCount: 1,
    }));
    
    vi.clearAllMocks();
  });

  it('should not create a recurring task when uncompleting a task', async () => {
    const doneTask: Task = {
      id: 'task-2',
      title: '完了したタスク',
      status: 'done',
      repeatRule: 'RRULE:FREQ=DAILY;INTERVAL=1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const tasks = [doneTask];
    vi.mocked(db.tasks.toArray).mockResolvedValue(tasks);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.load();
    });

    // タスクを未完了に戻す
    await act(async () => {
      await result.current.toggleStatus('task-2');
    });

    // タスクが更新されただけで、新しいタスクは作成されないことを確認
    expect(db.tasks.update).toHaveBeenCalledWith('task-2', expect.objectContaining({
      status: 'pending',
    }));
    expect(db.tasks.add).not.toHaveBeenCalled();
  });

  it('should preserve checklist in recurring tasks', async () => {
    const taskWithChecklist: Task = {
      id: 'task-3',
      title: 'チェックリスト付きタスク',
      dueAt: Date.now(),
      status: 'pending',
      checklist: [
        { id: '1', text: 'サブタスク1', checked: true },
        { id: '2', text: 'サブタスク2', checked: false },
      ],
      repeatRule: 'RRULE:FREQ=WEEKLY;INTERVAL=1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const tasks = [taskWithChecklist];
    vi.mocked(db.tasks.toArray).mockResolvedValue(tasks);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.load();
    });

    await act(async () => {
      await result.current.toggleStatus('task-3');
    });

    // 新しいタスクのチェックリストが全て未チェックになっていることを確認
    expect(db.tasks.add).toHaveBeenCalledWith(expect.objectContaining({
      checklist: [
        { id: '1', text: 'サブタスク1', checked: false },
        { id: '2', text: 'サブタスク2', checked: false },
      ],
    }));
  });

  it('should handle recurring tasks with end date', async () => {
    const now = new Date('2023-12-30T10:00:00');
    vi.setSystemTime(now);

    const taskWithEndDate: Task = {
      id: 'task-4',
      title: '終了日付きの繰り返しタスク',
      dueAt: now.getTime(),
      status: 'pending',
      repeatRule: 'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20231231T235959Z',
      repeatUntil: new Date('2023-12-31T23:59:59').getTime(),
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    const tasks = [taskWithEndDate];
    vi.mocked(db.tasks.toArray).mockResolvedValue(tasks);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.load();
    });

    // タスクを完了させる
    await act(async () => {
      await result.current.toggleStatus('task-4');
    });

    // 次の繰り返し（12/31）は終了日内なので、新しいタスクが作成される
    expect(db.tasks.add).toHaveBeenCalledTimes(1);
    expect(db.tasks.add).toHaveBeenCalledWith(expect.objectContaining({
      dueAt: new Date('2023-12-31T10:00:00').getTime(),
    }));
  });

  it('should not create recurring task when past end date', async () => {
    const now = new Date('2024-01-02T10:00:00');
    vi.setSystemTime(now);

    const expiredTask: Task = {
      id: 'task-5',
      title: '期限切れの繰り返しタスク',
      dueAt: now.getTime(),
      status: 'pending',
      repeatRule: 'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20240101T235959Z',
      repeatUntil: new Date('2024-01-01T23:59:59').getTime(),
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    const tasks = [expiredTask];
    vi.mocked(db.tasks.toArray).mockResolvedValue(tasks);

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await result.current.load();
    });

    // タスクを完了させる
    await act(async () => {
      await result.current.toggleStatus('task-5');
    });

    // 終了日を過ぎているので、新しいタスクは作成されない
    expect(db.tasks.add).not.toHaveBeenCalled();
  });
});