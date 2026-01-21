import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Draws pose landmarks on a canvas element
 * @param ctx Canvas 2D rendering context
 * @param landmarks Array of pose landmarks with normalized coordinates (0-1)
 * @param canvasWidth Width of the canvas in pixels
 * @param canvasHeight Height of the canvas in pixels
 */
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number
): void {
  landmarks.forEach((landmark, index) => {
    const x = landmark.x * canvasWidth;
    const y = landmark.y * canvasHeight;
    const visibility = landmark.visibility ?? 1;

    // Only draw landmarks with sufficient visibility
    if (visibility > 0.5) {
      // Draw circle
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(0, 255, 0, ${visibility})`;
      ctx.fill();

      // Draw white border for better visibility
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw landmark index label
      ctx.fillStyle = 'white';
      ctx.font = '10px sans-serif';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 3;
      ctx.fillText(index.toString(), x + 6, y + 3);
      ctx.shadowBlur = 0;
    }
  });
}

/**
 * MediaPipe pose landmark connections for drawing skeleton
 * Each pair represents a connection between two landmark indices
 */
const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  // Shoulders
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  // Right arm
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  // Torso
  [11, 23],
  [12, 24],
  [23, 24],
  // Left leg
  [23, 25],
  [25, 27],
  [27, 29],
  [27, 31],
  [29, 31],
  // Right leg
  [24, 26],
  [26, 28],
  [28, 30],
  [28, 32],
  [30, 32],
];

/**
 * Draws skeleton connections between pose landmarks
 * @param ctx Canvas 2D rendering context
 * @param landmarks Array of pose landmarks with normalized coordinates (0-1)
 * @param canvasWidth Width of the canvas in pixels
 * @param canvasHeight Height of the canvas in pixels
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
  ctx.lineWidth = 2;

  POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    if (startIdx >= landmarks.length || endIdx >= landmarks.length) {
      return;
    }

    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    const startVisibility = start.visibility ?? 1;
    const endVisibility = end.visibility ?? 1;

    // Only draw connection if both landmarks are visible
    if (startVisibility > 0.5 && endVisibility > 0.5) {
      const startX = start.x * canvasWidth;
      const startY = start.y * canvasHeight;
      const endX = end.x * canvasWidth;
      const endY = end.y * canvasHeight;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });
}
