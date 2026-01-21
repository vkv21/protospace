# usePoseDetection Hook

> **File:** `/src/hooks/usePoseDetection.ts`
> **Tags:** `#hooks` `#ai` `#mediapipe` `#pose-detection`
> **Complexity:** High
> **Lines:** 163

---

## 1. File/Module Name

`usePoseDetection.ts` - MediaPipe Pose Landmarker integration hook

## 2. Purpose & Role

Orchestrates real-time pose detection using MediaPipe AI. Manages model initialization, throttled detection loop, and landmark extraction. Converts video frames into 33-point body pose data that downstream hooks can analyze.

## 3. Inputs

```typescript
videoRef: React.RefObject<HTMLVideoElement>  // Video element to analyze
options: {
  enabled: boolean,        // Start/stop detection
  intervalMs?: number      // Detection frequency (default: 1000ms)
}
```

## 4. Outputs / Returned Value

```typescript
{
  landmarks: NormalizedLandmark[] | null,  // 33 pose points or null
  isLoading: boolean,                      // Model initialization status
  error: string | null                     // Error message if failed
}
```

## 5. Key Logic & Flow

### Initialization Phase
```
1. Get singleton PoseDetector instance
2. Call detector.initialize() (async)
   - Downloads pose_landmarker_lite.task model (~10MB)
   - Initializes WebGL/GPU resources
   - Takes 2-3 seconds
3. Set isLoading = false when ready
```

### Detection Loop (when enabled)
```
1. requestAnimationFrame(runDetection)
2. Check time since last detection
3. If intervalMs elapsed:
   - Call detector.detect(videoElement, timestamp)
   - Extract landmarks[0] (first person)
   - Update landmarks state
4. Schedule next frame
5. Repeat until disabled
```

### Throttling Logic
```typescript
const timeSinceLastDetection = timestamp - lastDetectionTimeRef.current;
if (timeSinceLastDetection >= intervalMs) {
  // Run detection
  lastDetectionTimeRef.current = timestamp;
}
```

**Why Throttle?** Running at 60fps would be expensive (CPU/GPU). Default 1000ms = 1 detection per second.

## 6. External Dependencies

- `@mediapipe/tasks-vision` - Google's MediaPipe library
- [[utils/poseDetector|poseDetector]] - Singleton wrapper
- React hooks: useEffect, useRef, useState, useCallback

## 7. Integration Points

### Used By:
- [[components/VideoCapture|VideoCapture]] (src/components/VideoCapture.tsx:80)

### Depends On:
- [[hooks/useWebcam|useWebcam]] - Requires videoRef input

### Consumes:
- [[utils/poseDetector|poseDetector]] singleton

### Consumed By:
- [[hooks/usePresenceTracking|usePresenceTracking]] - Receives landmarks
- [[hooks/useCanvasOverlay|useCanvasOverlay]] - Receives landmarks for visualization

### Data Flow:
```
useWebcam (videoRef)
    ↓
usePoseDetection (landmarks)
    ↓
├─→ usePresenceTracking (presence analysis)
└─→ useCanvasOverlay (visualization)
```

## 8. Edge Cases & Notable Behaviors

### Multiple People
- Detects multiple people but only returns first person's landmarks
- `result.landmarks[0]` - always first detection

### No Detection
- Returns `null` when no person visible
- Clears landmarks when `enabled = false`

### Model Loading
- `isLoading = true` until model ready
- Detection doesn't start until `isLoading = false`

### Animation Frame Cleanup
- Properly cancels requestAnimationFrame on unmount
- Prevents memory leaks

### Ref Pattern
```typescript
runDetectionRef.current = runDetection;  // Always has latest callback
animationFrameRef.current = requestAnimationFrame(runDetectionRef.current);
```
**Why?** Avoids stale closure issues with useCallback dependencies.

### Error Handling
- Model load errors → set error state
- Detection errors → log to console, set error state
- Continues attempting detection after errors

## 9. Tests (if any)

**Current:** No tests

**Suggested:**
- Mock MediaPipe singleton
- Test throttling logic
- Test cleanup on unmount
- Test error handling

## 10. Questions / TODOs

### Open Questions
1. **Multi-person support?** Should we expose all detected people?
2. **Dynamic interval?** Should intervalMs be adjustable during runtime?
3. **Quality threshold?** Should we filter low-confidence detections here?

### Potential Improvements
- Expose detection confidence score
- Add FPS counter for performance monitoring
- Add detection quality metrics
- Support for multiple people

### Performance Notes
- **Default 1000ms:** 1 FPS (good balance)
- **500ms:** 2 FPS (more responsive, higher CPU)
- **2000ms:** 0.5 FPS (battery-friendly)

## Related Documents

- [[INDEX|Documentation Index]]
- [[hooks/useWebcam|useWebcam]] - Provides video input
- [[hooks/usePresenceTracking|usePresenceTracking]] - Consumes landmarks
- [[utils/poseDetector|poseDetector]] - Singleton wrapper
- [[features/POSE-DETECTION|Pose Detection Feature]]

## Quick Reference

```typescript
const { landmarks, isLoading, error } = usePoseDetection(videoRef, {
  enabled: isCapturing,
  intervalMs: 1000  // 1 detection per second
});

// landmarks: array of 33 NormalizedLandmark objects
// Each landmark: { x, y, z, visibility }
// x, y: normalized 0-1 coordinates
// visibility: 0-1 confidence score
```

---

**Next:** [[hooks/usePresenceTracking|usePresenceTracking]] - See how landmarks are analyzed
