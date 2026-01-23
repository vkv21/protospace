# Hysteresis Filter Pattern

**Tags:** #algorithm #signal-processing #noise-reduction #state-machine  
**Related:** [[usePresenceTracking]], [[PRESENCE-DETECTION]], [[VideoCapture]]  
**Complexity:** Medium  
**Last Updated:** 2026-01-21

---

## Overview

The **Hysteresis Filter** is a signal processing pattern that prevents rapid state oscillation (flicker) by requiring multiple consecutive measurements before changing state. In Commit Space, it smooths the presence detection output to avoid tracking errors caused by brief occlusions or detection noise.

**Purpose:** Convert noisy presence detection signals into stable, reliable presence states.

**Key Innovation:** Dead-band filtering with configurable frame thresholds to balance responsiveness with stability.

---

## Problem Statement

### Without Hysteresis

Raw presence detection from [[PRESENCE-DETECTION]] can flicker due to:
- **Brief occlusions:** User adjusts glasses, drinks water, hand passes in front of face
- **AI model noise:** MediaPipe occasionally fails to detect landmarks for 1-2 frames
- **Lighting variations:** Shadow movements, screen brightness changes
- **Body micro-movements:** User shifts slightly, causing temporary landmark loss

**Result:** State rapidly toggles between `present` and `away`, causing:
1. Inaccurate session tracking (many tiny sessions instead of one continuous session)
2. Excessive localStorage writes (performance degradation)
3. Jarring UI updates (presence indicator flashing)
4. False break notifications

### Example Without Filtering

```
Time:     0s   1s   2s   3s   4s   5s   6s   7s   8s   9s
Raw:      ✓    ✓    ✗    ✓    ✓    ✓    ✓    ✗    ✓    ✓
State:    ON   ON   OFF  ON   ON   ON   ON   OFF  ON   ON
          ────────────────────────────────────────────────
Problem: 2 false state changes at 2s and 7s due to noise
```

### With Hysteresis (N=2)

```
Time:     0s   1s   2s   3s   4s   5s   6s   7s   8s   9s
Raw:      ✓    ✓    ✗    ✓    ✓    ✓    ✓    ✗    ✓    ✓
State:    ON   ON   ON   ON   ON   ON   ON   ON   ON   ON
          ────────────────────────────────────────────────
Solution: Ignores single-frame noise, maintains stable state
```

---

## Algorithm Details

### State Machine

```
┌──────────────┐          N consecutive          ┌──────────────┐
│   PRESENT    │◄────────  'present' frames ────│   ABSENT     │
│  (isPresent  │                                 │  (isPresent  │
│   = true)    │                                 │   = false)   │
└──────────────┘          N consecutive          └──────────────┘
       │                   'absent' frames               │
       └───────────────────────────────────────────────┘
```

**States:**
- `PRESENT`: User is actively at desk (tracking desk time)
- `ABSENT`: User is away from desk (tracking break time)

**Transitions:**
- `PRESENT → ABSENT`: Requires N consecutive frames where detection = false
- `ABSENT → PRESENT`: Requires N consecutive frames where detection = true

**Hysteresis Parameter (N):**
- Default: `N = 2` frames
- Configurable via `hysteresisFrames` option
- Higher N = more stable, less responsive
- Lower N = more responsive, more noise

---

### Implementation

**File:** `src/hooks/usePresenceTracking.ts:77-137`

```typescript
// State variables
const [isPresent, setIsPresent] = useState(false);

// Counters for consecutive frames
const consecutivePresenceRef = useRef(0);
const consecutiveAbsenceRef = useRef(0);

// Configuration
const { hysteresisFrames = 2 } = options;

useEffect(() => {
  // No landmarks detected
  if (!landmarks || landmarks.length === 0) {
    consecutiveAbsenceRef.current += 1;
    consecutivePresenceRef.current = 0;

    // Change to absent after N consecutive absences
    if (consecutiveAbsenceRef.current >= hysteresisFrames) {
      queueMicrotask(() => {
        setIsPresent(false);
        setConfidence(0);
      });
    }
    return;
  }

  // Analyze landmarks
  const result: PresenceResult = analyzePoseLandmarks(landmarks);

  if (result.isPresent) {
    consecutivePresenceRef.current += 1;
    consecutiveAbsenceRef.current = 0;

    // Change to present after N consecutive detections
    if (consecutivePresenceRef.current >= hysteresisFrames) {
      queueMicrotask(() => {
        setIsPresent(true);
      });
    }
  } else {
    consecutiveAbsenceRef.current += 1;
    consecutivePresenceRef.current = 0;

    // Change to absent after N consecutive absences
    if (consecutiveAbsenceRef.current >= hysteresisFrames) {
      queueMicrotask(() => {
        setIsPresent(false);
      });
    }
  }
}, [landmarks, hysteresisFrames]);
```

---

## Key Design Decisions

### 1. Separate Counters for Each Direction

```typescript
const consecutivePresenceRef = useRef(0);  // Count towards PRESENT
const consecutiveAbsenceRef = useRef(0);   // Count towards ABSENT
```

**Why?**
- Allows asymmetric hysteresis (e.g., faster to detect presence, slower to detect absence)
- Current implementation uses symmetric thresholds (both use `hysteresisFrames`)
- Future enhancement: Make them configurable independently

### 2. Counter Reset on Opposite Signal

```typescript
if (result.isPresent) {
  consecutivePresenceRef.current += 1;
  consecutiveAbsenceRef.current = 0;  // ← Reset opposite counter
} else {
  consecutiveAbsenceRef.current += 1;
  consecutivePresenceRef.current = 0;  // ← Reset opposite counter
}
```

**Why?**
- A single opposite frame restarts the countdown
- Ensures only truly consecutive frames count
- Prevents "almost there" edge cases from accumulating

**Example:** With N=2, the sequence `✓ ✗ ✓ ✗ ✓ ✓` takes 2 more frames (4 total) to reach PRESENT, not just 1 more frame, because counters reset on opposite signals.

### 3. State Updates via queueMicrotask

```typescript
queueMicrotask(() => {
  setIsPresent(true);
});
```

**Why?**
- Delays state update until after current effect completes
- Prevents React warnings about state updates during render
- Batches multiple state updates together for better performance

### 4. Confidence Updates Immediately

```typescript
if (result.isPresent) {
  // Update confidence immediately (no hysteresis)
  queueMicrotask(() => {
    setLastSeen(new Date());
    setConfidence(result.confidence);
  });
  
  // Update presence state only after threshold
  if (consecutivePresenceRef.current >= hysteresisFrames) {
    queueMicrotask(() => {
      setIsPresent(true);
    });
  }
}
```

**Why?**
- Confidence can fluctuate freely (provides useful feedback)
- Only binary presence state needs hysteresis
- User can see confidence value changing while state remains stable

---

## Timing Analysis

### Detection Interval
- Pose detection runs every 1000ms (1 frame/second) by default
- Configurable via `intervalMs` in `usePoseDetection`

*File: `src/hooks/usePoseDetection.ts:7,20`*

### Hysteresis Latency

With default settings (`N=2`, `intervalMs=1000ms`):

**Presence → Absence:**
1. User leaves desk at T=0
2. First absence detected at T=1000ms (counter = 1)
3. Second absence detected at T=2000ms (counter = 2, threshold met)
4. **State changes to ABSENT at T=2000ms**
5. **Total latency: 2 seconds**

**Absence → Presence:**
1. User returns to desk at T=0
2. First presence detected at T=1000ms (counter = 1)
3. Second presence detected at T=2000ms (counter = 2, threshold met)
4. **State changes to PRESENT at T=2000ms**
5. **Total latency: 2 seconds**

### Timeout Fallback

In addition to hysteresis, a timeout-based fallback forces absence after 5 seconds:

```typescript
useEffect(() => {
  if (!isPresent) return;

  const checkTimeout = setInterval(() => {
    const timeSinceLastValidPresence = Date.now() - lastValidPresenceTimeRef.current;
    const PRESENCE_TIMEOUT_MS = 5000;  // 5 seconds

    if (timeSinceLastValidPresence > PRESENCE_TIMEOUT_MS) {
      setIsPresent(false);
      setConfidence(0);
      consecutivePresenceRef.current = 0;
      consecutiveAbsenceRef.current = hysteresisFrames;
    }
  }, 1000);

  return () => clearInterval(checkTimeout);
}, [isPresent, hysteresisFrames]);
```

**Purpose:**
- Handles edge case where pose detection stops updating (camera disconnected, browser tab backgrounded)
- Ensures user isn't marked as present forever if detection fails silently
- Acts as safety net for hysteresis filter

*File: `src/hooks/usePresenceTracking.ts:141-162`*

---

## Configuration Tuning

### Default Configuration
```typescript
const { hysteresisFrames = 2 } = options;  // 2 consecutive frames required
```

### Increasing Responsiveness (Lower N)

```typescript
// N = 1 (no hysteresis, instant response)
const presence = usePresenceTracking(landmarks, { hysteresisFrames: 1 });
```

**Pros:**
- Immediate state changes (1-second latency instead of 2)
- Better for users who frequently stand up briefly

**Cons:**
- More susceptible to noise (single frame errors cause state flicker)
- May create many tiny sessions instead of one long session

### Increasing Stability (Higher N)

```typescript
// N = 3 (3 consecutive frames required)
const presence = usePresenceTracking(landmarks, { hysteresisFrames: 3 });
```

**Pros:**
- Very stable state (ignores 1-2 frame noise completely)
- Fewer false state changes

**Cons:**
- Slower response (3-second latency)
- User might leave desk and return before state changes

### Recommended Settings

| Use Case | N | Latency | Stability |
|----------|---|---------|-----------|
| **Default (recommended)** | 2 | 2s | Good balance |
| High-movement environment | 3-4 | 3-4s | Very stable |
| Quick response needed | 1 | 1s | Some noise |
| Testing/development | 1 | 1s | Instant feedback |

---

## Visual Comparison

### Scenario: User Drinks Water (2-Second Occlusion)

**Without Hysteresis (N=1):**
```
Time:    0s  1s  2s  3s  4s  5s  6s  7s  8s  9s
Detect:  ✓   ✓   ✗   ✗   ✓   ✓   ✓   ✓   ✓   ✓
State:   ON  ON  OFF OFF ON  ON  ON  ON  ON  ON
         ──────────────────────────────────────
Sessions: ─────Session 1─── ──Session 2───────
Problem: Creates 2 sessions instead of 1
```

**With Hysteresis (N=2, default):**
```
Time:    0s  1s  2s  3s  4s  5s  6s  7s  8s  9s
Detect:  ✓   ✓   ✗   ✗   ✓   ✓   ✓   ✓   ✓   ✓
Counter: 2   2   1   2→0 1   2   2   2   2   2
State:   ON  ON  ON  OFF ON  ON  ON  ON  ON  ON
         ──────────────────────────────────────
Sessions: ─────────Session 1─────────────────
Solution: Brief occlusion doesn't break session
```

**With Hysteresis (N=3):**
```
Time:    0s  1s  2s  3s  4s  5s  6s  7s  8s  9s
Detect:  ✓   ✓   ✗   ✗   ✓   ✓   ✓   ✓   ✓   ✓
Counter: 3   3   1   2   1   2   3   3   3   3
State:   ON  ON  ON  ON  ON  ON  ON  ON  ON  ON
         ──────────────────────────────────────
Sessions: ─────────Session 1─────────────────
Best: Never changes state during brief occlusion
```

---

## Edge Cases

### 1. Alternating Detections

**Scenario:** Detection result alternates every frame (worst case noise)

```
Time:    0s  1s  2s  3s  4s  5s  6s
Detect:  ✓   ✗   ✓   ✗   ✓   ✗   ✓
Counter: 1   1   1   1   1   1   1
State:   ?   ?   ?   ?   ?   ?   ?
```

**Behavior:** State NEVER changes because counter never reaches N=2
**Solution:** This is correct behavior—truly noisy signal should not affect state

### 2. Camera Disconnection

**Scenario:** Camera feed stops, no landmarks received

```typescript
if (!landmarks || landmarks.length === 0) {
  consecutiveAbsenceRef.current += 1;
  // ...
}
```

**Behavior:** Treated as absence after N frames
**Backup:** Timeout fallback (5 seconds) ensures state changes even if detection loop stops

### 3. Rapid Leave/Return

**Scenario:** User steps away for 1 second, returns immediately

```
Time:    0s  1s  2s  3s  4s
Detect:  ✓   ✗   ✓   ✓   ✓
Counter: 2   1   1   2   2
State:   ON  ON  ON  ON  ON
```

**Behavior:** State remains ON (correct—user didn't really leave)
**Result:** No break recorded, continuous session maintained

### 4. Long-Term Absence

**Scenario:** User leaves for 10 minutes

```
State changes to ABSENT after 2 seconds (N=2)
Remains ABSENT for entire duration
Returns to PRESENT after 2 seconds when user returns
```

**Behavior:** Works as expected—hysteresis doesn't affect long-term state changes

---

## Performance Impact

### Memory Usage
- **2 refs:** `consecutivePresenceRef`, `consecutiveAbsenceRef` (8 bytes each)
- **Negligible:** O(1) space complexity

### CPU Usage
- **Per frame:** 2 integer increments, 2 comparisons
- **Negligible:** O(1) time complexity
- **No impact:** on pose detection performance (that's the bottleneck at ~100-200ms)

### UI Smoothness
- **Before hysteresis:** Presence indicator flickers (poor UX)
- **After hysteresis:** Smooth, stable indicator (excellent UX)

---

## Related Patterns

### Debouncing vs. Hysteresis

**Debouncing:**
```typescript
// Wait 2 seconds after last change before updating
const debounced = debounce(updateState, 2000);
```
- Waits for signal to stabilize
- Single timer reset on every change
- Not ideal for presence detection (could delay response indefinitely with continuous noise)

**Hysteresis (this implementation):**
```typescript
// Require 2 consecutive same readings
if (consecutiveCount >= 2) updateState();
```
- Requires consistent signal for N readings
- More predictable latency (exactly N × interval)
- Better for presence detection

### Schmitt Trigger (Electrical Engineering Analogy)

Hysteresis is identical to a Schmitt trigger in electronics:
- **Upper threshold:** Switch ON after N consecutive HIGHs
- **Lower threshold:** Switch OFF after N consecutive LOWs
- **Dead band:** Between 0 and N-1 consecutive readings, state unchanged

---

## Testing

### Unit Tests

**Status:** Integrated into `usePresenceTracking` tests

**Test Cases:**
```typescript
describe('Hysteresis filtering', () => {
  it('should require N consecutive frames to change state', () => {
    // Test with N=2, single frame noise should not change state
  });
  
  it('should reset counter on opposite signal', () => {
    // Test that ✓ ✗ ✓ ✗ ✓ ✓ takes 4+ frames, not 2
  });
  
  it('should handle alternating signals correctly', () => {
    // Verify state never changes with ✓ ✗ ✓ ✗ pattern
  });
  
  it('should allow different N values', () => {
    // Test with N=1, N=3, N=5
  });
});
```

### Manual Testing Checklist
- [ ] Pass hand in front of face briefly → State should NOT change
- [ ] Stand up for 5+ seconds → State should change to ABSENT
- [ ] Adjust camera causing 1-frame drop → State should NOT change
- [ ] Unplug camera → Should change to ABSENT after N+timeout seconds
- [ ] Test with N=1, N=2, N=3 → Observe latency differences

---

## Future Enhancements

### 1. Asymmetric Hysteresis
```typescript
{
  presenceHysteresisFrames: 2,   // Quick to detect presence
  absenceHysteresisFrames: 4,    // Slow to detect absence
}
```
**Use case:** Avoid marking user as away during brief movements

### 2. Adaptive Hysteresis
```typescript
// Learn optimal N based on user's noise profile
const adaptiveN = calculateOptimalHysteresis(historicalData);
```

### 3. Confidence-Weighted Hysteresis
```typescript
// High-confidence frames count more towards threshold
consecutivePresenceRef.current += result.confidence;  // 0.8 instead of 1.0
if (consecutivePresenceRef.current >= 2.0) { ... }
```

### 4. Exponential Decay Counter
```typescript
// Counter decays over time instead of hard reset
consecutivePresenceRef.current *= 0.5;  // Half-life approach
```

---

## Related Documentation

- [[PRESENCE-DETECTION]] - Algorithm that produces raw signals filtered by this module
- [[usePresenceTracking]] - Hook that implements this pattern
- [[SESSION-TRACKING]] - Consumes stabilized presence state from this filter
- [[VideoCapture]] - Component that orchestrates presence detection + hysteresis

---

## References

- **Schmitt Trigger:** https://en.wikipedia.org/wiki/Schmitt_trigger
- **Signal Processing:** https://en.wikipedia.org/wiki/Hysteresis
- **Implementation:** `src/hooks/usePresenceTracking.ts:77-162`

---

## Questions / TODOs

1. Should we make hysteresis asymmetric by default (faster to detect presence)?
2. Could we add a "sensitivity" slider in UI that maps to hysteresisFrames?
3. Should we log state transition events for debugging flicker issues?
4. Could machine learning determine optimal N per user automatically?
5. Should we expose separate thresholds for "temporary absence" vs. "true absence"?
