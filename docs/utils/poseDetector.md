### 1. **File/Module Name**
- `src/utils/poseDetector.ts`

### 2. **Purpose & Role (What does it do?)**
- A singleton utility class that wraps the MediaPipe `PoseLandmarker`. It manages the lifecycle (initialization, detection, and cleanup) of the pose detection model used to track user presence at their desk.

### 3. **Inputs**
- `initialize()`: None (loads WASM and model assets from CDN).
- `detect(videoElement: HTMLVideoElement, timestamp: number)`: Takes a live video element and the current frame timestamp.

### 4. **Outputs / Returned Value**
- `PoseDetectionResult | null`: Returns an object containing `landmarks` (2D) and `worldLandmarks` (3D) if a person is detected with sufficient confidence, otherwise `null`.

### 5. **Key Logic & Flow**
- **Singleton Pattern**: Ensures only one instance of the landmarker exists to save memory and processing power.
- **Async Initialization**: Uses `FilesetResolver` to load MediaPipe WASM and fetches the `pose_landmarker_lite` model.
- **Quality Filtering**: In the `detect` method, it checks the visibility scores of key landmarks (nose, left shoulder, right shoulder). If visibility is below thresholds (0.5 for nose, 0.6 for shoulders), it rejects the detection as a "false positive" or low quality.
- **State Guarding**: Checks `videoElement.readyState` and dimensions before attempting detection to avoid errors.

### 6. **External Dependencies**
- `@mediapipe/tasks-vision`: The core MediaPipe library for computer vision tasks.
- Google CDNs: For WASM and model files.

### 7. **Integration Points**
- Used primarily by the `usePoseDetection` hook to process webcam frames.

### 8. **Edge Cases & Notable Behaviors**
- **Concurrency**: The `initialize` method handles multiple concurrent calls by returning the same initialization promise.
- **Resource Management**: The `close()` method allows for explicit release of MediaPipe resources.
- **GPU Acceleration**: Configured to use 'GPU' delegate for better performance.

### 9. **Tests (if any)**
- Not explicitly found in the provided file list (check `src/utils/__tests__/`).

### 10. **Questions / TODOs for Further Study**
- Should we allow switching between `lite`, `full`, and `heavy` models based on device performance?
- How does the GPU delegate behave on older browsers or machines without hardware acceleration?
