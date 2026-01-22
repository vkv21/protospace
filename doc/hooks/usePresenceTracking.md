# usePresenceTracking Hook

> **File:** `/src/hooks/usePresenceTracking.ts`
> **Tags:** `#hooks` `#presence` `#analysis` `#tracking`
> **Complexity:** Medium-High
> **Lines:** 229

---

## 1. File/Module Name

`usePresenceTracking.ts` - Presence detection and desk time tracking

## 2. Purpose & Role

Analyzes pose landmarks to determine if user is present at desk. Applies hysteresis filtering to prevent flickering, tracks cumulative desk time, and persists data with daily reset.

## 3. Inputs

```typescript
landmarks: NormalizedLandmark[] | null  // From usePoseDetection
options: {
  hysteresisFrames?: number  // Frames needed to change state (default: 2)
}
```

## 4. Outputs

```typescript
{
  isPresent: boolean,      // Currently at desk
  confidence: number,      // 0-1 confidence score
  lastSeen: Date | null,   // Last detection time
  deskTime: number         // Total seconds today
}
```

## 5. Key Logic & Flow

### Presence Analysis
```
landmarks → analyzePoseLandmarks() → {isPresent, confidence}
```

### Hysteresis Filter
```
Present detection:
  consecutivePresenceRef++
  If count >= hysteresisFrames → setIsPresent(true)

Absent detection:
  consecutiveAbsenceRef++
  If count >= hysteresisFrames → setIsPresent(false)
```

**Why?** Prevents rapid toggling between present/absent states.

### Desk Time Tracking
```
Every second (when present):
1. Calculate elapsed time since last check
2. Add to deskTime
3. Save to localStorage
```

### Timeout Fallback
```
If present but no valid landmarks for 5 seconds:
→ Force isPresent = false
```

### Daily Reset
```
Check every minute:
  If date changed → reset deskTime to 0
```

## 6. External Dependencies

- [[utils/presenceAnalyzer|presenceAnalyzer]] - `analyzePoseLandmarks()`
- localStorage - Persistence (keys: `commitspace_presence`, `commitspace_last_date`)
- `@mediapipe/tasks-vision` - NormalizedLandmark type

## 7. Integration Points

### Used By:
- [[components/VideoCapture|VideoCapture]] (src/components/VideoCapture.tsx:90)

### Depends On:
- [[hooks/usePoseDetection|usePoseDetection]] - Receives landmarks

### Consumed By:
- [[hooks/useStatsTracking|useStatsTracking]] - Uses isPresent for session tracking
- [[hooks/useNotifications|useNotifications]] - Uses deskTime for break reminders

### Data Flow:
```
usePoseDetection (landmarks)
    ↓
usePresenceTracking (isPresent, deskTime)
    ↓
├─→ useStatsTracking (session intervals)
└─→ useNotifications (break reminders)
```

## 8. Edge Cases & Notable Behaviors

### No Landmarks
- Sets consecutiveAbsence++
- After hysteresisFrames → isPresent = false

### queueMicrotask Pattern
```typescript
queueMicrotask(() => {
  setIsPresent(true);
});
```
**Why?** Batch state updates, prevent render thrashing.

### 5-Second Timeout
- Safety mechanism if landmarks stop updating
- Prevents stuck "present" state

### Daily Reset Logic
- Checks every 60 seconds if date changed
- Compares stored date with current date
- Auto-resets deskTime at midnight

### localStorage Persistence
```typescript
{
  deskTime: 7200,  // seconds
  date: "Wed Jan 21 2026"
}
```

### Hysteresis Default (2 frames)
- With 1 FPS detection: 2 seconds stability
- With 0.5 FPS: 4 seconds stability
- Configurable via options

## 9. Tests

**Current:** No tests

**Suggested:**
- Test hysteresis filtering
- Test timeout fallback
- Test daily reset logic
- Test localStorage persistence
- Mock presenceAnalyzer

## 10. Questions / TODOs

### Open Questions
1. **Timeout duration:** Is 5 seconds appropriate?
2. **Hysteresis frames:** Should default be higher?
3. **Desk time granularity:** Is 1-second accuracy needed?

### Potential Improvements
- Configurable timeout duration
- Pause/resume desk time tracking
- Export desk time history
- Away time tracking

### Known Issues
- **Note:** This hook tracks desk time independently of sessions
- [[hooks/useStatsTracking|useStatsTracking]] has its own tracking
- This deskTime is deprecated in favor of session-based tracking

## Related Documents

- [[INDEX|Documentation Index]]
- [[hooks/usePoseDetection|usePoseDetection]] - Provides landmarks
- [[hooks/useStatsTracking|useStatsTracking]] - Uses isPresent
- [[utils/presenceAnalyzer|presenceAnalyzer]] - Analysis logic
- [[algorithms/PRESENCE-DETECTION|Presence Detection Algorithm]]
- [[algorithms/HYSTERESIS-FILTER|Hysteresis Filtering]]

## Quick Reference

```typescript
const { isPresent, confidence, lastSeen, deskTime } = 
  usePresenceTracking(landmarks, { hysteresisFrames: 2 });

// isPresent: true/false (stable, filtered)
// confidence: 0-1 (from presenceAnalyzer)
// deskTime: seconds at desk today (persisted)
```

---

**Next:** [[hooks/useStatsTracking|useStatsTracking]] - Session-based tracking
