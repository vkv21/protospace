import { useEffect, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { drawLandmarks, drawSkeleton } from '../utils/landmarkDrawer';

interface UseCanvasOverlayOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
  enabled: boolean;
}

/**
 * Custom hook that manages canvas overlay for visualizing pose landmarks
 * Syncs canvas dimensions with video element and draws landmarks when enabled
 */
export const useCanvasOverlay = ({
  canvasRef,
  videoRef,
  landmarks,
  enabled,
}: UseCanvasOverlayOptions): void => {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Sync canvas dimensions with video element
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) {
      return;
    }

    const updateCanvasDimensions = () => {
      // Match canvas resolution to video element display size
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    };

    // Initial size sync
    updateCanvasDimensions();

    // Watch for video element size changes
    resizeObserverRef.current = new ResizeObserver(updateCanvasDimensions);
    resizeObserverRef.current.observe(video);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [canvasRef, videoRef]);

  // Draw landmarks on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx || !enabled || !landmarks || landmarks.length === 0) {
      // Clear canvas if disabled or no landmarks
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    // Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw skeleton connections first (so they appear behind landmarks)
    drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

    // Draw landmark points with labels
    drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
  }, [canvasRef, landmarks, enabled]);
};
