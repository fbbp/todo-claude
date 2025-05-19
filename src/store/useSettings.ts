import { create } from 'zustand';
import { db } from '../db';

type Theme = 'light' | 'dark';

interface SettingsStore {
  theme: Theme;
  notifyBeforeMin: number;
  snoozeMin: number;
  loading: boolean;
  error: string | null;
  settings: Record<string, any>;
  load: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setNotifyBeforeMin: (minutes: number) => Promise<void>;
  setSnoozeMin: (minutes: number) => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<void>;
}

export const useSettings = create<SettingsStore>((set) => ({
  theme: 'light',
  notifyBeforeMin: 15,
  snoozeMin: 5,
  loading: false,
  error: null,
  settings: {},
  
  load: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await db.settings.toArray();
      const settingsMap = settings.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>);
      
      set({
        theme: (settingsMap.theme as Theme) || 'light',
        notifyBeforeMin: (settingsMap.notifyBeforeMin as number) || 15,
        snoozeMin: (settingsMap.snoozeMin as number) || 5,
        settings: settingsMap,
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  setTheme: async (theme) => {
    try {
      await db.settings.put({ key: 'theme', value: theme });
      set({ theme });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  setNotifyBeforeMin: async (minutes) => {
    try {
      await db.settings.put({ key: 'notifyBeforeMin', value: minutes });
      set({ notifyBeforeMin: minutes });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  setSnoozeMin: async (minutes) => {
    try {
      await db.settings.put({ key: 'snoozeMin', value: minutes });
      set({ snoozeMin: minutes });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  updateSetting: async (key, value) => {
    try {
      await db.settings.put({ key, value });
      set((state) => ({
        settings: { ...state.settings, [key]: value },
        ...(key === 'theme' && { theme: value }),
        ...(key === 'notifyBeforeMin' && { notifyBeforeMin: value }),
        ...(key === 'snoozeMin' && { snoozeMin: value }),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
