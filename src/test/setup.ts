import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// Mock crypto.randomUUID for Node.js environment
const global = globalThis as { crypto?: { randomUUID?: () => string } };
if (!global.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c == 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    }
  });
}

// Mock ResizeObserver for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};