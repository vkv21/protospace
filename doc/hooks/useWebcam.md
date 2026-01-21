# useWebcam Hook

> **File:** `/src/hooks/useWebcam.ts`
> **Last Updated:** 2026-01-21
> **Tags:** `#hooks` `#camera` `#webcam` `#media`
> **Complexity:** Low
> **Lines:** 72

---

## 1. File/Module Name

`useWebcam.ts` - Webcam access and MediaStream lifecycle management hook

## 2. Purpose & Role

Manages webcam access through the browser's MediaDevices API. Handles camera permission requests, video stream setup, and proper cleanup of media resources. Provides a simple interface for starting and stopping camera capture.

## 3. Inputs

**Hook Parameters:** None

**External Dependencies:**
- Browser's `navigator.mediaDevices.getUserMedia()` API
- Requires user permission for camera access

## 4. Outputs / Returned Value

```typescript
{
  videoRef: React.RefObject<HTMLVideoElement>,  // Ref for <video> element
  isCapturing: boolean,                          // Camera active state
  error: string | null,                          // Error message if failed
  startCapture: () => Promise<void>,             // Start camera function
  stopCapture: () => void                        // Stop camera function
}
```

## 5. Key Logic & Flow

### Initialization
```
1. Create videoRef (for <video> element attachment)
2. Create streamRef (internal MediaStream storage)
3. Initialize state: isCapturing = false, error = null
```

### Starting Camera (`startCapture`)
```
1. Clear any previous errors
2. Call navigator.mediaDevices.getUserMedia()
   - Request video: 640x480 ideal resolution
   - facingMode: 'user' (front-facing camera)
   - audio: false (no microphone)
3. Browser prompts user for camera permission
4. On success:
   - Store stream in streamRef.current
   - Attach stream to video element (videoRef.current.srcObject)
   - Set isCapturing = true
5. On failure:
   - Extract error message
   - Set error state
   - Log to console
```

### Stopping Camera (`stopCapture`)
```
1. If stream exists:
   - Call track.stop() on all media tracks
   - Clear streamRef.current
2. Detach stream from video element
3. Set isCapturing = false
```

### Cleanup (on unmount)
```
useEffect cleanup calls stopCapture()
→ Ensures no memory leaks from active streams
```

## 6. External Dependencies

**React Hooks:**
- `useRef` - Video element and stream references
- `useState` - Capturing state and error state
- `useCallback` - Memoized start/stop functions
- `useEffect` - Cleanup on unmount

**Browser APIs:**
- `navigator.mediaDevices.getUserMedia()` - Camera access
- `MediaStream` - Video stream object
- `MediaStreamTrack` - Individual camera track control

**Type Definitions:**
- Custom `UseWebcamReturn` interface

## 7. Integration Points

### Used By:
- [[components/VideoCapture|VideoCapture]] (src/components/VideoCapture.tsx:55) - Main component

### Consumed By (Downstream):
- [[hooks/usePoseDetection|usePoseDetection]] - Receives `videoRef` as input
- [[hooks/useCanvasOverlay|useCanvasOverlay]] - Receives `videoRef` for canvas sizing

### Data Flow:
```
useWebcam (videoRef)
    ↓
usePoseDetection (uses videoRef for AI detection)
    ↓
usePresenceTracking (receives landmarks)
```

## 8. Edge Cases & Notable Behaviors

### Permission Handling
- **First time:** Browser shows permission prompt
- **Denied:** Error state set with message "Failed to access webcam"
- **Blocked:** getUserMedia throws NotAllowedError

### Error Messages
```typescript
// Error caught and converted to user-friendly string
err instanceof Error ? err.message : 'Failed to access webcam'
```

### Stream Cleanup
- Properly stops all tracks on unmount
- Prevents camera staying on after component unmounts
- Handles cases where video element is already unmounted

### Multiple Calls
- Calling `startCapture` while already capturing: No guard, will request new stream
- Calling `stopCapture` when not capturing: Safe (no-op)

### Resolution Fallback
- Requests **ideal** 640x480 (not required)
- Browser may provide different resolution if unavailable
- Front-facing camera preferred (`facingMode: 'user'`)

## 9. Tests (if any)

**Current Status:** No dedicated tests

**Suggested Tests:**
- Mock getUserMedia success/failure
- Test startCapture sets isCapturing correctly
- Test stopCapture cleans up stream
- Test error handling on permission denial
- Test cleanup on unmount

**Testing Challenges:**
- Requires mocking `navigator.mediaDevices`
- Difficult to test actual camera hardware
- Can test state management and error handling

## 10. Questions / TODOs for Further Study

### Open Questions
1. **Multiple starts:** Should we prevent starting while already capturing?
2. **Resolution handling:** Should we expose resolution configuration?
3. **Device selection:** Should we allow selecting specific camera device?
4. **Error recovery:** Should we implement automatic retry logic?

### Potential Improvements
- Add device enumeration (list available cameras)
- Add camera switching (front/back on mobile)
- Add resolution selection options
- Add constraints validation
- Add loading state during permission request

### Design Decisions
- **Why no audio?** Privacy-focused, only need video for pose detection
- **Why 640x480?** Balance between quality and performance for AI model
- **Why useCallback?** Prevents unnecessary re-creation of functions
- **Why cleanup in useEffect?** Ensures proper resource cleanup on unmount

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[hooks/usePoseDetection|usePoseDetection]] - Depends on videoRef from this hook
- [[components/VideoCapture|VideoCapture]] - Uses this hook
- [[features/CAMERA-MANAGEMENT|Camera Management Feature]]

## File Location

```
/src/hooks/useWebcam.ts
```

## Quick Reference

**Start Camera:**
```typescript
const { videoRef, isCapturing, startCapture } = useWebcam();
await startCapture();
```

**Stop Camera:**
```typescript
const { stopCapture } = useWebcam();
stopCapture();
```

**Attach to Video Element:**
```tsx
<video ref={videoRef} autoPlay playsInline />
```

---

**Next:** Review [[hooks/usePoseDetection|usePoseDetection]] to see how this hook's output is used.
