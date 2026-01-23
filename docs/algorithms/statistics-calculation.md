# Statistics Calculation with Manual Session Control

## Overview

With the new manual session control, users explicitly start and stop work sessions. Statistics are calculated by aggregating data from **all sessions** throughout the day.

---

## Session Model

### PresenceSession Structure

```typescript
interface PresenceSession {
  id: string; // Unique identifier: "session_${timestamp}"
  start: number; // Session start time (Unix timestamp in ms)
  end: number | null; // Session end time (null if ongoing)
  presence: PresenceInterval[]; // Array of presence/away intervals
}
```

### PresenceInterval Structure

```typescript
interface PresenceInterval {
  type: 'present' | 'away'; // User state during this interval
  start: number; // Interval start time (Unix timestamp in ms)
  end: number; // Interval end time (Unix timestamp in ms)
  confidence?: number; // Optional: detection confidence (0-1)
}
```

---

## Statistics Calculations

### 1. Total Desk Time

**Definition**: Total time the user was actively present at their desk across ALL sessions.

**Formula**:

```typescript
const totalDeskTime = sessions.reduce((dayTotal, session) => {
  const sessionDeskTime = session.presence
    .filter((interval) => interval.type === 'present')
    .reduce((sum, interval) => {
      return sum + (interval.end - interval.start) / 1000; // ms → seconds
    }, 0);
  return dayTotal + sessionDeskTime;
}, 0);
```

**Example**:

```
Day with 2 sessions:

Session 1 (9:00 AM - 11:00 AM):
  ├─ present: 9:00-10:00 → 3600s (1 hour)
  ├─ away: 10:00-10:15 → 900s (break)
  └─ present: 10:15-11:00 → 2700s (45 min)
  Session 1 Desk Time = 3600 + 2700 = 6300s

Session 2 (2:00 PM - 4:00 PM):
  ├─ present: 2:00-3:30 → 5400s (1.5 hours)
  ├─ away: 3:30-3:45 → 900s (break)
  └─ present: 3:45-4:00 → 900s (15 min)
  Session 2 Desk Time = 5400 + 900 = 6300s

Total Desk Time = 6300 + 6300 = 12,600s = 3h 30m
```

---

### 2. Total Break Time

**Definition**: Total time the user was away from their desk within active sessions.

**Formula**:

```typescript
const totalBreakTime = sessions.reduce((dayTotal, session) => {
  const sessionBreakTime = session.presence
    .filter((interval) => interval.type === 'away')
    .reduce((sum, interval) => {
      return sum + (interval.end - interval.start) / 1000;
    }, 0);
  return dayTotal + sessionBreakTime;
}, 0);
```

**Example** (from above):

```
Session 1 Break Time = 900s (15 min)
Session 2 Break Time = 900s (15 min)

Total Break Time = 1800s = 30m
```

**Note**: Time between sessions (e.g., 11:00 AM to 2:00 PM) is NOT counted as break time.

---

### 3. Continuous Desk Time

**Definition**: Duration of the current uninterrupted presence interval.

**Formula**:

```typescript
if (currentInterval.type === 'present') {
  const continuousDeskTime = (Date.now() - currentInterval.start) / 1000;
}
```

**Behavior**:

- Starts at 0 when user becomes present
- Increments every second while present
- **Resets to 0** when user becomes away
- Used for break reminder notifications

**Example**:

```
10:00 AM - User present → continuousDeskTime = 0s
10:05 AM - Still present → continuousDeskTime = 300s (5 min)
10:10 AM - User away → continuousDeskTime = 0s (RESET)
10:15 AM - User returns → continuousDeskTime = 0s
10:20 AM - Still present → continuousDeskTime = 300s (5 min)
```

---

### 4. Session Count

**Definition**: Number of work sessions for the day (completed + ongoing).

**Formula**:

```typescript
const sessionCount = todayStats.sessions.length;

// Active session with end === null is included in the count
```

**Example**:

```
Sessions:
├─ Session 1: 9:00 AM - 11:00 AM (completed)
├─ Session 2: 2:00 PM - 4:00 PM (completed)
└─ Session 3: 6:00 PM - ongoing (active)

Session Count = 3
```

---

### 5. Goal Progress

**Definition**: Percentage of daily goal achieved based on total desk time.

**Formula**:

```typescript
const currentHours = totalDeskTime / 3600; // seconds → hours
const goalProgress = Math.min(
  Math.round((currentHours / goalHours) * 100),
  100 // Cap at 100%
);
```

**Example**:

```
Total Desk Time = 12,600s = 3.5 hours
Daily Goal = 4 hours

Goal Progress = (3.5 / 4) × 100 = 87.5% → 88%
```

**Display Colors**:

- ≥100%: Green (Goal achieved! 🎯)
- ≥80%: Light green
- ≥50%: Yellow
- ≥25%: Orange
- <25%: Red

---

## Per-Session Statistics

Individual sessions can also calculate their own statistics:

### Session Desk Time

```typescript
const sessionDeskTime = session.presence
  .filter((i) => i.type === 'present')
  .reduce((sum, i) => sum + (i.end - i.start) / 1000, 0);
```

### Session Break Time

```typescript
const sessionBreakTime = session.presence
  .filter((i) => i.type === 'away')
  .reduce((sum, i) => sum + (i.end - i.start) / 1000, 0);
```

### Session Duration

```typescript
const sessionDuration = session.end
  ? (session.end - session.start) / 1000
  : (Date.now() - session.start) / 1000;
```

### Session Interval Count

```typescript
const intervalCount = session.presence.length;
```

---

## Data Flow

### 1. User Workflow

```
User clicks "Start Camera"
    ↓
Camera activates, pose detection begins
    ↓
User clicks "Start Session"
    ↓
New PresenceSession created with empty presence array
    ↓
Camera detects presence → PresenceInterval added (type: 'present')
    ↓
User leaves frame → Current interval ended, new interval (type: 'away')
    ↓
User returns → Away interval ended, new interval (type: 'present')
    ↓
[... continues ...]
    ↓
User clicks "Stop Session"
    ↓
Current interval ended, session.end = now
    ↓
Session saved to DailyStats.sessions[]
    ↓
Statistics recalculated from all sessions
```

### 2. Automatic Calculations

Every **5 seconds** (while session is active):

- Update current interval's `end` time
- Recalculate `totalDeskTime` and `totalBreakTime`
- Save updated session to `DailyStats`
- Persist to localStorage

Every **1 second** (while user is present):

- Update `continuousDeskTime`
- Check for break reminder threshold (default: 120 minutes)

---

## Key Differences from Automatic Model

| Aspect                | Automatic (Old)             | Manual (New)                           |
| --------------------- | --------------------------- | -------------------------------------- |
| Session Creation      | Automatic on first presence | User clicks "Start Session"            |
| Session Ending        | Only at midnight            | User clicks "Stop Session" OR midnight |
| Sessions per Day      | Typically 1 continuous      | Multiple discrete sessions             |
| Time Between Sessions | Counted as away time        | NOT tracked                            |
| User Control          | Passive monitoring          | Active session management              |
| Best For              | All-day desk tracking       | Focused work periods                   |

---

## Storage Format

### DailyStats in localStorage

```json
{
  "date": "2026-01-09",
  "sessions": [
    {
      "id": "session_1736419200000",
      "start": 1736419200000,
      "end": 1736426400000,
      "presence": [
        { "type": "present", "start": 1736419200000, "end": 1736422800000 },
        { "type": "away", "start": 1736422800000, "end": 1736423700000 },
        { "type": "present", "start": 1736423700000, "end": 1736426400000 }
      ]
    }
  ],
  "totalDeskTime": 6300,
  "totalBreakTime": 900,
  "goalHours": 4,
  "lastUpdated": 1736426400000
}
```

---

## Usage in UI Components

### DailyStats Component

```typescript
<StatBox title="At Desk" value={formatDeskTime(stats.totalDeskTime)} />
<StatBox title="Break Time" value={formatDeskTime(stats.totalBreakTime)} />
<StatBox title="Sessions" value={stats.sessions.length} />
<GoalProgressBox goalProgress={goalProgress} goalHours={stats.goalHours} />
```

### StatsModal - Today Tab

```typescript
{
  todayStats.sessions.map((session) => (
    <SessionCard key={session.id}>
      <SessionTime>
        {formatTime(session.start)} -{' '}
        {session.end ? formatTime(session.end) : 'Ongoing'}
      </SessionTime>
      <SessionStats>
        Desk: {calculateSessionDeskTime(session)}
        Break: {calculateSessionBreakTime(session)}
        Intervals: {session.presence.length}
      </SessionStats>
    </SessionCard>
  ));
}
```

---

## Testing Calculations

To verify statistics are calculated correctly:

1. **Start a session** → Check sessions.length = 1
2. **Stay present for 5 minutes** → Check totalDeskTime ≈ 300s
3. **Leave frame for 2 minutes** → Check totalBreakTime ≈ 120s
4. **Return for 3 minutes** → Check totalDeskTime ≈ 480s
5. **Stop session** → Verify session.end is set
6. **Start new session** → Check sessions.length = 2
7. **Check daily totals** → Should sum across both sessions

---

## Notes

- All timestamps are stored in **milliseconds** (Unix epoch)
- Calculations convert to **seconds** for display
- Sessions persist across page reloads via localStorage
- Midnight rollover automatically ends active sessions
- Multi-tab coordination ensures only one tab tracks at a time
