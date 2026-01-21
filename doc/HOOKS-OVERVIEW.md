# Hooks Overview

> **Category:** Hooks Summary
> **Last Updated:** 2026-01-21
> **Tags:** `#hooks` `#overview` `#architecture`

---

## All Hooks Summary

AI Desk Watch uses **7 custom React hooks** to encapsulate complex logic. Hooks follow a clear dependency chain from camera → AI → presence → tracking.

## Hook Dependency Graph

```
┌─────────────┐
│ useWebcam   │ ←── Camera access (base layer)
└──────┬──────┘
       ↓
┌──────────────────┐
│usePoseDetection  │ ←── AI pose detection
└────────┬─────────┘
         ↓
    ┌────┴─────┐
    ↓          ↓
┌───────────────────┐  ┌──────────────────┐
│usePresenceTracking│  │useCanvasOverlay  │ ←── Visualization (dev mode)
└─────────┬─────────┘  └──────────────────┘
          ↓
    ┌─────┴──────┐
    ↓            ↓
┌────────────────┐  ┌──────────────────┐
│useStatsTracking│  │useNotifications  │
└────────┬───────┘  └──────────────────┘
         ↓
┌────────────────┐
│ useD3Timeline  │ ←── Visualization (timeline)
└────────────────┘
```

## Hook Categorization

### Input Layer
- **[[hooks/useWebcam|useWebcam]]** - Webcam access and MediaStream management

### AI Layer
- **[[hooks/usePoseDetection|usePoseDetection]]** - MediaPipe pose detection integration

### Analysis Layer
- **[[hooks/usePresenceTracking|usePresenceTracking]]** - Presence detection from landmarks

### Core Tracking Layer ⭐
- **[[hooks/useStatsTracking|useStatsTracking]]** - Session tracking, statistics, multi-tab sync

### Feature Layers
- **[[hooks/useNotifications|useNotifications]]** - Break reminder notifications
- **[[hooks/useCanvasOverlay|useCanvasOverlay]]** - Pose landmark visualization (dev mode)
- **[[hooks/useD3Timeline|useD3Timeline]]** - Interactive timeline visualization

## Complexity Ratings

| Hook | Complexity | Lines | Key Features |
|------|-----------|-------|--------------|
| [[hooks/useWebcam|useWebcam]] | Low | 72 | getUserMedia, cleanup |
| [[hooks/useCanvasOverlay|useCanvasOverlay]] | Low | 77 | Canvas drawing, ResizeObserver |
| [[hooks/useNotifications|useNotifications]] | Low-Med | 161 | Notification API, spam prevention |
| [[hooks/usePoseDetection|usePoseDetection]] | High | 163 | MediaPipe, throttling, animation frames |
| [[hooks/usePresenceTracking|usePresenceTracking]] | Med-High | 229 | Hysteresis, timeout, localStorage |
| [[hooks/useD3Timeline|useD3Timeline]] | High | 329 | D3.js, zoom, tooltips, persistence |
| [[hooks/useStatsTracking|useStatsTracking]] ⭐ | Very High | 582 | Sessions, intervals, leader election, aggregation |

## Data Flow Through Hooks

### Full Pipeline
```
1. useWebcam
   Output: videoRef, isCapturing
   ↓
2. usePoseDetection(videoRef)
   Output: landmarks (33 points)
   ↓
3. usePresenceTracking(landmarks)
   Output: isPresent, confidence, deskTime
   ↓
4. useStatsTracking({ isPresent })
   Output: todayStats, currentSession, isTracking
   ↓
5. useNotifications({ continuousDeskTime })
   Output: Break reminders
   
// Parallel visualizations:
- useCanvasOverlay({ videoRef, landmarks })  → Dev mode overlay
- useD3Timeline({ intervals })               → Timeline chart
```

## State Management Patterns

### Hook-Level State
Each hook manages its own state using `useState`, `useRef`, `useEffect`.

### Shared State
- **Dark mode** - App-level (App.tsx)
- **UI state** - Component-level (modals, panels)
- **Domain logic** - Hook-level (presence, tracking)

### Persistence
- **useStatsTracking** - `aideskwatch_stats`
- **useD3Timeline** - `aideskwatch_timeline_zoom`

## Common Patterns

### Ref Pattern
```typescript
const valueRef = useRef(initialValue);
// Access latest value without triggering re-render
// Useful in intervals/timeouts
```

### Cleanup Pattern
```typescript
useEffect(() => {
  // Setup
  const interval = setInterval(...);
  
  return () => {
    // Cleanup
    clearInterval(interval);
  };
}, [dependencies]);
```

### Singleton Pattern
```typescript
// Used in usePoseDetection
const detectorRef = useRef(getPoseDetector());
// Singleton ensures one MediaPipe instance
```

### Throttling Pattern
```typescript
// Used in usePoseDetection
if (timestamp - lastDetectionTimeRef.current >= intervalMs) {
  // Run detection
  lastDetectionTimeRef.current = timestamp;
}
```

### Hysteresis Pattern
```typescript
// Used in usePresenceTracking
consecutivePresenceRef.current += 1;
if (consecutivePresenceRef.current >= threshold) {
  setIsPresent(true);  // Change state
}
```

## Testing Status

| Hook | Tests | Coverage |
|------|-------|----------|
| useWebcam | ❌ None | 0% |
| usePoseDetection | ❌ None | 0% |
| usePresenceTracking | ❌ None | 0% |
| useStatsTracking | ❌ None | 0% |
| useNotifications | ❌ None | 0% |
| useCanvasOverlay | ❌ None | 0% |
| useD3Timeline | ❌ None | 0% |

**Total Hook Coverage:** 0%

**Note:** Only utility files currently have tests.

## Integration Points

### VideoCapture Component Usage
```typescript
// All hooks orchestrated in VideoCapture.tsx
const { videoRef, isCapturing, startCapture, stopCapture } = useWebcam();

const { landmarks, isLoading, error } = usePoseDetection(videoRef, {
  enabled: isCapturing,
});

const { isPresent, confidence } = usePresenceTracking(landmarks);

const { 
  todayStats, 
  currentSession, 
  startSession, 
  stopSession 
} = useStatsTracking({ isPresent });

const { notificationPermission, requestPermission } = 
  useNotifications({ continuousDeskTime });

useCanvasOverlay({ canvasRef, videoRef, landmarks, enabled: devMode });
```

## Performance Considerations

### Heavy Operations
1. **MediaPipe Model Load** - 2-3 seconds, 10MB download
2. **Pose Detection** - Throttled to 1 FPS (default)
3. **D3 Rendering** - Efficient for typical data sizes
4. **localStorage Writes** - Throttled to every 5 seconds

### Optimization Strategies
- Singleton pattern for MediaPipe
- Throttled detection (not 60fps)
- Ref pattern to avoid unnecessary re-renders
- Memoized callbacks with useCallback
- Selective useEffect dependencies

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[COMPONENT-HIERARCHY|Component Hierarchy]]
- Individual hook docs:
  - [[hooks/useWebcam|useWebcam]]
  - [[hooks/usePoseDetection|usePoseDetection]]
  - [[hooks/usePresenceTracking|usePresenceTracking]]
  - [[hooks/useStatsTracking|useStatsTracking]] ⭐
  - [[hooks/useNotifications|useNotifications]]
  - [[hooks/useCanvasOverlay|useCanvasOverlay]]
  - [[hooks/useD3Timeline|useD3Timeline]]

---

**Hooks are the foundation of this application's architecture. Understanding them is essential.**
