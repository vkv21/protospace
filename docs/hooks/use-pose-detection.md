### 1. **File/Module Name**
- `src/hooks/usePoseDetection.ts`

### 2. **Purpose & Role (What does it do?)**
- A React hook that manages the lifecycle and execution of pose detection. It initializes the `PoseDetectorSingleton`, runs a throttled detection loop using `requestAnimationFrame`, and exposes the current landmarks, loading state, and any errors to the UI.

### 3. **Inputs**
- `videoRef`: Ref to the `<video>` element to analyze.
- `options: UsePoseDetectionOptions`:
    - `enabled`: Boolean to turn detection on/off.
    - `intervalMs`: (Optional) Throttling delay in milliseconds (default: 1000ms).

### 4. **Outputs / Returned Value**
- `UsePoseDetectionReturn`:
    - `landmarks`: `NormalizedLandmark[] | null` (the 33 detected pose points).
    - `isLoading`: Boolean (true while model is loading).
    - `error`: String | null.

### 5. **Key Logic & Flow**
- **Initialization**: Calls `detector.initialize()` on mount. Uses a `mounted` flag to prevent state updates after unmount.
- **Throttled Loop**:
    - Uses `requestAnimationFrame` for smooth timing.
    - Compares current `timestamp` against `lastDetectionTimeRef` to ensure detection only runs every `intervalMs`.
    - Updates `landmarks` state with the first detected person's points.
- **Ref-Based Stability**: Uses a ref (`runDetectionRef`) to store the latest `runDetection` callback, allowing the `requestAnimationFrame` loop to always access the freshest scope without needing to be restarted on every render.

### 6. **External Dependencies**
- `../utils/poseDetector`: The underlying singleton wrapper for MediaPipe.
- `@mediapipe/tasks-vision`: For types.

### 7. **Integration Points**
- Used by `VideoCapture.tsx`.
- Landmarks are passed to `usePresenceTracking` for higher-level analysis.

### 8. **Edge Cases & Notable Behaviors**
- **Lifecycle Safety**: Thoroughly cancels animation frames and sets landmarks to null on unmount or when disabled.
- **Throttling**: Defaulted to 1Hz (1000ms) to save CPU/battery, as presence detection doesn't require high-frequency updates.
- **Error Handling**: Catches initialization and per-frame detection errors, reporting them to the UI state.
- **Microtasks**: Effectively uses `requestAnimationFrame` to ensure detection happens outside of the React render cycle, preventing blocking.

### 9. **Tests (if any)**
- Not found.

### 10. **Questions / TODOs for Further Study**
- Should we allow dynamic changes to `intervalMs` while running?
- Could we use a Web Worker for detection to offload the main thread entirely?
- The singleton `detector` is never explicitly `close()`'d by the hook—should it be?
