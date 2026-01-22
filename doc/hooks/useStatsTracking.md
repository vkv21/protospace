# useStatsTracking Hook ⭐

> **File:** `/src/hooks/useStatsTracking.ts`
> **Tags:** `#hooks` `#tracking` `#statistics` `#sessions` `#multi-tab` `#core`
> **Complexity:** Very High
> **Lines:** 582

---

## 1. File/Module Name

`useStatsTracking.ts` - **CORE TRACKING HOOK** - Session management, statistics calculation, multi-tab coordination

## 2. Purpose & Role

The brain of the application. Manages manual session start/stop, creates presence intervals based on user state, calculates aggregate statistics, handles multi-tab coordination via leader election, and persists data to localStorage. This is where all the tracking magic happens.

## 3. Inputs

```typescript
{
  isPresent: boolean,    // From usePresenceTracking
  lastSeen: Date | null  // Currently unused
}
```

## 4. Outputs

```typescript
{
  todayStats: DailyStats | null,           // Today's aggregated stats
  currentSession: PresenceSession | null,  // Active session or null
  isTracking: boolean,                     // Session active + leader
  continuousDeskTime: number,              // Seconds in current present interval
  recentDays: Record<string, DailyStats>,  // Last 7 days
  goalHours: number,                       // Daily goal setting
  fullStats: StatsData,                    // All data (for export)
  updateSettings: (settings) => void,      // Update user settings
  startSession: () => void,                // Manual start
  stopSession: () => void                  // Manual stop
}
```

## 5. Key Logic & Flow

### Session Lifecycle

#### Start Session
```
1. User clicks "Start Session"
2. startSession() called
3. Check: isLeader && no active session
4. Create PresenceSession object
5. Create initial interval (present or away)
6. setCurrentSession(newSession)
7. Reset continuousDeskTime
```

#### During Session
```
Every second:
1. Update current interval end time
2. If present: update continuousDeskTime
3. Update currentSession state

Every 5 seconds:
1. Calculate aggregate totals from all intervals
2. Save session to todayStats
3. Persist to localStorage

On isPresent change:
1. End current interval
2. Start new interval (opposite type)
3. Update currentSession.presence array
```

#### Stop Session
```
1. User clicks "Stop Session" OR midnight occurs
2. stopSession() called
3. End current interval
4. Set session.end = now
5. Add completed session to todayStats.sessions
6. Recalculate totalDeskTime, totalBreakTime
7. Save to localStorage
8. Clear currentSession
```

### Multi-Tab Coordination (Leader Election)

```
Tab Opens:
1. Create BroadcastChannel('commitspace_tracking')
2. Send "HELLO" message
3. Start 500ms timeout
4. If another tab sends "I_AM_LEADER" → become follower
5. If timeout expires → become leader

Leader Tab:
- Broadcasts "I_AM_LEADER" every 5 seconds
- Performs all tracking operations
- Writes to localStorage

Follower Tab:
- Reads from localStorage (no writes)
- Shows "Tracking in another tab" message
- Waits for leader to close

Leader Tab Closes:
- Stops broadcasting
- After 500ms, follower becomes leader
- Continues tracking seamlessly
```

### Interval Creation Logic

```typescript
// isPresent changes from false → true
if (isPresent && !wasPresent) {
  // End current 'away' interval
  currentIntervalRef.current.end = now;
  
  // Start new 'present' interval
  const newInterval = { type: 'present', start: now, end: now };
  currentSession.presence.push(newInterval);
}

// isPresent changes from true → false
if (!isPresent && wasPresent) {
  // End current 'present' interval
  currentIntervalRef.current.end = now;
  
  // Start new 'away' interval
  const awayInterval = { type: 'away', start: now, end: now };
  currentSession.presence.push(awayInterval);
  
  // Reset continuous desk time
  setContinuousDeskTime(0);
}
```

### Aggregate Calculation

```typescript
// Total desk time = sum of all 'present' intervals
totalDeskTime = sessions.reduce((sum, session) =>
  sum + session.presence
    .filter(i => i.type === 'present')
    .reduce((s, i) => s + (i.end - i.start) / 1000, 0)
, 0);

// Total break time = sum of all 'away' intervals
totalBreakTime = sessions.reduce((sum, session) =>
  sum + session.presence
    .filter(i => i.type === 'away')
    .reduce((s, i) => s + (i.end - i.start) / 1000, 0)
, 0);
```

### Midnight Rollover

```
Check every 10 seconds:
1. Compare todayStats.date with current date
2. If different:
   - End active session at midnight
   - Save to old date
   - Call aggregateOldSessions() (archive 7+ day data)
   - Create new DailyStats for new date
   - Clear currentSession
```

## 6. External Dependencies

- [[types/stats|stats]] - Type definitions
- [[utils/statsStorage|statsStorage]] - Persistence functions
- `BroadcastChannel` API - Multi-tab communication
- React hooks: useState, useEffect, useRef, useCallback

## 7. Integration Points

### Used By:
- [[components/VideoCapture|VideoCapture]] (src/components/VideoCapture.tsx:100)

### Depends On:
- [[hooks/usePresenceTracking|usePresenceTracking]] - Receives isPresent

### Consumed By:
- [[components/DailyStats|DailyStats]] - Displays statistics
- [[components/StatsModal|StatsModal]] - Detailed stats view
- [[hooks/useNotifications|useNotifications]] - Uses continuousDeskTime

### Data Flow:
```
usePresenceTracking (isPresent)
    ↓
useStatsTracking (sessions, stats)
    ↓
├─→ DailyStats (UI display)
├─→ StatsModal (detailed view)
└─→ useNotifications (break reminders)
```

## 8. Edge Cases & Notable Behaviors

### Manual Session Control
- **Key Difference:** Unlike auto-tracking, user must click "Start Session"
- Sessions don't automatically resume after app restart
- User has full control over when tracking occurs

### Multi-Tab Safety
- Only leader tab writes to localStorage
- Prevents data corruption from concurrent writes
- Seamless handoff when leader closes

### Midnight Rollover
- Active sessions end at midnight (00:00:00)
- New session must be manually started in new day
- Old data automatically aggregated

### Data Consistency
- Current session saved every 5 seconds (prevents data loss)
- Intervals updated every second (real-time accuracy)
- localStorage sync happens on every save

### Session Validation
- Can't start if session already active
- Can't stop if no active session
- Leader check before all write operations

### Ref Pattern
```typescript
isLeaderRef.current  // Sync version (for immediate checks)
isLeader             // State version (for UI rendering)
```
**Why both?** Ref for quick checks in intervals, state for React rendering.

## 9. Tests

**Current:** No tests

**Critical Tests Needed:**
- Interval creation on presence changes
- Aggregate calculation correctness
- Multi-tab leader election
- Midnight rollover logic
- Session start/stop validation
- localStorage persistence

## 10. Questions / TODOs

### Open Questions
1. **Auto-resume:** Should sessions auto-resume on app reload?
2. **Session limit:** Should we limit sessions per day?
3. **Interval merging:** Should adjacent same-type intervals be merged?
4. **Leader ping:** Is 5-second interval appropriate?

### Known Issues
1. **NodeJS.Timeout type:** TypeScript error on line 44 (browser environment)
2. **Continuous desk time:** Resets on away, not on session end

### Potential Improvements
- Add session pause/resume
- Add session naming/notes
- Add manual interval editing
- Export individual sessions
- Cloud backup (optional)

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[hooks/usePresenceTracking|usePresenceTracking]] - Provides isPresent
- [[utils/statsStorage|statsStorage]] - Persistence layer
- [[types/stats|stats]] - Data structures
- [[features/SESSION-TRACKING|Session Tracking Feature]]
- [[features/MULTI-TAB-SYNC|Multi-Tab Synchronization]]
- [[algorithms/LEADER-ELECTION|Leader Election Algorithm]]
- [[algorithms/DATA-AGGREGATION|Data Aggregation]]

## Quick Reference

### Start Tracking
```typescript
const { startSession, isTracking } = useStatsTracking({ isPresent });
startSession(); // User must call manually
```

### Stop Tracking
```typescript
stopSession(); // Ends session, saves data
```

### Access Statistics
```typescript
const { todayStats, currentSession, continuousDeskTime, recentDays } = 
  useStatsTracking({ isPresent });

// todayStats.totalDeskTime - seconds at desk today
// currentSession - active session or null
// continuousDeskTime - current present interval duration
// recentDays - last 7 days of data
```

---

**This is the most complex hook in the application. Review carefully!**
