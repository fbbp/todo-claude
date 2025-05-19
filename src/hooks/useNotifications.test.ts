import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import { useServiceWorker } from './useServiceWorker';

// Mock dependencies
vi.mock('./useServiceWorker');

vi.mock('../store/useSettings', () => ({
  useSettings: () => ({
    notifyBeforeMin: 15,
    snoozeMin: 5,
  }),
}));

describe('useNotifications', () => {
  const mockNotification = {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(() => Promise.resolve('granted' as NotificationPermission)),
  };

  beforeEach(() => {
    // Mock Notification API
    Object.defineProperty(global, 'Notification', {
      writable: true,
      value: mockNotification,
    });
    
    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    
    // Default mock for useServiceWorker
    vi.mocked(useServiceWorker).mockReturnValue({
      registration: null,
      isOffline: false,
      needRefresh: false,
      offlineReady: false,
      reloadPage: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with current notification permission', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.permission).toBe('default');
  });

  it('should request permission when asked', async () => {
    const { result } = renderHook(() => useNotifications());
    
    await act(async () => {
      const permission = await result.current.requestPermission();
      expect(permission).toBe('granted');
    });
    
    expect(mockNotification.requestPermission).toHaveBeenCalled();
  });

  it('should schedule notification for task with due date', () => {
    // Set permission to granted before creating the hook
    mockNotification.permission = 'granted';
    
    const mockPostMessage = vi.fn();
    const mockServiceWorker = {
      active: {
        postMessage: mockPostMessage,
      } as any,
    } as ServiceWorkerRegistration;
    
    vi.mocked(useServiceWorker).mockReturnValue({
      registration: mockServiceWorker,
      isOffline: false,
      needRefresh: false,
      offlineReady: false,
      reloadPage: vi.fn(),
    });

    const { result } = renderHook(() => useNotifications());
    
    const mockTask = {
      id: 'test-task',
      title: 'Test Task',
      dueAt: Date.now() + 30 * 60 * 1000, // 30 minutes from now
      status: 'pending' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    result.current.scheduleNotification(mockTask);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'SCHEDULE_NOTIFICATION',
      payload: {
        taskId: mockTask.id,
        title: mockTask.title,
        dueAt: mockTask.dueAt - (15 * 60 * 1000), // 15 minutes before due
      },
    });
  });

  it('should cancel notification for task', () => {
    const mockPostMessage = vi.fn();
    vi.mocked(useServiceWorker).mockReturnValue({
      registration: {
        active: {
          postMessage: mockPostMessage,
        } as any,
      } as ServiceWorkerRegistration,
      isOffline: false,
      needRefresh: false,
      offlineReady: false,
      reloadPage: vi.fn(),
    });

    const { result } = renderHook(() => useNotifications());
    
    result.current.cancelNotification('test-task');

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'CANCEL_NOTIFICATION',
      taskId: 'test-task',
    });
  });

  it('should snooze notification for task', () => {
    const mockPostMessage = vi.fn();
    vi.mocked(useServiceWorker).mockReturnValue({
      registration: {
        active: {
          postMessage: mockPostMessage,
        } as any,
      } as ServiceWorkerRegistration,
      isOffline: false,
      needRefresh: false,
      offlineReady: false,
      reloadPage: vi.fn(),
    });

    const { result } = renderHook(() => useNotifications());
    const mockTask = {
      id: 'test-task',
      title: 'Test Task',
      dueAt: Date.now() + 30 * 60 * 1000,
      status: 'pending' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    result.current.snoozeNotification(mockTask);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'SCHEDULE_NOTIFICATION',
      payload: {
        taskId: mockTask.id,
        title: mockTask.title,
        dueAt: expect.any(Number), // Now + 5 minutes
      },
    });
  });
});