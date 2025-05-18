import { create } from 'zustand';
import { db } from '../db';
import type { Category } from '../db';

interface CategoryStore {
  categories: Category[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (category: Partial<Category>) => Promise<string | undefined>;
  update: (id: string, updates: Partial<Category>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reorder: (categories: Category[]) => Promise<void>;
}

export const useCategories = create<CategoryStore>((set, get) => ({
  categories: [],
  loading: false,
  error: null,
  
  load: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await db.categories.orderBy('order').toArray();
      set({ categories, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  add: async (draft) => {
    try {
      const id = crypto.randomUUID();
      const maxOrder = Math.max(...get().categories.map(c => c.order), 0);
      const category: Category = {
        id,
        name: draft.name || '',
        color: draft.color || '#6366F1',
        order: draft.order ?? maxOrder + 1,
      };
      
      await db.categories.add(category);
      set({ categories: [...get().categories, category].sort((a, b) => a.order - b.order) });
      
      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      return undefined;
    }
  },
  
  update: async (id, updates) => {
    try {
      await db.categories.update(id, updates);
      
      const updatedCategories = get().categories.map(category => 
        category.id === id 
          ? { ...category, ...updates } 
          : category
      ).sort((a, b) => a.order - b.order);
      
      set({ categories: updatedCategories });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  remove: async (id) => {
    try {
      await db.categories.delete(id);
      set({ categories: get().categories.filter(category => category.id !== id) });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  reorder: async (categories) => {
    try {
      const updates = categories.map((cat, index) => ({ 
        ...cat, 
        order: index + 1 
      }));
      
      await db.transaction('rw', db.categories, async () => {
        for (const cat of updates) {
          await db.categories.update(cat.id!, { order: cat.order });
        }
      });
      
      set({ categories: updates });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
