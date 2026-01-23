# Utilities Documentation

> **Category:** Utilities Reference
> **Last Updated:** 2026-01-21
> **Tags:** `#utils` `#algorithms` `#helpers`

---

## poseDetector.ts

**File:** `/src/utils/poseDetector.ts` (149 lines)

**Purpose:** MediaPipe Pose Landmarker singleton wrapper for efficient AI model management

### Key Features

**Singleton Pattern:**
```typescript
class PoseDetectorSingleton {
  private static instance: PoseDetectorSingleton | null = null;
  
  public static getInstance(): PoseDetectorSingleton {
    if (!PoseDetectorSingleton.instance) {
      PoseDetectorSingleton.instance = new PoseDetectorSingleton();
    }
    return PoseDetectorSingleton.instance;
  }
}

export const getPoseDetector = () => PoseDetectorSingleton.getInstance();
```

**Why Singleton?** MediaPipe model is expensive (~10MB, GPU resources). One instance per app.

### Methods

#### `initialize(): Promise<void>`
```typescript
// Loads MediaPipe model from CDN
- Downloads WASM runtime
- Loads pose_landmarker_lite.task model
- Configures GPU acceleration
- Sets VIDEO mode, 1 person detection
```

**Model URL:**
```
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
```

**Configuration:**
- Delegate: GPU (hardware acceleration)
- Running Mode: VIDEO (optimized for video streams)
- Num Poses: 1 (only detect first person)

#### `detect(videoElement, timestamp): PoseDetectionResult | null`
```typescript
// Returns 33 pose landmarks or null
- Checks video ready state
- Calls detectForVideo()
- Filters low-quality detections
- Returns landmarks + worldLandmarks
```

**Quality Filtering:**
```typescript
// Requires at least one visible key landmark:
- Left shoulder visibility >= 0.6 OR
- Right shoulder visibility >= 0.6 OR
- Nose visibility >= 0.5

// Otherwise returns null (poor detection)
```

#### `close(): void`
Cleans up MediaPipe resources

#### `isReady(): boolean`
Returns true if model loaded

### Types

```typescript
interface PoseDetectionResult {
  landmarks: Array<Array<{x, y, z, visibility?}>>,
  worldLandmarks: Array<Array<{x, y, z, visibility?}>>
}
```

### Usage

```typescript
const detector = getPoseDetector();
await detector.initialize();

const result = detector.detect(videoElement, timestamp);
if (result && result.landmarks[0]) {
  const landmarks = result.landmarks[0]; // 33 points
}
```

---

## presenceAnalyzer.ts

**File:** `/src/utils/presenceAnalyzer.ts` (336 lines)

**Purpose:** Pose landmark analysis algorithms, statistics calculation, formatting utilities

### Main Function: analyzePoseLandmarks()

```typescript
function analyzePoseLandmarks(
  landmarks: NormalizedLandmark[]
): PresenceResult
```

**Algorithm:**

1. **Check Landmark Visibility**
```typescript
leftShoulderVisible = visibility >= 0.6
rightShoulderVisible = visibility >= 0.6
noseVisible = visibility >= 0.5
```

2. **Check Body Centering** (X: 0.25-0.75)
```typescript
avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2
centered = avgShoulderX >= 0.25 && avgShoulderX <= 0.75
```

3. **Check Upper Frame Position** (Y <= 0.7)
```typescript
inUpperFrame = nose.y <= 0.7
```

4. **Calculate Confidence Score** (0-1)
```typescript
confidence = 0
if (bothShouldersVisible) confidence += 0.5
else if (oneShoulder) confidence += 0.3
if (noseVisible) confidence += 0.2
if (centered) confidence += 0.15
if (inUpperFrame) confidence += 0.15
```

5. **Determine Presence**
```typescript
isPresent = hasVisibleShoulder && confidence >= 0.4
```

**Returns:**
```typescript
{
  isPresent: boolean,
  confidence: number,  // 0-1
  details: {
    leftShoulderVisible, rightShoulderVisible,
    noseVisible, centered
  }
}
```

### Statistics Functions

#### `calculateBreakTime(session): number`
Sum of all 'away' interval durations in seconds

#### `calculateContinuousDeskTime(session): number`
Longest 'present' interval duration in seconds

#### `formatGoalProgress(current, goal): number`
Returns percentage: `(current / goal) * 100`

#### `aggregateWeeklyStats(days): WeeklyAggregate`
Combines 7 days into weekly summary

#### `aggregateMonthlyStats(weeks): MonthlyAggregate`
Combines 4+ weeks into monthly summary

### Formatting Functions

#### `formatDeskTime(seconds): string`
```typescript
// Examples:
formatDeskTime(3665) → "1:01"    // hours:minutes
formatDeskTime(125)  → "0:02"    // under 1 hour
formatDeskTime(7200) → "2:00"
```

#### `formatDuration(seconds): string`
```typescript
// Examples:
formatDuration(3665) → "1h 1m"   // human readable
formatDuration(125)  → "2m 5s"   // under 1 hour
formatDuration(45)   → "45s"     // under 1 minute
```

### Export Functions

#### `generateCSV(stats): string`
Exports statistics as CSV format

#### `generateJSON(stats): string`
Exports statistics as formatted JSON

#### `getWeekStartDate(date): string`
Returns Monday of the given week (YYYY-MM-DD)

### Constants

```typescript
POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_HIP: 23,
  RIGHT_HIP: 24
}

// Thresholds
VISIBILITY_THRESHOLD = 0.6
NOSE_VISIBILITY_THRESHOLD = 0.5
CENTER_MIN_X = 0.25
CENTER_MAX_X = 0.75
UPPER_FRAME_MAX_Y = 0.7
```

---

## statsStorage.ts

**File:** `/src/utils/statsStorage.ts` (313 lines)

**Purpose:** localStorage persistence layer and data management

### Core Functions

#### `loadStats(): StatsData | null`
Loads statistics from localStorage

#### `saveStats(stats): void`
Saves statistics to localStorage

#### `loadOrInitializeStats(): StatsData`
Loads existing or creates initial stats structure

#### `createInitialStats(): StatsData`
Creates fresh StatsData object with defaults

### Data Aggregation

#### `aggregateOldSessions(stats): void`
```typescript
// Converts 7+ day-old sessions → weekly aggregates
// Mutates stats object in place
// Keeps last 7 days detailed
// Older data aggregated to historicalWeeks[]
```

#### `aggregateOldWeeks(stats): void`
```typescript
// Converts 52+ week-old data → monthly aggregates
// Mutates stats object in place
// Keeps last 52 weeks
// Older data aggregated to historicalMonths[]
```

### Export Functions

#### `exportToCSV(stats): string`
Returns CSV formatted string of all statistics

#### `exportToJSON(stats): string`
Returns pretty-printed JSON string

### Data Management

#### `clearAllData(): void`
```typescript
// Clears all localStorage keys:
- commitspace_stats
- commitspace_config  
```

### Storage Keys

```typescript
STORAGE_KEYS = {
  STATS: 'commitspace_stats',
  CONFIG: 'commitspace_config'
}
```

### Data Retention Policy

```typescript
// Automatic cleanup via aggregation:
- Detailed sessions: Last 7 days
- Weekly aggregates: Last 52 weeks
- Monthly aggregates: Last 24 months
- All-time stats: Forever
```

### Error Handling

```typescript
// Quota exceeded handling:
try {
  localStorage.setItem(key, value);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Progressively remove old data
    aggregateOldSessions(stats);
    aggregateOldWeeks(stats);
    // Retry save
  }
}
```

---

## landmarkDrawer.ts

**File:** `/src/utils/landmarkDrawer.ts` (133 lines)

**Purpose:** Canvas drawing utilities for pose landmark visualization (dev mode)

### Functions

#### `drawLandmarks(ctx, landmarks, width, height): void`
```typescript
// Draws 33 pose landmarks as circles
// Features:
- Green circles (4px radius)
- Opacity based on visibility score
- White border for contrast
- Landmark index labels (0-32)
- Text shadow for readability
- Only draws if visibility > 0.5
```

#### `drawSkeleton(ctx, landmarks, width, height): void`
```typescript
// Draws skeleton connections between landmarks
// Features:
- Green lines (2px width, 0.6 opacity)
- 31 connection pairs (face, arms, torso, legs)
- Only draws if both endpoints visible (> 0.5)
```

### POSE_CONNECTIONS

```typescript
// 31 landmark connection pairs:
const POSE_CONNECTIONS: [number, number][] = [
  // Face: nose, eyes, ears
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  
  // Shoulders and arms
  [9, 10], [11, 12], [11, 13], [13, 15],
  [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20],
  [16, 22], [18, 20],
  
  // Torso
  [11, 23], [12, 24], [23, 24],
  
  // Legs
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
];
```

### Drawing Order

```typescript
// In useCanvasOverlay:
1. Clear canvas
2. Draw skeleton (background layer)
3. Draw landmarks (foreground layer)
// Ensures points visible over lines
```

---

## Testing Status

| Utility | Tests | Coverage |
|---------|-------|----------|
| poseDetector | ❌ None | 0% |
| presenceAnalyzer | ✅ **Yes** | ~60% |
| statsStorage | ✅ **Yes** | ~50% |
| landmarkDrawer | ❌ None | 0% |

**Test Files:**
- `src/utils/__tests__/presenceAnalyzer.test.ts`
- `src/utils/__tests__/statsStorage.test.ts`

---

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[HOOKS-OVERVIEW|Hooks Overview]]
- [[algorithms/PRESENCE-DETECTION|Presence Detection Algorithm]]
- [[algorithms/DATA-AGGREGATION|Data Aggregation]]

---

**All 4 utility files documented!**
