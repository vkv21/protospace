# useCanvasOverlay Hook

> **File:** `/src/hooks/useCanvasOverlay.ts`
> **Tags:** `#hooks` `#canvas` `#visualization` `#dev-mode`
> **Complexity:** Low
> **Lines:** 77

---

## 1. File/Module Name

`useCanvasOverlay.ts` - Canvas overlay for pose landmark visualization (dev mode)

## 2. Purpose & Role

Manages canvas element that overlays the video stream to visualize detected pose landmarks. Syncs canvas dimensions with video element and draws 33 pose points with skeleton connections. Used for debugging and development.

## 3. Inputs

```typescript
{
  canvasRef: React.RefObject<HTMLCanvasElement>,
  videoRef: React.RefObject<HTMLVideoElement>,
  landmarks: NormalizedLandmark[] | null,
  enabled: boolean  // Dev mode toggle
}
```

## 4. Outputs

Returns `void` (side effects only)

## 5. Key Logic & Flow

### Canvas Dimension Sync
```
1. Get video and canvas elements
2. Use ResizeObserver to watch video size changes
3. On resize: canvas.width = video.clientWidth
4. On resize: canvas.height = video.clientHeight
5. Ensures canvas perfectly overlays video
```

### Drawing Landmarks
```
Every time landmarks change:
1. Clear canvas (clearRect)
2. If enabled && landmarks exist:
   - Draw skeleton connections (lines)
   - Draw landmark points (circles)
   - Draw landmark indices (text)
3. If disabled: clear canvas
```

## 6. External Dependencies

- [[utils/landmarkDrawer|landmarkDrawer]] - Drawing functions (drawLandmarks, drawSkeleton)
- `@mediapipe/tasks-vision` - NormalizedLandmark type
- Browser ResizeObserver API
- Canvas 2D API

## 7. Integration Points

### Used By:
- [[components/VideoCapture|VideoCapture]] (src/components/VideoCapture.tsx:115)

### Depends On:
- [[hooks/useWebcam|useWebcam]] - Needs videoRef for sizing
- [[hooks/usePoseDetection|usePoseDetection]] - Receives landmarks

## 8. Edge Cases & Notable Behaviors

### ResizeObserver
- Automatically updates canvas on window resize
- Handles video aspect ratio changes
- Properly disconnects on unmount

### Drawing Order
1. Skeleton lines drawn first (background)
2. Landmark points drawn second (foreground)
3. Ensures points visible over lines

### Disabled State
- Clears canvas when `enabled = false`
- Stops drawing to save CPU

### No Landmarks
- Clears canvas when `landmarks = null`
- No error if video not ready

## 9. Tests

**Current:** No tests

**Suggested:**
- Mock canvas context
- Test dimension sync
- Test drawing calls
- Test cleanup

## 10. Questions / TODOs

### Potential Improvements
- Adjustable landmark size
- Color-coded visibility scores
- Confidence indicator
- Performance overlay (FPS, detection time)

## Related Documents

- [[INDEX|Documentation Index]]
- [[hooks/usePoseDetection|usePoseDetection]] - Provides landmarks
- [[utils/landmarkDrawer|landmarkDrawer]] - Drawing utilities

## Quick Reference

```typescript
useCanvasOverlay({
  canvasRef,
  videoRef,
  landmarks,
  enabled: devMode  // Toggle with dev mode
});

// Renders:
// - 33 green circles (pose landmarks)
// - White lines (skeleton connections)
// - Landmark indices (0-32)
```

---

**Next:** [[hooks/useD3Timeline|useD3Timeline]] - Timeline visualization
