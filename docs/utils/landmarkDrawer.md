### 1. **File/Module Name**
- `src/utils/landmarkDrawer.ts`

### 2. **Purpose & Role (What does it do?)**
- A visualization utility that draws pose landmarks and skeleton connections on an HTML5 Canvas. It provides real-time visual feedback to the user, showing how the system is perceiving their body position.

### 3. **Inputs**
- `drawLandmarks/drawSkeleton(ctx, landmarks, width, height)`:
    - `ctx`: CanvasRenderingContext2D.
    - `landmarks`: `NormalizedLandmark[]` from MediaPipe.
    - `canvasWidth/Height`: Dimensions of the canvas.

### 4. **Outputs / Returned Value**
- Directly renders to the provided canvas context (void return).

### 5. **Key Logic & Flow**
- **Normalized to Pixel Mapping**: Multiplies normalized coordinates (0-1) by the canvas width and height to find pixel coordinates.
- **Visibility Filtering**: Only draws landmarks or connections if their visibility score is greater than 0.5.
- **Skeleton Mapping**: Uses a predefined `POSE_CONNECTIONS` array to draw lines between specific landmark pairs (e.g., [11, 13] for left shoulder to left elbow).
- **Styling**: Uses semi-transparent green (`rgba(0, 255, 0, 0.6)`) for a "high-tech" look, with white labels for index identification.

### 6. **External Dependencies**
- `@mediapipe/tasks-vision`: For the `NormalizedLandmark` type.

### 7. **Integration Points**
- Primarily used by the `useCanvasOverlay` hook.

### 8. **Edge Cases & Notable Behaviors**
- **Safety Checks**: Validates index bounds against the `landmarks` array length before drawing connections.
- **Shadows**: Applies a 3px black shadow to text labels to ensure readability against bright or busy video backgrounds.

### 9. **Tests (if any)**
- Not found. (Visual utilities are often manually verified, but logic could be tested with canvas mocks).

### 10. **Questions / TODOs for Further Study**
- Should the colors be configurable (e.g., red when user is slouching)?
- Could we optimize performance by using `OffscreenCanvas` or path batching for large skeletons?
