### 1. **File/Module Name**
- `src/hooks/usePresenceTracking.ts`

### 2. **Purpose & Role (What does it do?)**
- A core hook that monitors user presence at their desk based on pose landmarks. It tracks cumulative "desk time" for the day, detects current activity (e.g., typing, mouse usage, away), and persists data to `localStorage`.

### 3. **Inputs**
- `landmarks: NormalizedLandmark[] | null`: An array of pose landmarks from a detector (like MediaPipe).
- `options: UsePresenceTrackingOptions`:
    - `hysteresisFrames`: (Optional) Number of consecutive frames needed to flip the `isPresent` state (default: 2).

### 4. **Outputs / Returned Value**
- `PresenceState`:
    - `isPresent`: boolean
    - `confidence`: number (0-1)
    - `lastSeen`: Date | null
    - `deskTime`: number (total seconds today)
    - `currentActivity`: ActivityType | null
    - `activityConfidence`: number

### 5. **Key Logic & Flow**
- **Hysteresis Logic**: Uses `consecutivePresenceRef` and `consecutiveAbsenceRef` to prevent "flickering" of the presence status due to single-frame detection failures.
- **Activity Detection**: When present, it calls `detectActivity` from `activityAnalyzer` to determine if the user is typing, using a mouse, or just sitting.
- **Time Accumulation**: Increments `deskTime` every second while `isPresent` is true.
- **Persistence**: Automatically saves `deskTime` to `localStorage` and handles daily resets by checking the stored date.
- **Timeout Fallback**: Force-sets `isPresent` to false if no valid presence is detected for 5 seconds, acting as a safety net if the stream stops or landmarks stop arriving.

### 6. **External Dependencies**
- `../utils/presenceAnalyzer`: For static pose analysis.
- `../utils/activityAnalyzer`: For dynamic activity classification.
- `../types/stats`: For shared types.

### 7. **Integration Points**
- Consumed by `App.tsx` or main layout components to display user status and stats.
- Receives data from `usePoseDetection`.

### 8. **Edge Cases & Notable Behaviors**
- **Date Change**: Handles midnight resets gracefully by polling for date changes.
- **Microtasks**: Uses `queueMicrotask` to update state to avoid "Render phase update" warnings or performance bottlenecks during heavy landmark processing.
- **Storage Errors**: Wrapped in try-catch to prevent crashes if `localStorage` is full or blocked.

### 9. **Tests (if any)**
- `src/hooks/__tests__/usePresenceTracking.test.ts` (Covers hysteresis, persistence, and basic detection logic).

### 10. **Questions / TODOs for Further Study**
- Should `deskTime` be synced across tabs via `storage` events?
- Is 5 seconds the optimal fallback timeout for all lighting conditions?
- The hook mentions `deskTime` might be deprecated in favor of session-based tracking in some contexts—should we unify these?
