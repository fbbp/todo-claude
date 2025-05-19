import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportData, validateImportData, importData } from './export-import';
import { db } from '@/db';
import type { Task, Category, Setting } from '@/db';

vi.mock('@/db', () => ({
  db: {
    tasks: {
      toArray: vi.fn(),
      clear: vi.fn(),
      add: vi.fn(),
    },
    categories: {
      toArray: vi.fn(),
      clear: vi.fn(),
      add: vi.fn(),
    },
    settings: {
      toArray: vi.fn(),
      clear: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    transaction: vi.fn((mode, ...tables) => {
      const callback = tables[tables.length - 1];
      return callback();
    }),
  },
}));

// crypto.randomUUID のモック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mocked-uuid'),
  },
});

describe('export-import utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportData', () => {
    it('should export all data in the correct format', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'pending',
          createdAt: 123,
          updatedAt: 456,
        },
      ];
      
      const mockCategories: Category[] = [
        {
          id: 'cat-1',
          name: 'Work',
          color: '#123456',
          order: 1,
        },
      ];
      
      const mockSettings: Setting[] = [
        { key: 'theme', value: 'dark' },
      ];
      
      vi.mocked(db.tasks.toArray).mockResolvedValue(mockTasks);
      vi.mocked(db.categories.toArray).mockResolvedValue(mockCategories);
      vi.mocked(db.settings.toArray).mockResolvedValue(mockSettings);
      
      const result = await exportData();
      
      expect(result).toEqual({
        version: '1.0.0',
        exportedAt: expect.any(Number),
        data: {
          tasks: mockTasks,
          categories: mockCategories,
          settings: mockSettings,
        },
      });
    });
  });

  describe('validateImportData', () => {
    it('should validate correct export data', () => {
      const validData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        data: {
          tasks: [
            {
              id: 'task-1',
              title: 'Test Task',
              status: 'pending',
              createdAt: 123,
              updatedAt: 456,
            },
          ],
          categories: [
            {
              id: 'cat-1',
              name: 'Work',
              color: '#123456',
              order: 1,
            },
          ],
          settings: [
            { key: 'theme', value: 'dark' },
          ],
        },
      };
      
      expect(validateImportData(validData)).toBe(true);
    });

    it('should reject invalid data', () => {
      const invalidCases = [
        null,
        {},
        { version: '1.0.0' }, // missing data
        { version: '1.0.0', exportedAt: 123 }, // missing data
        { version: '1.0.0', exportedAt: 123, data: {} }, // missing arrays
        {
          version: '1.0.0',
          exportedAt: 123,
          data: {
            tasks: [{ title: 'Test' }], // missing required fields
            categories: [],
            settings: [],
          },
        },
      ];
      
      invalidCases.forEach(data => {
        expect(validateImportData(data)).toBe(false);
      });
    });
  });

  describe('importData', () => {
    it('should import data in replace mode', async () => {
      const importData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        data: {
          tasks: [
            {
              id: 'task-1',
              title: 'Test Task',
              status: 'pending' as const,
              createdAt: 123,
              updatedAt: 456,
            },
          ],
          categories: [
            {
              id: 'cat-1',
              name: 'Work',
              color: '#123456',
              order: 1,
            },
          ],
          settings: [
            { key: 'theme', value: 'dark' },
          ],
        },
      };
      
      const { importData: importFn } = await import('./export-import');
      await importFn(importData, 'replace');
      
      // Clear operationsが呼ばれているか確認
      expect(db.tasks.clear).toHaveBeenCalled();
      expect(db.categories.clear).toHaveBeenCalled();
      expect(db.settings.clear).toHaveBeenCalled();
      
      // データが追加されているか確認
      expect(db.categories.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Work',
          color: '#123456',
          order: 1,
          id: 'mocked-uuid',
        })
      );
      
      expect(db.tasks.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          status: 'pending',
          id: 'mocked-uuid',
        })
      );
      
      expect(db.settings.put).toHaveBeenCalledWith({ key: 'theme', value: 'dark' });
    });

    it('should import data in merge mode', async () => {
      vi.mocked(db.settings.get).mockResolvedValue(null);
      
      const importData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        data: {
          tasks: [],
          categories: [],
          settings: [
            { key: 'newSetting', value: 'newValue' },
          ],
        },
      };
      
      const { importData: importFn } = await import('./export-import');
      await importFn(importData, 'merge');
      
      // Clear operationsが呼ばれていないことを確認
      expect(db.tasks.clear).not.toHaveBeenCalled();
      expect(db.categories.clear).not.toHaveBeenCalled();
      expect(db.settings.clear).not.toHaveBeenCalled();
      
      // 新しい設定のみ追加
      expect(db.settings.add).toHaveBeenCalledWith({ key: 'newSetting', value: 'newValue' });
    });

    it('should throw error for invalid data', async () => {
      const invalidData = { invalid: 'data' };
      
      const { importData: importFn } = await import('./export-import');
      await expect(importFn(invalidData as any)).rejects.toThrow('無効なインポートデータです');
    });
  });
});