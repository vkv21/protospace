### 1. **File/Module Name**
- `src/hooks/useWebcam.ts`

### 2. **Purpose & Role (What does it do?)**
- Provides an interface for accessing and managing the user's webcam stream. It handles permission requests, stream initialization, and resource cleanup.

### 3. **Inputs**
- None (Directly uses browser `navigator.mediaDevices` API).

### 4. **Outputs / Returned Value**
- `UseWebcamReturn`:
    - `videoRef`: Ref to be attached to a `<video>` element.
    - `isCapturing`: Boolean state of the stream.
    - `error`: Error message (e.g., "Permission denied").
    - `startCapture`: Function to request permissions and start the stream.
    - `stopCapture`: Function to stop all tracks and clear the stream.

### 5. **Key Logic & Flow**
- **Stream Acquisition**: Calls `getUserMedia` with a preferred resolution of 640x480 and `facingMode: 'user'`. Audio is explicitly disabled.
- **Resource Management**: Tracks the `MediaStream` in a ref (`streamRef`) to ensure all tracks can be stopped during cleanup.
- **Cleanup**: Automatically calls `stopCapture` on component unmount via `useEffect`.
- **Ref Binding**: Directly assigns the acquired `stream` to the `srcObject` of the `videoRef.current`.

### 6. **External Dependencies**
- `MediaDevices` / `getUserMedia` browser APIs.

### 7. **Integration Points**
- Used by `VideoCapture.tsx` as the source of video data for the pose detector.

### 8. **Edge Cases & Notable Behaviors**
- **Permission Denial**: Catches and translates `getUserMedia` errors into a human-readable `error` state.
- **Ideal Resolution**: Requests 640x480 as "ideal"—the browser will provide the closest match available on the hardware.
- **Facing Mode**: Hardcoded to `user` for desk-presence tracking (assuming a front-facing camera).

### 9. **Tests (if any)**
- Not found. (Requires mocking browser Media APIs).

### 10. **Questions / TODOs for Further Study**
- Should we allow the user to select from multiple cameras?
- Should we support higher resolutions for better detection accuracy in poor lighting?
- How does the hook behave if the user manually revokes permissions via the browser UI while capturing?
