# Types Documentation

> **File:** `/src/types/stats.ts`
> **Tags:** `#types` `#typescript` `#data-structures`
> **Complexity:** Medium
> **Lines:** 111

---

## Purpose

Defines all TypeScript interfaces and types for the statistics tracking system. Provides type safety and documentation for the data structures used throughout the application.

---

## Core Data Structures

### PresenceInterval

```typescript
interface PresenceInterval {
  type: 'present' | 'away';
  start: number;        // Unix timestamp (milliseconds)
  end: number;          // Unix timestamp (milliseconds)
  confidence?: number;  // 0-1, optional
}
```

**Purpose:** Represents a continuous period of being present or away at desk

**Example:**
```typescript
{
  type: 'present',
  start: 1737523200000,  // 2026-01-21 14:00:00
  end: 1737526800000,    // 2026-01-21 15:00:00
  confidence: 0.85
}
```

---

### PresenceSession

```typescript
interface PresenceSession {
  id: string;              // Unique identifier (e.g., "session_1737523200000")
  start: number;           // Unix timestamp (ms)
  end: number | null;      // null if session ongoing
  presence: PresenceInterval[];
}
```

**Purpose:** A single tracking session containing multiple presence/away intervals

**Example:**
```typescript
{
  id: "session_1737523200000",
  start: 1737523200000,
  end: 1737530400000,
  presence: [
    { type: 'present', start: 1737523200000, end: 1737526800000 },
    { type: 'away', start: 1737526800000, end: 1737527100000 },
    { type: 'present', start: 1737527100000, end: 1737530400000 }
  ]
}
```

**Structure:**
- Session starts when user clicks "Start Session"
- Contains array of alternating present/away intervals
- `end` is `null` until session manually stopped or midnight

---

### DailyStats

```typescript
interface DailyStats {
  date: string;            // ISO date "YYYY-MM-DD"
  sessions: PresenceSession[];
  totalDeskTime: number;   // Cached total (seconds)
  totalBreakTime: number;  // Cached total (seconds)
  goalHours: number;       // Daily goal for this day
  lastUpdated: number;     // Unix timestamp (ms)
}
```

**Purpose:** All statistics for a single day

**Calculation:**
```typescript
totalDeskTime = sum of all 'present' intervals (in seconds)
totalBreakTime = sum of all 'away' intervals (in seconds)
```

**Example:**
```typescript
{
  date: "2026-01-21",
  sessions: [...],  // Array of sessions
  totalDeskTime: 14400,  // 4 hours
  totalBreakTime: 1800,  // 30 minutes
  goalHours: 4,
  lastUpdated: 1737530400000
}
```

---

### WeeklyAggregate

```typescript
interface WeeklyAggregate {
  weekStart: string;       // ISO date of Monday
  totalDeskTime: number;   // Seconds
  totalBreakTime: number;  // Seconds
  avgDailyHours: number;   // Average hours per day
  daysActive: number;      // Days with any activity
}
```

**Purpose:** Aggregated statistics for one week (Monday-Sunday)

**Created:** Automatically when detailed sessions older than 7 days

**Example:**
```typescript
{
  weekStart: "2026-01-13",  // Monday
  totalDeskTime: 72000,     // 20 hours total
  totalBreakTime: 7200,     // 2 hours total
  avgDailyHours: 2.86,      // 20/7 days
  daysActive: 5             // Worked 5 out of 7 days
}
```

---

### MonthlyAggregate

```typescript
interface MonthlyAggregate {
  monthStart: string;      // ISO date "YYYY-MM-01"
  totalDeskTime: number;   // Seconds
  totalBreakTime: number;  // Seconds
  avgDailyHours: number;   // Average hours per day
  daysActive: number;      // Days with activity
}
```

**Purpose:** Aggregated statistics for one month

**Created:** Automatically when weekly aggregates older than 52 weeks

**Example:**
```typescript
{
  monthStart: "2026-01-01",
  totalDeskTime: 288000,    // 80 hours
  totalBreakTime: 28800,    // 8 hours
  avgDailyHours: 2.58,      // 80/(31 days)
  daysActive: 20            // Worked 20 days
}
```

---

### AllTimeStats

```typescript
interface AllTimeStats {
  totalDeskTime: number;   // Seconds (all time)
  startDate: string;       // ISO date of first tracking
  daysTracked: number;     // Total days with activity
  avgDailyHours: number;   // Average across all days
}
```

**Purpose:** Lifetime statistics across all tracked time

**Example:**
```typescript
{
  totalDeskTime: 1440000,   // 400 hours
  startDate: "2025-06-01",
  daysTracked: 150,
  avgDailyHours: 2.67       // 400/150
}
```

---

### UserSettings

```typescript
interface UserSettings {
  dailyGoalHours: number;        // Default: 4
  weeklyGoalHours: number;       // Default: 20
  breakReminderEnabled: boolean; // Default: true
  breakReminderInterval: number; // Minutes, default: 120
}
```

**Purpose:** User preferences and goals

**Defaults:**
```typescript
{
  dailyGoalHours: 4,
  weeklyGoalHours: 20,
  breakReminderEnabled: true,
  breakReminderInterval: 120  // 2 hours
}
```

---

### NotificationPreferences

```typescript
interface NotificationPreferences {
  enabled: boolean;        // Permission granted
  breakReminders: boolean; // Show break reminders
  goalAchieved: boolean;   // Future: celebrate goal
  weeklyReport: boolean;   // Future: weekly summary
}
```

**Purpose:** Notification settings (some features planned for future)

---

### StatsData (Root Structure)

```typescript
interface StatsData {
  recentDays: {
    [date: string]: DailyStats  // Last 7 days
  };
  historicalWeeks: WeeklyAggregate[];    // 52 weeks
  historicalMonths: MonthlyAggregate[];  // 24 months
  allTime: AllTimeStats;
  settings: UserSettings;
  notifications: NotificationPreferences;
}
```

**Purpose:** Complete statistics data structure stored in localStorage

**Example:**
```typescript
{
  recentDays: {
    "2026-01-21": DailyStats,
    "2026-01-20": DailyStats,
    // ... last 7 days
  },
  historicalWeeks: [
    WeeklyAggregate,  // 52 weeks
    // ...
  ],
  historicalMonths: [
    MonthlyAggregate,  // 24 months
    // ...
  ],
  allTime: AllTimeStats,
  settings: UserSettings,
  notifications: NotificationPreferences
}
```

---

## Constants

### DEFAULT_SETTINGS

```typescript
{
  dailyGoalHours: 4,
  weeklyGoalHours: 20,
  breakReminderEnabled: true,
  breakReminderInterval: 120
}
```

### DEFAULT_NOTIFICATIONS

```typescript
{
  enabled: false,           // Requires permission
  breakReminders: true,
  goalAchieved: true,
  weeklyReport: false
}
```

### STORAGE_KEYS

```typescript
{
  STATS: 'aideskwatch_stats',
  CONFIG: 'aideskwatch_config'
}
```

### RETENTION_POLICY

```typescript
{
  DETAILED_SESSIONS_DAYS: 7,   // Keep 7 days detailed
  WEEKLY_AGGREGATES: 52,        // Keep 52 weeks
  MONTHLY_AGGREGATES: 24        // Keep 24 months
}
```

---

## Data Lifecycle

### Day 0-6: Detailed Storage
```
recentDays["2026-01-21"] = DailyStats with full sessions[]
```

### Day 7+: Weekly Aggregation
```
Sessions aggregated → WeeklyAggregate
Removed from recentDays
Added to historicalWeeks[]
```

### Week 52+: Monthly Aggregation
```
Weeks aggregated → MonthlyAggregate
Removed from historicalWeeks
Added to historicalMonths[]
```

### All Time: Continuous Update
```
allTime stats updated on every save
Never deleted
```

---

## Type Safety Benefits

**Prevents:**
- Wrong data types in statistics
- Missing required fields
- Invalid date formats
- Inconsistent structure

**Provides:**
- Autocomplete in IDE
- Compile-time error checking
- Clear documentation
- Refactoring safety

---

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[hooks/useStatsTracking|useStatsTracking]] - Uses these types
- [[utils/statsStorage|statsStorage]] - Persists these structures
- [[algorithms/DATA-AGGREGATION|Data Aggregation]]

---

## Usage Examples

### Creating a Session
```typescript
const session: PresenceSession = {
  id: `session_${Date.now()}`,
  start: Date.now(),
  end: null,
  presence: []
};
```

### Adding an Interval
```typescript
const interval: PresenceInterval = {
  type: 'present',
  start: Date.now(),
  end: Date.now()
};
session.presence.push(interval);
```

### Calculating Totals
```typescript
const totalDeskTime = stats.recentDays["2026-01-21"].sessions.reduce(
  (sum, session) => sum + session.presence
    .filter(i => i.type === 'present')
    .reduce((s, i) => s + (i.end - i.start) / 1000, 0),
  0
);
```

---

**All types documented!**
