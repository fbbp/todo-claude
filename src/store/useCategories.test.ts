import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCategories } from './useCategories';
import { db } from '../db';
import type { Category } from '../db';

describe('useCategories Store', () => {
  beforeEach(async () => {
    await db.open();
    await db.categories.clear();
  });

  afterEach(async () => {
    await db.categories.clear();
    const store = useCategories.getState();
    store.categories = [];
  });

  it('should add a category', async () => {
    const { result } = renderHook(() => useCategories());

    let categoryId: string | undefined;
    await waitFor(async () => {
      categoryId = await result.current.add({
        name: 'Test Category',
        color: '#FF5733',
      });
      expect(categoryId).toBeDefined();
    });

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
      expect(result.current.categories[0].name).toBe('Test Category');
      expect(result.current.categories[0].color).toBe('#FF5733');
      expect(result.current.categories[0].order).toBe(1); // First category gets order 1
    });

    // Verify in database
    const dbCategories = await db.categories.toArray();
    expect(dbCategories).toHaveLength(1);
    expect(dbCategories[0].id).toBe(categoryId);
  });

  it('should load categories from database ordered by order field', async () => {
    // Add categories in reverse order to test sorting
    await db.categories.bulkAdd([
      { id: crypto.randomUUID(), name: 'Category 3', color: '#FFC300', order: 3 },
      { id: crypto.randomUUID(), name: 'Category 1', color: '#FF5733', order: 1 },
      { id: crypto.randomUUID(), name: 'Category 2', color: '#C70039', order: 2 },
    ]);

    const { result } = renderHook(() => useCategories());

    await waitFor(async () => {
      await result.current.load();
    });

    expect(result.current.categories).toHaveLength(3);
    expect(result.current.categories[0].name).toBe('Category 1');
    expect(result.current.categories[1].name).toBe('Category 2');
    expect(result.current.categories[2].name).toBe('Category 3');
  });

  it('should update a category', async () => {
    const { result } = renderHook(() => useCategories());

    let categoryId: string | undefined;
    await waitFor(async () => {
      categoryId = await result.current.add({
        name: 'Original Name',
        color: '#FF5733',
      });
    });

    expect(categoryId).toBeDefined();

    await waitFor(async () => {
      await result.current.update(categoryId!, {
        name: 'Updated Name',
        color: '#C70039',
      });
    });

    await waitFor(() => {
      const category = result.current.categories.find(c => c.id === categoryId);
      expect(category).toBeDefined();
      expect(category?.name).toBe('Updated Name');
      expect(category?.color).toBe('#C70039');
    });

    // Verify in database
    const dbCategory = await db.categories.get(categoryId!);
    expect(dbCategory?.name).toBe('Updated Name');
    expect(dbCategory?.color).toBe('#C70039');
  });

  it('should remove a category', async () => {
    const { result } = renderHook(() => useCategories());

    let categoryId: string | undefined;
    await waitFor(async () => {
      categoryId = await result.current.add({
        name: 'To Remove',
        color: '#FF5733',
      });
    });

    expect(categoryId).toBeDefined();
    expect(result.current.categories).toHaveLength(1);

    await waitFor(async () => {
      await result.current.remove(categoryId!);
    });

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(0);
    });

    // Verify in database
    const dbCategory = await db.categories.get(categoryId!);
    expect(dbCategory).toBeUndefined();
  });

  it('should reorder categories', async () => {
    // Add multiple categories
    const categories: Category[] = [];
    await db.categories.bulkAdd([
      { id: crypto.randomUUID(), name: 'Category A', color: '#FF5733', order: 1 },
      { id: crypto.randomUUID(), name: 'Category B', color: '#C70039', order: 2 },
      { id: crypto.randomUUID(), name: 'Category C', color: '#FFC300', order: 3 },
    ].map(cat => {
      categories.push(cat as Category);
      return cat;
    }));

    const { result } = renderHook(() => useCategories());

    await waitFor(async () => {
      await result.current.load();
    });

    expect(result.current.categories).toHaveLength(3);

    // Reorder: C, A, B
    const reorderedCategories = [
      categories.find(c => c.name === 'Category C')!,
      categories.find(c => c.name === 'Category A')!,
      categories.find(c => c.name === 'Category B')!,
    ];

    await waitFor(async () => {
      await result.current.reorder(reorderedCategories);
    });

    await waitFor(() => {
      expect(result.current.categories[0].name).toBe('Category C');
      expect(result.current.categories[0].order).toBe(1);
      expect(result.current.categories[1].name).toBe('Category A');
      expect(result.current.categories[1].order).toBe(2);
      expect(result.current.categories[2].name).toBe('Category B');
      expect(result.current.categories[2].order).toBe(3);
    });

    // Verify in database
    const dbCategories = await db.categories.orderBy('order').toArray();
    expect(dbCategories[0].name).toBe('Category C');
    expect(dbCategories[1].name).toBe('Category A');
    expect(dbCategories[2].name).toBe('Category B');
  });

  it('should handle errors when adding a category', async () => {
    // Mock DB add to throw an error
    const originalAdd = db.categories.add;
    db.categories.add = vi.fn().mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useCategories());

    let categoryId: string | undefined;
    await waitFor(async () => {
      categoryId = await result.current.add({
        name: 'Test Error',
        color: '#FF5733',
      });
    });

    expect(categoryId).toBeUndefined();
    expect(result.current.error).toBe('Database error');

    // Restore original function
    db.categories.add = originalAdd;
  });

  it('should handle errors when updating a category', async () => {
    const { result } = renderHook(() => useCategories());

    // Add a category first
    let categoryId: string | undefined;
    await waitFor(async () => {
      categoryId = await result.current.add({
        name: 'Test Category',
        color: '#FF5733',
      });
    });

    expect(categoryId).toBeDefined();

    // Mock DB update to throw an error
    const originalUpdate = db.categories.update;
    db.categories.update = vi.fn().mockRejectedValue(new Error('Update error'));

    await waitFor(async () => {
      await result.current.update(categoryId!, {
        name: 'Updated',
      });
    });

    expect(result.current.error).toBe('Update error');

    // Restore original function
    db.categories.update = originalUpdate;
  });

  it('should handle errors when removing a category', async () => {
    const { result } = renderHook(() => useCategories());

    // Add a category first
    let categoryId: string | undefined;
    await waitFor(async () => {
      categoryId = await result.current.add({
        name: 'Test Category',
        color: '#FF5733',
      });
    });

    expect(categoryId).toBeDefined();

    // Mock DB delete to throw an error
    const originalDelete = db.categories.delete;
    db.categories.delete = vi.fn().mockRejectedValue(new Error('Delete error'));

    await waitFor(async () => {
      await result.current.remove(categoryId!);
    });

    expect(result.current.error).toBe('Delete error');

    // Restore original function
    db.categories.delete = originalDelete;
  });

  it('should handle errors when loading categories', async () => {
    // Mock DB toArray to throw an error
    const originalOrderBy = db.categories.orderBy;
    db.categories.orderBy = vi.fn().mockReturnValue({
      toArray: vi.fn().mockRejectedValue(new Error('Load error'))
    });

    const { result } = renderHook(() => useCategories());

    await waitFor(async () => {
      await result.current.load();
    });

    expect(result.current.error).toBe('Load error');
    expect(result.current.loading).toBe(false);

    // Restore original function
    db.categories.orderBy = originalOrderBy;
  });

  it('should handle errors when reordering categories', async () => {
    // Add multiple categories
    const categories: Category[] = [];
    await db.categories.bulkAdd([
      { id: crypto.randomUUID(), name: 'Category A', color: '#FF5733', order: 1 },
      { id: crypto.randomUUID(), name: 'Category B', color: '#C70039', order: 2 },
    ].map(cat => {
      categories.push(cat as Category);
      return cat;
    }));

    const { result } = renderHook(() => useCategories());

    await waitFor(async () => {
      await result.current.load();
    });

    // Mock DB transaction to throw an error
    const originalTransaction = db.transaction;
    db.transaction = vi.fn().mockImplementation(() => {
      throw new Error('Reorder error');
    });

    await waitFor(async () => {
      await result.current.reorder([categories[1], categories[0]]);
    });

    expect(result.current.error).toBe('Reorder error');

    // Restore original function
    db.transaction = originalTransaction;
  });
});