import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePresenceTracking } from '../usePresenceTracking';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

describe('usePresenceTracking', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with not present state', () => {
    const { result } = renderHook(() =>
      usePresenceTracking(null, { hysteresisFrames: 2 })
    );

    expect(result.current.isPresent).toBe(false);
    expect(result.current.confidence).toBe(0);
    expect(result.current.lastSeen).toBeNull();
    expect(result.current.deskTime).toBe(0);
  });

  it('should not change state with null landmarks', () => {
    const { result } = renderHook(() =>
      usePresenceTracking(null, { hysteresisFrames: 2 })
    );

    expect(result.current.isPresent).toBe(false);
    expect(result.current.confidence).toBe(0);
  });

  it('should update confidence when landmarks are provided', async () => {
    // Create proper mock landmarks array (MediaPipe returns 33 landmarks)
    const createMockLandmarks = (): NormalizedLandmark[] => {
      const landmarks: NormalizedLandmark[] = Array(33)
        .fill(null)
        .map(() => ({ x: 0, y: 0, z: 0, visibility: 0 }));

      // Key landmarks that indicate presence
      landmarks[0] = { x: 0.5, y: 0.3, z: 0, visibility: 0.8 }; // nose
      landmarks[11] = { x: 0.4, y: 0.5, z: 0, visibility: 0.9 }; // left shoulder
      landmarks[12] = { x: 0.6, y: 0.5, z: 0, visibility: 0.9 }; // right shoulder

      return landmarks;
    };

    const mockLandmarks = createMockLandmarks();

    const { result, rerender } = renderHook(
      ({ landmarks }) => usePresenceTracking(landmarks, { hysteresisFrames: 1 }),
      { initialProps: { landmarks: null as NormalizedLandmark[] | null } }
    );

    // Initially not present
    expect(result.current.isPresent).toBe(false);
    expect(result.current.confidence).toBe(0);

    // After providing landmarks, confidence should increase
    rerender({ landmarks: mockLandmarks });

    await waitFor(
      () => {
        expect(result.current.confidence).toBeGreaterThan(0);
      },
      { timeout: 1000 }
    );
  });

  it('should load persisted desk time from localStorage', () => {
    const mockDeskTime = 3600; // 1 hour
    const today = new Date().toDateString();

    localStorage.setItem(
      'commitspace_presence',
      JSON.stringify({ deskTime: mockDeskTime, date: today })
    );
    localStorage.setItem('commitspace_last_date', today);

    const { result } = renderHook(() => usePresenceTracking(null));

    expect(result.current.deskTime).toBe(mockDeskTime);
  });

  it('should reset desk time if date has changed', () => {
    const mockDeskTime = 3600;
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    localStorage.setItem(
      'commitspace_presence',
      JSON.stringify({ deskTime: mockDeskTime, date: yesterday })
    );
    localStorage.setItem('commitspace_last_date', yesterday);

    const { result } = renderHook(() => usePresenceTracking(null));

    // Should reset to 0 because it's a new day
    expect(result.current.deskTime).toBe(0);
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('commitspace_presence', 'invalid{json}');

    const { result } = renderHook(() => usePresenceTracking(null));

    // Should fallback to 0 instead of crashing
    expect(result.current.deskTime).toBe(0);
  });

  it('should update lastSeen when presence is detected', async () => {
    // Create proper mock landmarks
    const createMockLandmarks = (): NormalizedLandmark[] => {
      const landmarks: NormalizedLandmark[] = Array(33)
        .fill(null)
        .map(() => ({ x: 0, y: 0, z: 0, visibility: 0 }));

      landmarks[0] = { x: 0.5, y: 0.3, z: 0, visibility: 0.8 }; // nose
      landmarks[11] = { x: 0.4, y: 0.5, z: 0, visibility: 0.9 }; // left shoulder
      landmarks[12] = { x: 0.6, y: 0.5, z: 0, visibility: 0.9 }; // right shoulder

      return landmarks;
    };

    const mockLandmarks = createMockLandmarks();

    const { result, rerender } = renderHook(
      ({ landmarks }) => usePresenceTracking(landmarks, { hysteresisFrames: 1 }),
      { initialProps: { landmarks: null as NormalizedLandmark[] | null } }
    );

    expect(result.current.lastSeen).toBeNull();

    // Provide landmarks
    rerender({ landmarks: mockLandmarks });

    await waitFor(
      () => {
        expect(result.current.lastSeen).not.toBeNull();
        expect(result.current.lastSeen).toBeInstanceOf(Date);
      },
      { timeout: 1000 }
    );
  });
});
