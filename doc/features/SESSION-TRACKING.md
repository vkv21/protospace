# Session Tracking Feature

**Tags:** #feature #tracking #sessions #statistics  
**Related:** [[useStatsTracking]], [[LEADER-ELECTION]], [[DATA-AGGREGATION]], [[usePresenceTracking]]  
**Complexity:** Very High  
**Last Updated:** 2026-01-21

---

## Overview

**Session Tracking** is the core data collection feature that records when users are at their desk vs. away, building a detailed timeline of presence intervals. It creates structured session objects that power all statistics, visualizations, and insights in the application.

**User Benefit:** Automatic, accurate tracking of desk time and breaks without manual timers.

**Key Innovation:** Client-side, privacy-first tracking with continuous updates, automatic persistence, and multi-tab coordination.

---

## Feature Architecture

### Data Flow

```
┌──────────────────┐
│ Camera Feed      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Pose Detection   │ (MediaPipe AI)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Presence         │ (Hysteresis filtering)
│ Detection        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ SESSION          │ ◄─── YOU ARE HERE
│ TRACKING         │
│                  │
│ Creates:         │
│ - Sessions       │
│ - Intervals      │
│ - Statistics     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ localStorage     │ (Persistent storage)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ UI Components    │ (Stats, charts, goals)
└──────────────────┘
```

---

## Core Concepts

### 1. Session

**Definition:** A continuous tracking period from "Start Tracking" to "Stop Tracking" button click.

**Structure:**
```typescript
interface PresenceSession {
  id: string;              // Unique ID: "session_<timestamp>"
  start: number;           // Unix timestamp (ms) when tracking started
  end: number | null;      // Unix timestamp (ms) when stopped, or null if active
  presence: PresenceInterval[];  // Timeline of present/away intervals
}
```

**Example:**
```typescript
{
  id: "session_1737492000000",
  start: 1737492000000,  // 2026-01-21 09:00:00
  end: 1737499200000,    // 2026-01-21 11:00:00
  presence: [
    { type: "present", start: 1737492000000, end: 1737493800000 },  // 30 min
    { type: "away", start: 1737493800000, end: 1737494100000 },     // 5 min
    { type: "present", start: 1737494100000, end: 1737499200000 },  // 1h 25min
  ]
}
```

**Lifecycle:**
1. Created when user clicks "Start Tracking"
2. Continuously updated with presence intervals every 1 second
3. Saved to localStorage every 5 seconds
4. Ended when user clicks "Stop Tracking" or midnight occurs

*File: `src/types/stats.ts:1-6`*

### 2. Presence Interval

**Definition:** A contiguous period of either "present" or "away" within a session.

**Structure:**
```typescript
interface PresenceInterval {
  type: 'present' | 'away';  // User state
  start: number;             // Unix timestamp (ms) interval started
  end: number;               // Unix timestamp (ms) interval ended
}
```

**Rules:**
- Intervals never overlap
- Each interval ends exactly when next begins
- `end` timestamp continuously updated until state changes
- Final interval in active session has `end` = current time

*File: `src/types/stats.ts:17-21`*

### 3. Daily Stats

**Definition:** Aggregation of all sessions for a single calendar day.

**Structure:**
```typescript
interface DailyStats {
  date: string;           // ISO date: "2026-01-21"
  sessions: PresenceSession[];  // All sessions that day
  totalDeskTime: number;  // Sum of all "present" intervals (seconds)
  totalBreakTime: number; // Sum of all "away" intervals (seconds)
  goalHours: number;      // Daily goal for this day
  lastUpdated: number;    // Last save timestamp
}
```

**Calculation Example:**
```
Session 1: 30 min present, 5 min away, 25 min present
Session 2: 1 hour present, 10 min away, 30 min present

totalDeskTime = 30 + 25 + 60 + 30 = 145 minutes
totalBreakTime = 5 + 10 = 15 minutes
```

*File: `src/types/stats.ts:8-15`*

---

## Feature Implementation

### Starting a Session

**User Action:** Click "Start Tracking" button

**Code Flow:**
```typescript
const startSession = useCallback(() => {
  if (!isLeaderRef.current) {
    console.warn('Cannot start session: not leader');
    return;  // Only leader tab can track
  }

  const now = Date.now();
  const newSession: PresenceSession = {
    id: `session_${now}`,
    start: now,
    end: null,  // Active session
    presence: [],
  };

  // If user already present, start with presence interval
  if (isPresent) {
    newSession.presence.push({
      type: 'present',
      start: now,
      end: now,  // Will be updated continuously
    });
    currentIntervalRef.current = newSession.presence[0];
  } else {
    // Start with away interval
    newSession.presence.push({
      type: 'away',
      start: now,
      end: now,
    });
    currentIntervalRef.current = newSession.presence[0];
  }

  setCurrentSession(newSession);
  lastPresenceRef.current = isPresent;
}, [isPresent]);
```

**Result:**
- New session created with unique ID
- First interval matches current presence state
- Continuous update loop starts

*File: `src/hooks/useStatsTracking.ts:85-131`*

### Updating Intervals (Continuous)

**Trigger:** `setInterval` runs every 1 second

**Logic:**
```typescript
useEffect(() => {
  if (!currentSession || currentSession.end !== null) return;

  const interval = setInterval(() => {
    const now = Date.now();

    if (currentIntervalRef.current) {
      // Extend current interval's end time
      currentIntervalRef.current.end = now;

      // Update continuous desk time counter (if present)
      if (currentIntervalRef.current.type === 'present') {
        const elapsed = Math.floor((now - intervalStartRef.current) / 1000);
        setContinuousDeskTime(elapsed);
      }

      // Update session in state
      setCurrentSession(prev => {
        if (!prev) return null;
        const updatedPresence = [...prev.presence];
        updatedPresence[updatedPresence.length - 1] = {
          ...currentIntervalRef.current!
        };
        return { ...prev, presence: updatedPresence };
      });
    }
  }, 1000);  // Every 1 second

  return () => clearInterval(interval);
}, [currentSession]);
```

**Result:**
- Current interval's `end` timestamp updated every second
- UI shows real-time desk time counter
- Session object stays fresh

*File: `src/hooks/useStatsTracking.ts:364-402`*

### Handling Presence Changes

**Trigger:** User leaves desk or returns (detected by [[usePresenceTracking]])

**Logic:**
```typescript
useEffect(() => {
  if (!currentSession || currentSession.end !== null) return;

  const now = Date.now();
  const wasPresent = lastPresenceRef.current;

  // State change: away → present
  if (isPresent && !wasPresent) {
    console.log('Presence detected, starting interval');

    // End current away interval
    if (currentIntervalRef.current?.type === 'away') {
      currentIntervalRef.current.end = now;
    }

    // Start new presence interval
    const newInterval: PresenceInterval = {
      type: 'present',
      start: now,
      end: now,
    };
    currentIntervalRef.current = newInterval;
    intervalStartRef.current = now;

    // Add to session
    setCurrentSession(prev => prev ? {
      ...prev,
      presence: [...prev.presence, newInterval]
    } : null);
  }
  // State change: present → away
  else if (!isPresent && wasPresent) {
    console.log('Presence lost, ending interval');

    // End current presence interval
    if (currentIntervalRef.current?.type === 'present') {
      currentIntervalRef.current.end = now;
    }

    // Start away interval
    const awayInterval: PresenceInterval = {
      type: 'away',
      start: now,
      end: now,
    };
    currentIntervalRef.current = awayInterval;

    setCurrentSession(prev => prev ? {
      ...prev,
      presence: [...prev.presence, awayInterval]
    } : null);

    // Reset continuous desk time
    setContinuousDeskTime(0);
  }

  lastPresenceRef.current = isPresent;
}, [isPresent, currentSession]);
```

**Result:**
- Presence state changes create new intervals
- Previous interval ended at exact moment of change
- No gaps or overlaps in timeline

*File: `src/hooks/useStatsTracking.ts:284-362`*

### Saving to localStorage

**Trigger:** `setInterval` runs every 5 seconds (only in leader tab)

**Logic:**
```typescript
useEffect(() => {
  if (!currentSession || !isLeaderRef.current) return;

  const saveInterval = setInterval(() => {
    const today = getTodayDate();

    setStats(prev => {
      const existingDayStats = prev.recentDays[today] || createNewDayStats(today);
      
      // Find existing session or append new
      const existingSessionIndex = existingDayStats.sessions.findIndex(
        s => s.id === currentSession.id
      );

      let updatedSessions;
      if (existingSessionIndex >= 0) {
        // Update existing session
        updatedSessions = [...existingDayStats.sessions];
        updatedSessions[existingSessionIndex] = currentSession;
      } else {
        // Add new session
        updatedSessions = [...existingDayStats.sessions, currentSession];
      }

      // Recalculate totals
      const totalDeskTime = updatedSessions.reduce((sum, session) => {
        return sum + session.presence
          .filter(i => i.type === 'present')
          .reduce((s, i) => s + (i.end - i.start) / 1000, 0);
      }, 0);

      const totalBreakTime = updatedSessions.reduce((sum, session) => {
        return sum + session.presence
          .filter(i => i.type === 'away')
          .reduce((s, i) => s + (i.end - i.start) / 1000, 0);
      }, 0);

      const updatedDayStats: DailyStats = {
        ...existingDayStats,
        sessions: updatedSessions,
        totalDeskTime,
        totalBreakTime,
        lastUpdated: Date.now(),
      };

      const newStats = {
        ...prev,
        recentDays: {
          ...prev.recentDays,
          [today]: updatedDayStats,
        },
      };

      // Save to localStorage
      saveStats(newStats);
      setTodayStats(updatedDayStats);

      return newStats;
    });
  }, 5000);  // Every 5 seconds

  return () => clearInterval(saveInterval);
}, [currentSession]);
```

**Result:**
- Session saved every 5 seconds
- Daily totals recalculated from all intervals
- Data persists across page refreshes

*File: `src/hooks/useStatsTracking.ts:403-477`*

### Stopping a Session

**User Action:** Click "Stop Tracking" button

**Code Flow:**
```typescript
const stopSession = useCallback(() => {
  if (!currentSession || currentSession.end !== null) {
    console.warn('No active session to stop');
    return;
  }

  const now = Date.now();
  console.log('Stopping session manually');

  // End current interval
  if (currentIntervalRef.current) {
    currentIntervalRef.current.end = now;
  }

  // End session
  const endedSession: PresenceSession = {
    ...currentSession,
    end: now,
    presence: currentSession.presence.map((interval, idx) =>
      idx === currentSession.presence.length - 1
        ? { ...interval, end: now }
        : interval
    ),
  };

  // Save to today's stats
  const today = getTodayDate();
  setStats(prev => {
    const existingDayStats = prev.recentDays[today] || todayStats;
    const updatedSessions = [...existingDayStats.sessions, endedSession];

    // Recalculate totals
    const totalDeskTime = updatedSessions.reduce((sum, session) => {
      return sum + session.presence
        .filter(i => i.type === 'present')
        .reduce((s, i) => s + (i.end - i.start) / 1000, 0);
    }, 0);

    const totalBreakTime = updatedSessions.reduce((sum, session) => {
      return sum + session.presence
        .filter(i => i.type === 'away')
        .reduce((s, i) => s + (i.end - i.start) / 1000, 0);
    }, 0);

    const updatedDayStats: DailyStats = {
      ...existingDayStats,
      sessions: updatedSessions,
      totalDeskTime,
      totalBreakTime,
      lastUpdated: Date.now(),
    };

    const newStats = {
      ...prev,
      recentDays: {
        ...prev.recentDays,
        [today]: updatedDayStats,
      },
    };

    saveStats(newStats);
    setTodayStats(updatedDayStats);

    return newStats;
  });

  // Clear current session
  setCurrentSession(null);
  currentIntervalRef.current = null;
  setContinuousDeskTime(0);
}, [currentSession, todayStats]);
```

**Result:**
- Session marked as ended (`end` = current time)
- Final interval closed
- Session added to today's completed sessions
- State cleared, ready for new session

*File: `src/hooks/useStatsTracking.ts:133-213`*

---

## Edge Cases & Special Handling

### 1. Midnight Rollover

**Problem:** Session active at midnight should be split across days

**Solution:**
```typescript
useEffect(() => {
  const checkMidnight = () => {
    const today = getTodayDate();

    if (todayStats && todayStats.date !== today) {
      console.log('Midnight rollover detected');

      // End current session at midnight
      if (currentSession && currentSession.end === null) {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);

        const endedSession: PresenceSession = {
          ...currentSession,
          end: midnight.getTime(),
        };

        // Save to previous day
        setStats(prev => {
          const updatedDayStats: DailyStats = {
            ...todayStats,
            sessions: [...todayStats.sessions, endedSession],
            lastUpdated: Date.now(),
          };

          return {
            ...prev,
            recentDays: {
              ...prev.recentDays,
              [todayStats.date]: updatedDayStats,
            },
          };
        });

        // Clear session (user must restart tracking)
        setCurrentSession(null);
        currentIntervalRef.current = null;
      }

      // Initialize new day
      const newDayStats: DailyStats = {
        date: today,
        sessions: [],
        totalDeskTime: 0,
        totalBreakTime: 0,
        goalHours: stats.settings.dailyGoalHours,
        lastUpdated: Date.now(),
      };

      setStats(prev => ({
        ...prev,
        recentDays: {
          ...prev.recentDays,
          [today]: newDayStats,
        },
      }));
      setTodayStats(newDayStats);
    }
  };

  // Check every 10 seconds
  const interval = setInterval(checkMidnight, 10000);

  return () => clearInterval(interval);
}, [todayStats, currentSession]);
```

**Result:**
- Session ends at exact midnight (00:00:00)
- Saved to previous day
- New day starts fresh
- User must manually restart tracking

*File: `src/hooks/useStatsTracking.ts:479-551`*

### 2. Browser Tab Closed (Session Active)

**Problem:** User closes tab without stopping session

**Behavior:**
- Session remains active in localStorage
- When tab reopens, session is NOT auto-resumed
- User sees stats from closed session but must start new session
- Old session remains with `end: null` (considered abandoned)

**Potential Enhancement:**
```typescript
// Detect abandoned sessions on startup
useEffect(() => {
  if (todayStats) {
    const abandonedSessions = todayStats.sessions.filter(s => s.end === null);
    if (abandonedSessions.length > 0) {
      console.warn('Found abandoned sessions:', abandonedSessions);
      // Option 1: Auto-close them
      // Option 2: Prompt user to resume or end
    }
  }
}, []);
```

**Current Status:** Not implemented (abandoned sessions remain in data)

### 3. Multi-Tab Interference

**Problem:** Multiple tabs could create duplicate sessions

**Solution:** [[LEADER-ELECTION]] ensures only leader tab can track

```typescript
const startSession = useCallback(() => {
  if (!isLeaderRef.current) {
    console.warn('Cannot start session: not leader');
    return;  // ← Follower tabs can't create sessions
  }
  // ...
});
```

**Result:** Followers can view stats but not create/modify sessions

### 4. localStorage Quota Exceeded

**Problem:** localStorage full, can't save session

**Solution:** [[DATA-AGGREGATION]] cleanup triggered automatically

```typescript
try {
  localStorage.setItem(STORAGE_KEYS.STATS_V2, JSON.stringify(stats));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    cleanupOldData(stats);  // Aggregate old sessions
    localStorage.setItem(STORAGE_KEYS.STATS_V2, JSON.stringify(stats));
  }
}
```

**Result:** Old data aggregated, current session saved successfully

---

## Statistics Calculation

### Total Desk Time

```typescript
const totalDeskTime = sessions.reduce((sum, session) => {
  return sum + session.presence
    .filter(interval => interval.type === 'present')
    .reduce((s, i) => s + (i.end - i.start) / 1000, 0);
}, 0);
```

**Unit:** Seconds
**Precision:** Exact (no rounding during calculation)

### Total Break Time

```typescript
const totalBreakTime = sessions.reduce((sum, session) => {
  return sum + session.presence
    .filter(interval => interval.type === 'away')
    .reduce((s, i) => s + (i.end - i.start) / 1000, 0);
}, 0);
```

**Unit:** Seconds
**Precision:** Exact

### Continuous Desk Time

```typescript
// In active session only
if (currentIntervalRef.current?.type === 'present') {
  const elapsed = Math.floor((now - intervalStartRef.current) / 1000);
  setContinuousDeskTime(elapsed);
} else {
  setContinuousDeskTime(0);  // Reset when away
}
```

**Purpose:** Show "Current streak" in UI
**Resets:** Every time user leaves desk

### Goal Progress

```typescript
const goalProgress = (totalDeskTime / 3600) / goalHours * 100;
```

**Example:** 6 hours worked / 8 hour goal = 75%

---

## UI Integration

### Real-Time Display

**VideoCapture component:**
```jsx
{isTracking && (
  <div>
    Desk Time Today: {formatDeskTime(todayStats?.totalDeskTime || 0)}
    Current Session: {formatDuration(continuousDeskTime)}
  </div>
)}
```

### Timeline Visualization

**TimelineChart component:**
```jsx
<TimelineChart sessions={todayStats?.sessions || []} />
```

Shows visual timeline of present (green) and away (red) intervals

### Statistics Dashboard

**DailyStats component:**
```jsx
<StatBox
  label="Desk Time"
  value={formatDeskTime(todayStats?.totalDeskTime || 0)}
/>
<StatBox
  label="Break Time"
  value={formatDuration(todayStats?.totalBreakTime || 0)}
/>
```

---

## Privacy & Security

### Client-Side Only

- All tracking happens in browser
- No data sent to external servers
- localStorage never leaves user's device

### No PII Collected

- No user identification
- No camera images stored (only landmark coordinates processed)
- No location data
- No network requests for tracking

### Data Ownership

- User owns all data (stored in their browser)
- Export feature allows data portability (CSV/JSON)
- Clear data button for permanent deletion

---

## Performance Characteristics

### Update Frequency

- **Interval updates:** Every 1 second (minimal CPU)
- **localStorage saves:** Every 5 seconds (I/O bound)
- **Presence checks:** Every 1 second (via [[usePresenceTracking]])

### Memory Usage

- **Active session:** ~1 KB in memory
- **Today's stats:** ~25 KB (50+ sessions)
- **Full stats object:** ~250 KB (7 days + aggregates)

### Battery Impact

- **Continuous tracking:** ~2-3% battery/hour (mostly camera + AI)
- **Session tracking alone:** <0.1% battery/hour (negligible)

---

## Testing

### Unit Tests

**Status:** Partially implemented

**Test Cases:**
```typescript
describe('Session tracking', () => {
  it('should create session on start', () => {
    // Call startSession()
    // Verify currentSession created with correct structure
  });
  
  it('should update interval timestamps continuously', () => {
    // Start session, wait 3 seconds
    // Verify interval.end updated 3 times
  });
  
  it('should create new interval on presence change', () => {
    // Start session (present)
    // Change to away
    // Verify 2 intervals created
  });
  
  it('should save session every 5 seconds', () => {
    // Mock saveStats
    // Start session, wait 10 seconds
    // Verify saveStats called 2 times
  });
  
  it('should end session correctly', () => {
    // Start session, wait 5 seconds, stop
    // Verify session.end = stop time
    // Verify saved to today's stats
  });
  
  it('should handle midnight rollover', () => {
    // Mock date to 23:59:50
    // Start session
    // Fast-forward to 00:00:10
    // Verify session ended at midnight
  });
});
```

### Manual Testing

**Test 1: Basic Session**
1. Start tracking → Check session created
2. Wait 30 seconds → Check time updates
3. Stop tracking → Check session saved

**Test 2: Presence Changes**
1. Start tracking (at desk)
2. Leave desk for 1 minute
3. Return to desk
4. Stop tracking
5. Verify timeline shows 3 intervals: present → away → present

**Test 3: Midnight Rollover**
1. Start tracking at 11:55 PM
2. Wait until 12:05 AM
3. Verify session ended at midnight
4. Verify saved to previous day

**Test 4: Multi-Tab**
1. Open Tab A, start tracking
2. Open Tab B
3. Try to start tracking in Tab B → Should fail (not leader)
4. Close Tab A
5. Tab B should display stats but not auto-resume tracking

---

## Related Documentation

- [[useStatsTracking]] - Hook implementing this feature
- [[LEADER-ELECTION]] - Multi-tab coordination
- [[DATA-AGGREGATION]] - Long-term storage
- [[MULTI-TAB-SYNC]] - Feature overview for multi-tab behavior
- [[usePresenceTracking]] - Provides presence state input

---

## Future Enhancements

1. **Auto-Resume Sessions:** Resume tracking on app startup if session was active
2. **Session Notes:** Allow users to add notes/tags to sessions
3. **Smart Session Splitting:** Auto-split long sessions at natural break points
4. **Idle Detection:** Pause tracking during extended idle periods (no mouse/keyboard activity)
5. **Session Goals:** Set per-session goals (e.g., "Focus for 2 hours")
6. **Break Recommendations:** Suggest breaks based on continuous desk time
7. **Export Individual Sessions:** Download single session as JSON/CSV
8. **Session History View:** Calendar view showing all past sessions

---

## Questions / TODOs

1. Should abandoned sessions (end: null) be auto-closed on startup?
2. Can we add session tagging/categorization (work vs. personal)?
3. Should we track keyboard/mouse activity to improve idle detection?
4. Could we add "pause tracking" feature (different from away state)?
5. Should sessions auto-split after 8 hours to prevent extremely long sessions?
