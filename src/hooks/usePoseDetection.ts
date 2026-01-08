import { useEffect, useRef, useState, useCallback } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { getPoseDetector } from '../utils/poseDetector';

export interface UsePoseDetectionOptions {
  enabled: boolean;
  intervalMs?: number; // Detection interval in milliseconds (default: 1000ms)
}

export interface UsePoseDetectionReturn {
  landmarks: NormalizedLandmark[] | null;
  isLoading: boolean;
  error: string | null;
}

export const usePoseDetection = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UsePoseDetectionOptions
): UsePoseDetectionReturn => {
  const { enabled, intervalMs = 1000 } = options;

  const [landmarks, setLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const detectorRef = useRef(getPoseDetector());
  const runDetectionRef = useRef<((timestamp: number) => void) | null>(null);

  const runDetection = useCallback(
    (timestamp: number) => {
      if (!enabled || !videoRef.current) {
        setLandmarks(null);
        return;
      }

      const videoElement = videoRef.current;

      // Throttle detection based on intervalMs
      const timeSinceLastDetection = timestamp - lastDetectionTimeRef.current;
      if (timeSinceLastDetection >= intervalMs) {
        lastDetectionTimeRef.current = timestamp;

        try {
          const result = detectorRef.current.detect(videoElement, timestamp);
          if (result && result.landmarks && result.landmarks.length > 0) {
            // Get the first person's landmarks
            setLandmarks(result.landmarks[0] as NormalizedLandmark[]);
          } else {
            setLandmarks(null);
          }
        } catch (err) {
          console.error('Detection error:', err);
          setError(
            err instanceof Error ? err.message : 'Unknown detection error'
          );
        }
      }

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(
        runDetectionRef.current!
      );
    },
    [enabled, intervalMs, videoRef]
  );

  // Keep the ref updated with the latest callback
  useEffect(() => {
    runDetectionRef.current = runDetection;
  }, [runDetection]);

  // Initialize detector
  useEffect(() => {
    let mounted = true;

    const initializeDetector = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await detectorRef.current.initialize();

        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to initialize pose detection'
          );
          setIsLoading(false);
        }
      }
    };

    initializeDetector();

    return () => {
      mounted = false;
    };
  }, []);

  // Start/stop detection loop
  useEffect(() => {
    if (!enabled || isLoading || error) {
      // Don't call setLandmarks here - let cleanup handle it
      return;
    }

    // Start the detection loop
    animationFrameRef.current = requestAnimationFrame(runDetection);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Clear landmarks when unmounting or stopping
      setLandmarks(null);
    };
  }, [enabled, isLoading, error, runDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    landmarks,
    isLoading,
    error,
  };
};
