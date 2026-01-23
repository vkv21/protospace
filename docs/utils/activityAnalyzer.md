### 1. **File/Module Name**
- `src/utils/activityAnalyzer.ts`

### 2. **Purpose & Role (What does it do?)**
- Analyzes pose landmarks to classify the user's current activity (e.g., typing, mouse usage, phone call, stretching). It provides more granular insight into "desk time" by identifying the specific nature of the user's engagement.

### 3. **Inputs**
- `detectActivity(landmarks: NormalizedLandmark[])`: An array of pose landmarks from MediaPipe.

### 4. **Outputs / Returned Value**
- `ActivityResult`:
    - `activity`: `ActivityType` (e.g., 'typing', 'reading', 'phone_call').
    - `confidence`: number (0-1).
    - `details`: Object containing specific posture and hand position classifications.

### 5. **Key Logic & Flow**
- **Priority-Based Detection**: Activities are checked in a specific order:
    1.  **Phone Call**: Hand (wrist) near the nose or ear.
    2.  **Stretching**: Arms extended beyond a specific threshold relative to shoulders.
    3.  **Typing**: Both wrists at desk level with bent elbows (symmetric).
    4.  **Mouse**: One wrist at desk level, usually asymmetric relative to the other.
    5.  **Posture (Back/Forward Lean)**: Based on nose position relative to shoulders and absolute Y-coordinates.
    6.  **Reading**: Default state if upright but no specific hand movement is detected.
- **Euclidean Distance**: Uses 2D distance calculations to measure arm extension and hand-to-head proximity.

### 6. **External Dependencies**
- `@mediapipe/tasks-vision`: For `NormalizedLandmark` types.
- `../types/stats`: For the `ActivityType` enum/union.

### 7. **Integration Points**
- Used by `usePresenceTracking.ts` to enrich the presence state with activity data.
- UI components use `getActivityLabel` and `getActivityIcon` for visual feedback.

### 8. **Edge Cases & Notable Behaviors**
- **Visibility Checks**: Every heuristic first verifies that the required landmarks (wrists, elbows, ears) have a visibility score above 0.5.
- **Typing vs. Mouse**: If both are detected, it compares confidence levels to pick the most likely candidate.
- **Calibration**: Thresholds like `WRIST_KEYBOARD_Y_MAX` assume a standard laptop/desktop webcam angle.

### 9. **Tests (if any)**
- `src/utils/__tests__/activityAnalyzer.test.ts` (Covers classification of various poses).

### 10. **Questions / TODOs for Further Study**
- How does the analyzer handle different desk heights (e.g., standing desks)?
- Could we use temporal patterns (multiple frames) to distinguish between "leaning forward" and a quick movement?
- Should "drinking coffee" or other common desk activities be added?
