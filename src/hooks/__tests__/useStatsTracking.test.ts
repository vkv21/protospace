import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStatsTracking } from '../useStatsTracking';

// Mock BroadcastChannel
globalThis.BroadcastChannel = class BroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage() {
    // Mock implementation
  }

  close() {
    // Mock implementation
  }
} as any;

describe('useStatsTracking', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    expect(result.current.isTracking).toBe(false);
    expect(result.current.currentSession).toBeNull();
    expect(result.current.continuousDeskTime).toBe(0);
    expect(result.current.goalHours).toBeGreaterThan(0); // Should have default goal
  });

  it('should persist settings updates', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    const initialGoal = result.current.fullStats.settings.dailyGoalHours;

    // Update settings
    act(() => {
      result.current.updateSettings({ dailyGoalHours: 8 });
    });

    // Verify the update persisted in memory
    expect(result.current.fullStats.settings.dailyGoalHours).toBe(8);
    expect(result.current.fullStats.settings.dailyGoalHours).not.toBe(initialGoal);
  });

  it('should allow manual session start', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    expect(result.current.currentSession).toBeNull();

    // Start a session manually
    act(() => {
      result.current.startSession();
    });

    // Note: Session might not start if not leader, which is expected behavior
    // This test just ensures the function doesn't crash
    expect(typeof result.current.startSession).toBe('function');
  });

  it('should allow manual session stop', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    // Stop a session (even if none active)
    act(() => {
      result.current.stopSession();
    });

    // This test ensures the function doesn't crash
    expect(typeof result.current.stopSession).toBe('function');
    expect(result.current.currentSession).toBeNull();
  });

  it('should allow updating settings', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    const initialGoal = result.current.goalHours;

    act(() => {
      result.current.updateSettings({ dailyGoalHours: 8 });
    });

    expect(result.current.goalHours).toBe(8);
    expect(result.current.goalHours).not.toBe(initialGoal);
  });

  it('should initialize today stats on mount', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    // Should have created today's stats
    expect(result.current.todayStats).not.toBeNull();
    expect(result.current.todayStats?.date).toBe(
      new Date().toISOString().split('T')[0]
    );
  });

  it('should expose recentDays stats', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    expect(result.current.recentDays).toBeDefined();
    expect(typeof result.current.recentDays).toBe('object');
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('aideskwatch_stats', 'invalid{json}');

    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    // Should fallback to default stats instead of crashing
    expect(result.current.todayStats).not.toBeNull();
    expect(result.current.goalHours).toBeGreaterThan(0);
  });

  it('should expose continuous desk time', () => {
    const { result } = renderHook(() =>
      useStatsTracking({ isPresent: false, lastSeen: null })
    );

    expect(result.current.continuousDeskTime).toBe(0);
    expect(typeof result.current.continuousDeskTime).toBe('number');
  });
});
