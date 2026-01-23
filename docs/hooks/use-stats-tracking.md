### 1. **File/Module Name**
- `src/hooks/useStatsTracking.ts`

### 2. **Purpose & Role (What does it do?)**
- The central brain for session management and statistics aggregation. It tracks presence and away intervals, coordinates multiple browser tabs to ensure only one "leader" saves data, and handles long-term storage of user engagement metrics.

### 3. **Inputs**
- `options: UseStatsTrackingOptions`:
    - `isPresent`: Boolean from `usePresenceTracking`.
    - `lastSeen`: Timestamp of last detection.
    - `currentActivity`: Detected activity string.
    - `activityConfidence`: Confidence score.

### 4. **Outputs / Returned Value**
- `UseStatsTrackingReturn`:
    - `todayStats`: Aggregated stats for the current day.
    - `currentSession`: Details of the active session (start, end, presence intervals).
    - `isTracking`: Boolean indicating if a session is actively being recorded.
    - `continuousDeskTime`: Seconds of uninterrupted presence in the current interval.
    - `startSession`, `stopSession`, `pauseSession`, `resumeSession`: Control functions for the user.

### 5. **Key Logic & Flow**
- **Session Management**: Sessions are collections of `PresenceInterval` objects (type: 'present' | 'away' | 'paused'). A session starts manually and ends manually or via midnight rollover.
- **Multi-Tab Coordination (Leader Election)**:
    - Uses `BroadcastChannel` to communicate between tabs.
    - Only the "leader" tab writes to `localStorage` every 5 seconds.
    - If the leader dies (no heartbeat for 10s), another tab takes over.
- **Interval Tracking**: Automatically creates new intervals when `isPresent` or `currentActivity` changes.
- **Aggregation**: Recalculates `totalDeskTime` and `totalBreakTime` by summing up relevant intervals across all sessions for the day.
- **Persistence**: Periodically (every 5s) flushes the current state to `localStorage` via `saveStats`.

### 6. **External Dependencies**
- `../utils/statsStorage`: For persistence and initial state.
- `BroadcastChannel`: Browser API for cross-tab communication.

### 7. **Integration Points**
- Primary consumer is `App.tsx` and statistics dashboard components.
- Receives state from `usePresenceTracking`.

### 8. **Edge Cases & Notable Behaviors**
- **Midnight Rollover**: Closes the active session at 00:00:00 and starts a new day record.
- **Pause/Resume**: Explicitly excludes "paused" intervals from desk time calculations.
- **Activity Enrichment**: Attaches the latest detected activity and confidence to 'present' intervals in real-time.

### 9. **Tests (if any)**
- `src/hooks/__tests__/useStatsTracking.test.ts` (Covers session lifecycle, intervals, and leader election logic).

### 10. **Questions / TODOs for Further Study**
- Should session auto-start be an option?
- The 5-second save interval might be too frequent—could we use `beforeunload` or `visibilitychange` instead?
- How should we handle manual system clock changes?
- The current implementation keeps all `recentDays` in memory—should we lazy-load historical data?
