### 1. **File/Module Name**
- `src/utils/presenceAnalyzer.ts`

### 2. **Purpose & Role (What does it do?)**
- A collection of utility functions for analyzing pose landmarks and aggregating desk statistics. Its primary function is `analyzePoseLandmarks`, which determines if a user is "at their desk" based on specific spatial criteria. It also handles time formatting and statistical aggregation for reports.

### 3. **Inputs**
- `analyzePoseLandmarks(landmarks: NormalizedLandmark[])`: An array of 33 pose landmarks.
- Statistical functions (e.g., `aggregateWeeklyStats`): Objects or records representing daily or weekly session data.

### 4. **Outputs / Returned Value**
- `PresenceResult`: Boolean `isPresent` flag, a confidence score (0-1), and detailed visibility/position flags.
- Formatted strings (e.g., `formatDeskTime` -> "HH:mm").
- Aggregated stats objects.

### 5. **Key Logic & Flow**
- **Presence Heuristics**:
    - **Shoulder Visibility**: Primary indicator. At least one shoulder must be above 0.6 visibility.
    - **Nose Visibility**: Checked with a 0.5 threshold.
    - **Centering**: Checks if the average X-coordinate of the shoulders is within the center 50% of the frame (0.25 to 0.75).
    - **Vertical Position**: Checks if the nose is in the upper 70% of the frame.
- **Confidence Scoring**: Weighted sum of criteria (both shoulders: 0.5, nose: 0.2, centered: 0.15, upper frame: 0.15).
- **Aggregation**: Logic for computing totals, averages, and active days across time periods (weeks, months).

### 6. **External Dependencies**
- `@mediapipe/tasks-vision`: For the `NormalizedLandmark` type.

### 7. **Integration Points**
- `analyzePoseLandmarks` is the core engine for `usePresenceTracking.ts`.
- Formatting and aggregation functions are used in `DailyStats.tsx`, `WeeklyBarChart.tsx`, and the stats export features.

### 8. **Edge Cases & Notable Behaviors**
- **Partial Visibility**: Allows presence detection if only one shoulder is visible (handles user leaning or turning).
- **Date Arithmetic**: `getWeekStartDate` correctly handles Sunday as the end of the week (Monday start).
- **Exporting**: Includes both CSV and JSON generators for data portability.

### 9. **Tests (if any)**
- `src/utils/__tests__/presenceAnalyzer.test.ts` (Covers landmark analysis, formatting, and aggregation).

### 10. **Questions / TODOs for Further Study**
- The visibility thresholds are hardcoded—should they be configurable for different webcam qualities?
- `aggregateMonthlyStats` takes an array of weekly stats—does this handle months with partial weeks correctly?
- Exporting functions (`generateCSV`, `generateJSON`) use `any` for stats—should be typed with a shared `Stats` interface.
