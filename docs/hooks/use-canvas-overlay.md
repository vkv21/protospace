### 1. **File/Module Name**
- `src/hooks/useCanvasOverlay.ts`

### 2. **Purpose & Role (What does it do?)**
- Orchestrates the rendering of pose landmarks over a video stream. It handles canvas resizing to match the video element's display size and triggers the drawing logic from `landmarkDrawer.ts` whenever new landmarks are received.

### 3. **Inputs**
- `options: UseCanvasOverlayOptions`:
    - `canvasRef`: Ref to the target `<canvas>` element.
    - `videoRef`: Ref to the source `<video>` element.
    - `landmarks`: `NormalizedLandmark[] | null` from the detector.
    - `enabled`: Boolean to toggle the visualization.

### 4. **Outputs / Returned Value**
- No return value (void). Directly manages canvas side effects.

### 5. **Key Logic & Flow**
- **Dimension Syncing**: Uses a `ResizeObserver` on the `video` element to ensure the `canvas` resolution (`width`/`height` properties) always matches the CSS display size of the video.
- **Rendering Loop**: When `landmarks` or `enabled` status changes:
    1.  Clears the entire canvas.
    2.  If enabled and landmarks exist, calls `drawSkeleton` followed by `drawLandmarks`.
- **Cleanup**: Disconnects the `ResizeObserver` when the hook unmounts.

### 6. **External Dependencies**
- `../utils/landmarkDrawer`: For the actual drawing primitive functions.
- `React`: For `useEffect` and `useRef`.

### 7. **Integration Points**
- Used by the `VideoCapture.tsx` component to provide the skeleton overlay.

### 8. **Edge Cases & Notable Behaviors**
- **Overlay Transparency**: Relies on the CSS positioning of the canvas (usually `absolute` or `grid`) to sit on top of the video.
- **Layering**: Draws the skeleton *before* the landmarks so that joint points appear on top of the connecting lines.
- **Micro-resizing**: Handles window resizing and layout shifts via `ResizeObserver` to maintain perfect alignment.

### 9. **Tests (if any)**
- Not found.

### 10. **Questions / TODOs for Further Study**
- Should we throttle the drawing if the frame rate is too high?
- Can we handle flipped/mirrored video streams automatically if the user flips the webcam?
