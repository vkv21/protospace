import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionTimer } from '../useSessionTimer';
import type { PresenceSession } from '../../types/stats';

describe('useSessionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null when no session provided', () => {
    const { result } = renderHook(() => useSessionTimer(null));
    
    expect(result.current).toBeNull();
  });

  it('should return null for sessions with end timestamp', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    const endedSession: PresenceSession = {
      id: 'session_1',
      start: now - 60000, // Started 1 minute ago
      end: now, // Ended now
      presence: [],
    };
    
    const { result } = renderHook(() => useSessionTimer(endedSession));
    
    expect(result.current).toBeNull();
  });

  it('should calculate initial elapsed time for active session', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    const activeSession: PresenceSession = {
      id: 'session_1',
      start: now - 5000, // Started 5 seconds ago
      end: null, // Still active
      presence: [],
    };
    
    const { result } = renderHook(() => useSessionTimer(activeSession));
    
    expect(result.current).toBe(5);
  });

  it('should update elapsed time every second', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    const activeSession: PresenceSession = {
      id: 'session_1',
      start: now - 5000, // Started 5 seconds ago
      end: null,
      presence: [],
    };
    
    const { result } = renderHook(() => useSessionTimer(activeSession));
    
    // Initial value
    expect(result.current).toBe(5);
    
    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Should now show 8 seconds
    expect(result.current).toBe(8);
    
    // Advance another 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    // Should now show 10 seconds
    expect(result.current).toBe(10);
  });

  it('should return null when session ends', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    const activeSession: PresenceSession = {
      id: 'session_1',
      start: now - 5000,
      end: null,
      presence: [],
    };
    
    const { result, rerender } = renderHook(
      ({ session }) => useSessionTimer(session),
      { initialProps: { session: activeSession } }
    );
    
    // Initially should show 5 seconds
    expect(result.current).toBe(5);
    
    // End the session
    const endedSession: PresenceSession = {
      ...activeSession,
      end: now,
    };
    
    rerender({ session: endedSession });
    
    // Should now return null
    expect(result.current).toBeNull();
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    
    const activeSession: PresenceSession = {
      id: 'session_1',
      start: Date.now() - 5000,
      end: null,
      presence: [],
    };
    
    const { unmount } = renderHook(() => useSessionTimer(activeSession));
    
    // Unmount the hook
    unmount();
    
    // Should have called clearInterval
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should recalculate when session changes', () => {
    const now = Date.now();
    vi.setSystemTime(now);
    
    const session1: PresenceSession = {
      id: 'session_1',
      start: now - 10000, // Started 10 seconds ago
      end: null,
      presence: [],
    };
    
    const { result, rerender } = renderHook(
      ({ session }) => useSessionTimer(session),
      { initialProps: { session: session1 } }
    );
    
    // Should show 10 seconds for first session
    expect(result.current).toBe(10);
    
    // Create a new session that just started
    const session2: PresenceSession = {
      id: 'session_2',
      start: now, // Starting now
      end: null,
      presence: [],
    };
    
    rerender({ session: session2 });
    
    // Should reset to 0 for new session
    expect(result.current).toBe(0);
    
    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Should now show 3 seconds for new session
    expect(result.current).toBe(3);
  });
});
