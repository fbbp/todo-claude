import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from './useTasks';
import { db } from '../db';

describe('useTasks Store', () => {
  beforeEach(async () => {
    await db.open();
    await db.tasks.clear();
  });

  afterEach(async () => {
    await db.tasks.clear();
    const store = useTasks.getState();
    store.tasks = [];
  });

  it('should add a task', async () => {
    const { result } = renderHook(() => useTasks());

    let taskId: string | undefined;
    await waitFor(async () => {
      taskId = await result.current.add({
        title: 'Test Task',
      });
      expect(taskId).toBeDefined();
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe('Test Task');
    expect(result.current.tasks[0].status).toBe('pending');
  });

  it('should load tasks from database', async () => {
    const now = Date.now();
    await db.tasks.bulkAdd([
      { id: crypto.randomUUID(), title: 'Task 1', status: 'pending', createdAt: now, updatedAt: now },
      { id: crypto.randomUUID(), title: 'Task 2', status: 'done', createdAt: now, updatedAt: now },
    ]);

    const { result } = renderHook(() => useTasks());

    await waitFor(async () => {
      await result.current.load();
    });

    expect(result.current.tasks).toHaveLength(2);
  });

  it('should update a task', async () => {
    const { result } = renderHook(() => useTasks());

    let taskId: string;
    await waitFor(async () => {
      taskId = (await result.current.add({ title: 'Original' }))!;
    });

    await waitFor(async () => {
      await result.current.update(taskId!, { title: 'Updated' });
    });

    await waitFor(() => {
      const task = result.current.tasks.find(t => t.id === taskId);
      expect(task?.title).toBe('Updated');
    });
  });

  it('should toggle task status', async () => {
    const { result } = renderHook(() => useTasks());

    let taskId: string;
    await waitFor(async () => {
      taskId = (await result.current.add({ title: 'Test' }))!;
    });

    await waitFor(() => {
      const task = result.current.tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('pending');
    });

    await waitFor(async () => {
      await result.current.toggleStatus(taskId!);
    });

    await waitFor(() => {
      const task = result.current.tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('done');
    });

    await waitFor(async () => {
      await result.current.toggleStatus(taskId!);
    });

    await waitFor(() => {
      const task = result.current.tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('pending');
    });
  });

  it('should remove a task', async () => {
    const { result } = renderHook(() => useTasks());

    let taskId: string;
    await waitFor(async () => {
      taskId = (await result.current.add({ title: 'To Remove' }))!;
    });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1);
    });

    await waitFor(async () => {
      await result.current.remove(taskId!);
    });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(0);
    });
  });
});