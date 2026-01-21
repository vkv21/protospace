import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// Mock Notification API
globalThis.Notification = {
  permission: 'default',
  requestPermission: vi.fn(() => Promise.resolve('granted')),
} as unknown as typeof Notification;

// Mock BroadcastChannel
globalThis.BroadcastChannel = vi.fn().mockImplementation((name: string) => ({
  name,
  postMessage: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof BroadcastChannel;

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
