# Data Aggregation Algorithm

**Tags:** #algorithm #data-management #storage #retention-policy  
**Related:** [[statsStorage|statsStorage.ts]], [[useStatsTracking]], [[SESSION-TRACKING]]  
**Complexity:** High  
**Last Updated:** 2026-01-21

---

## Overview

The **Data Aggregation Algorithm** progressively compresses historical tracking data to prevent localStorage overflow while preserving long-term statistics. It implements a **three-tier retention pyramid**: detailed sessions (7 days) → weekly summaries (52 weeks) → monthly aggregates (unlimited).

**Purpose:** Balance granular detail for recent data with long-term trends without exceeding browser storage limits.

**Key Innovation:** Time-based automatic aggregation with progressive summarization that runs transparently during midnight rollovers and quota exceeded events.

---

## Problem Statement

### Storage Limitations

**localStorage quota:** ~5-10 MB per domain (varies by browser)

**Data growth without aggregation:**
```
1 day of tracking:
- ~50 sessions (user takes breaks)
- Each session: ~500 bytes (timestamps + intervals)
- Total: 25 KB/day

1 year = 25 KB × 365 = 9.1 MB  ← Exceeds quota!
```

**Result:** App crashes after ~6-8 months of usage

### Solution: Progressive Aggregation

```
Recent Data (0-7 days):
  Store full detail (every session, every interval)
  Size: ~175 KB

Historical Data (7 days - 1 year):
  Aggregate into weekly summaries (no individual sessions)
  Size: ~25 KB (52 weeks × 500 bytes)

Ancient Data (1+ year):
  Aggregate into monthly summaries
  Size: ~50 KB (100 months × 500 bytes)

Total: ~250 KB (well under 5 MB quota)
```

---

## Three-Tier Data Model

### Tier 1: Detailed Sessions (recentDays)

**Retention:** Last 7 days

**Structure:**
```typescript
recentDays: {
  "2026-01-21": {
    date: "2026-01-21",
    sessions: [
      {
        id: "session_1737492000000",
        start: 1737492000000,
        end: 1737495600000,
        presence: [
          { type: "present", start: 1737492000000, end: 1737493800000 },
          { type: "away", start: 1737493800000, end: 1737494100000 },
          // ... more intervals
        ]
      },
      // ... more sessions
    ],
    totalDeskTime: 14400,  // seconds
    totalBreakTime: 3600,
    goalHours: 8,
    lastUpdated: 1737495600000
  },
  // ... up to 7 days
}
```

**Size:** ~25 KB per day × 7 days = ~175 KB

*File: `src/types/stats.ts:8-15`*

### Tier 2: Weekly Aggregates (historicalWeeks)

**Retention:** Last 52 weeks (~1 year)

**Structure:**
```typescript
historicalWeeks: [
  {
    weekStart: "2025-01-13",  // Monday of that week
    totalDeskTime: 144000,     // seconds (40 hours)
    totalBreakTime: 21600,     // seconds (6 hours)
    avgDailyHours: 8.0,        // average per active day
    daysActive: 5              // 5 workdays
  },
  // ... up to 52 weeks
]
```

**Data Loss:**
- Individual sessions eliminated (can't see exact break times)
- Presence intervals eliminated (can't reconstruct timeline)

**Data Preserved:**
- Total desk time per week
- Total break time per week
- Average daily hours
- Days active in that week

**Size:** ~500 bytes per week × 52 weeks = ~25 KB

*File: `src/types/stats.ts:22-28`*

### Tier 3: Monthly Aggregates (historicalMonths)

**Retention:** Unlimited (practical limit ~100 months)

**Structure:**
```typescript
historicalMonths: [
  {
    monthStart: "2024-01-01",
    totalDeskTime: 576000,     // seconds (160 hours)
    totalBreakTime: 86400,     // seconds (24 hours)
    avgDailyHours: 8.0,
    daysActive: 20
  },
  // ... unlimited months
]
```

**Data Loss:**
- Week-by-week breakdown eliminated

**Data Preserved:**
- Total desk time per month
- Total break time per month
- Average daily hours
- Days active in that month

**Size:** ~500 bytes per month × 100 months = ~50 KB

*File: `src/types/stats.ts:31-37`*

---

## Algorithm: Session Aggregation (Days → Weeks)

### Trigger Conditions

1. **Automatic:** Runs during midnight rollover (daily)
2. **On-demand:** Runs when localStorage quota exceeded
3. **Manual:** Can be called via `aggregateOldSessions(stats)`

*File: `src/utils/statsStorage.ts:90`*

### Algorithm Steps

**Step 1: Identify Old Days**

```typescript
const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const cutoffISO = cutoffDate.toISOString().split('T')[0];

const daysToAggregate = Object.entries(stats.recentDays).filter(
  ([date, dayStats]) => date < cutoffISO
);
```

**Logic:** Any day older than 7 days is eligible for aggregation

*File: `src/utils/statsStorage.ts:92-105`*

**Step 2: Group Days by Week**

```typescript
const weekGroups = new Map<string, DailyStats[]>();

daysToAggregate.forEach(([date, dayStats]) => {
  const weekStartDate = getWeekStartDate(new Date(date));  // Get Monday
  const weekStart = weekStartDate.toISOString().split('T')[0];
  
  if (!weekGroups.has(weekStart)) {
    weekGroups.set(weekStart, []);
  }
  weekGroups.get(weekStart)!.push(dayStats);
});
```

**Logic:** Group by ISO week (Monday = start of week)

**Example:**
```
Days to aggregate:
  2026-01-14 (Tue) → Week of 2026-01-13 (Mon)
  2026-01-15 (Wed) → Week of 2026-01-13 (Mon)
  2026-01-16 (Thu) → Week of 2026-01-13 (Mon)

Result:
  weekGroups = {
    "2026-01-13": [day_14, day_15, day_16]
  }
```

*File: `src/utils/statsStorage.ts:110-119`*

**Step 3: Calculate Weekly Totals**

```typescript
weekGroups.forEach((days, weekStart) => {
  const totalDeskTime = days.reduce((sum, day) => sum + day.totalDeskTime, 0);
  const totalBreakTime = days.reduce((sum, day) => sum + day.totalBreakTime, 0);
  const daysActive = days.filter(day => day.totalDeskTime > 0).length;
  const avgDailyHours = daysActive > 0 
    ? totalDeskTime / 3600 / daysActive 
    : 0;

  const weeklyAggregate: WeeklyAggregate = {
    weekStart,
    totalDeskTime,
    totalBreakTime,
    avgDailyHours,
    daysActive,
  };
  
  // Add or update in historicalWeeks array
  // ...
});
```

**Calculations:**
- `totalDeskTime`: Sum all days' desk time
- `totalBreakTime`: Sum all days' break time
- `daysActive`: Count days with desk time > 0
- `avgDailyHours`: Total desk time / days active (not calendar days)

*File: `src/utils/statsStorage.ts:122-152`*

**Step 4: Remove Aggregated Days**

```typescript
daysToAggregate.forEach(([date]) => {
  delete stats.recentDays[date];
});
```

**Result:** Old days deleted from `recentDays`, freeing ~25 KB per day

*File: `src/utils/statsStorage.ts:154-157`*

**Step 5: Enforce Retention Limit**

```typescript
const RETENTION_POLICY = {
  DETAILED_SESSIONS_DAYS: 7,
  WEEKLY_AGGREGATES: 52,       // ← 52 weeks = 1 year
  MONTHLY_AGGREGATES: 120,     // ← 120 months = 10 years
};

if (stats.historicalWeeks.length > RETENTION_POLICY.WEEKLY_AGGREGATES) {
  stats.historicalWeeks = stats.historicalWeeks.slice(-52);  // Keep last 52
}
```

**Logic:** If more than 52 weeks, drop oldest weeks (they'll be aggregated into months)

*File: `src/utils/statsStorage.ts:163-167`*

---

## Algorithm: Week Aggregation (Weeks → Months)

### Trigger Conditions

1. **On-demand:** Runs when localStorage quota exceeded
2. **Manual:** Can be called via `aggregateOldWeeks(stats)`

*File: `src/utils/statsStorage.ts:177`*

### Algorithm Steps

**Step 1: Identify Old Weeks**

```typescript
const cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
const cutoffISO = cutoffDate.toISOString().split('T')[0];

const weeksToAggregate = stats.historicalWeeks.filter(
  week => week.weekStart < cutoffISO
);
```

**Logic:** Weeks older than 1 year eligible for monthly aggregation

*File: `src/utils/statsStorage.ts:178-184`*

**Step 2: Group Weeks by Month**

```typescript
const monthGroups = new Map<string, WeeklyAggregate[]>();

weeksToAggregate.forEach(week => {
  const monthStart = week.weekStart.substring(0, 7) + '-01';  // YYYY-MM-01
  
  if (!monthGroups.has(monthStart)) {
    monthGroups.set(monthStart, []);
  }
  monthGroups.get(monthStart)!.push(week);
});
```

**Example:**
```
Weeks to aggregate:
  2024-01-08 → Month of 2024-01-01
  2024-01-15 → Month of 2024-01-01
  2024-01-22 → Month of 2024-01-01
  2024-01-29 → Month of 2024-01-01

Result:
  monthGroups = {
    "2024-01-01": [week_08, week_15, week_22, week_29]
  }
```

*File: `src/utils/statsStorage.ts:189-197`*

**Step 3: Calculate Monthly Totals**

```typescript
monthGroups.forEach((weeks, monthStart) => {
  const totalDeskTime = weeks.reduce((sum, week) => sum + week.totalDeskTime, 0);
  const totalBreakTime = weeks.reduce((sum, week) => sum + week.totalBreakTime, 0);
  const daysActive = weeks.reduce((sum, week) => sum + week.daysActive, 0);
  const avgDailyHours = daysActive > 0 
    ? totalDeskTime / 3600 / daysActive 
    : 0;

  const monthlyAggregate: MonthlyAggregate = {
    monthStart,
    totalDeskTime,
    totalBreakTime,
    avgDailyHours,
    daysActive,
  };
  
  // Add or update in historicalMonths array
  // ...
});
```

**Calculations:** Same as weekly aggregation, just summing weeks instead of days

*File: `src/utils/statsStorage.ts:200-231`*

**Step 4: Remove Aggregated Weeks**

```typescript
stats.historicalWeeks = stats.historicalWeeks.filter(
  week => week.weekStart >= cutoffISO
);
```

*File: `src/utils/statsStorage.ts:234-236`*

**Step 5: Enforce Retention Limit**

```typescript
if (stats.historicalMonths.length > RETENTION_POLICY.MONTHLY_AGGREGATES) {
  stats.historicalMonths = stats.historicalMonths.slice(-120);  // Keep last 120
}
```

**Logic:** Keep last 10 years of monthly data, drop older months

*File: `src/utils/statsStorage.ts:244-248`*

---

## Retention Timeline Visualization

```
Today
│
├─ Last 7 days ────────────────────────────────────────► TIER 1: Full Detail
│   │                                                      (sessions + intervals)
│   │  Size: ~175 KB
│   │
│   └─ 7 days ago ──────────────────────────────────────► AGGREGATION TRIGGER
│       │                                                  (runs nightly at midnight)
│       │
│       ├─ 8-365 days ago ──────────────────────────────► TIER 2: Weekly Summaries
│       │   │                                              (totals only, no sessions)
│       │   │  Size: ~25 KB (52 weeks)
│       │   │
│       │   └─ 1 year ago ────────────────────────────► AGGREGATION TRIGGER
│       │       │                                         (runs when quota exceeded)
│       │       │
│       │       └─ 1+ years ago ──────────────────────► TIER 3: Monthly Summaries
│       │           │                                     (totals only)
│       │           │  Size: ~50 KB (120 months max)
│       │           │
│       │           └─ 10+ years ago ─────────────────► DROPPED
│       │                                                (oldest months deleted)
│       │
│       └─ Retention Limits:
│           - Recent: 7 days full detail
│           - Historical: 52 weeks summaries
│           - Ancient: 120 months summaries
│           - Total Storage: ~250 KB
```

---

## Quota Exceeded Handler

### Trigger

```typescript
try {
  localStorage.setItem(STORAGE_KEYS.STATS_V2, JSON.stringify(stats));
} catch (error) {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    console.warn('localStorage quota exceeded, cleaning up old data...');
    cleanupOldData(stats);
    
    // Retry save after cleanup
    try {
      localStorage.setItem(STORAGE_KEYS.STATS_V2, JSON.stringify(stats));
    } catch (retryError) {
      console.error('Failed to save even after cleanup:', retryError);
    }
  }
}
```

*File: `src/utils/statsStorage.ts:39-54`*

### Cleanup Strategy

```typescript
function cleanupOldData(stats: StatsData): void {
  // Step 1: Aggregate old sessions (7+ days → weeks)
  aggregateOldSessions(stats);

  // Step 2: Aggregate old weeks (1+ year → months)
  aggregateOldWeeks(stats);

  // Step 3: If still need space, drop oldest monthly data
  if (stats.historicalMonths.length > 12) {
    stats.historicalMonths = stats.historicalMonths.slice(-12);
    console.log('Dropped oldest monthly data to free space');
  }
}
```

**Priority:**
1. First try aggregating detailed days (biggest space savings)
2. Then aggregate weekly summaries
3. Last resort: Drop ancient monthly data (oldest first)

*File: `src/utils/statsStorage.ts:258-270`*

---

## Data Preservation Analysis

### What's Lost During Aggregation

**Days → Weeks:**
- ❌ Individual session timestamps
- ❌ Exact break times and durations
- ❌ Intraday timeline (when breaks occurred)
- ❌ Session-level details

**Weeks → Months:**
- ❌ Week-by-week breakdown
- ❌ Weekly patterns (e.g., "worked 40hrs week 1, 35hrs week 2")

### What's Preserved

**All Tiers:**
- ✅ Total desk time (accurate to the second)
- ✅ Total break time (accurate to the second)
- ✅ Average daily hours (mean calculation)
- ✅ Days active (count of days with any tracking)

**Additional Preservation:**
- `allTime` stats continuously updated with totals
- Settings and notifications preserved separately
- No data lost for last 7 days (always full detail)

---

## Storage Size Projections

### Worst Case (10 Years of Tracking)

```
Tier 1 (Recent 7 days):
  7 days × 25 KB = 175 KB

Tier 2 (Last year):
  52 weeks × 500 bytes = 26 KB

Tier 3 (10 years):
  120 months × 500 bytes = 60 KB

Metadata (settings, notifications):
  ~5 KB

Total: ~266 KB  ← Well under 5 MB quota!
```

### Growth Over Time

```
Month 1:  30 KB  (30 days × 1 KB)
Month 3:  90 KB  (90 days × 1 KB)
Month 6: 180 KB  (180 days × 1 KB)
Year 1:  200 KB  (first aggregation happens)
Year 2:  220 KB  (weekly aggregates growing)
Year 5:  260 KB  (monthly aggregates growing)
Year 10: 266 KB  (stabilized at max retention)
```

**Stabilization:** Storage size plateaus after ~2 years

---

## Edge Cases

### 1. Partial Week Aggregation

**Scenario:** Only 3 days of a week are old enough to aggregate

**Behavior:**
```typescript
const weekStart = getWeekStartDate(new Date(date));  // Get Monday
```
- All days in that week grouped together
- Week summary includes only aggregated days (not full 7 days)
- `daysActive` reflects actual days aggregated (e.g., 3)

**Result:** Partial week correctly summarized

### 2. Empty Days (No Tracking)

**Scenario:** User didn't use app for several days

**Behavior:**
```typescript
const daysActive = days.filter(day => day.totalDeskTime > 0).length;
```
- Empty days still exist in `recentDays` but counted separately
- `daysActive` only counts days with desk time > 0
- `avgDailyHours` calculated over active days, not calendar days

**Example:**
```
Mon: 8 hours
Tue: 0 hours (didn't use app)
Wed: 8 hours

daysActive = 2 (not 3)
avgDailyHours = 16 / 2 = 8 hours (not 5.33)
```

### 3. Midnight Rollover During Session

**Scenario:** Session starts at 11:50 PM, ends at 12:10 AM next day

**Behavior:**
```typescript
// In useStatsTracking midnight check
if (currentSession && currentSession.end === null) {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  
  const endedSession: PresenceSession = {
    ...currentSession,
    end: midnight.getTime(),  // ← Force end at midnight
  };
  
  // Save to previous day
  // New session starts automatically on new day
}
```

**Result:** Session split across two days, no data lost

*File: `src/hooks/useStatsTracking.ts:480-524`*

### 4. Browser Storage Corruption

**Scenario:** localStorage data becomes corrupted/invalid JSON

**Behavior:**
```typescript
try {
  const stored = localStorage.getItem(STORAGE_KEYS.STATS_V2);
  const data: StatsData = JSON.parse(stored);
  return data;
} catch (error) {
  console.error('Failed to load stats from localStorage:', error);
  return null;  // ← Fallback to empty stats
}
```

**Result:** App resets to fresh state (all data lost, but app still works)

*File: `src/utils/statsStorage.ts:22-33`*

---

## Performance Characteristics

### Aggregation Cost

**Days → Weeks (7 days):**
- Time: O(n) where n = days to aggregate (~7)
- Space: O(n) temporary for grouping
- Duration: <10ms

**Weeks → Months (52 weeks):**
- Time: O(n) where n = weeks to aggregate (~52)
- Space: O(n) temporary for grouping
- Duration: <50ms

**Total:** Negligible impact on user experience

### Save Frequency

**Normal operation:**
- Stats saved every 5 seconds (leader tab only)
- Aggregation runs nightly at midnight
- Quota handler runs only when needed (rare)

**localStorage I/O:**
- Write: ~200 KB every 5 seconds = 40 KB/sec sustained
- Read: On app startup + manual stats view
- **Bottleneck:** localStorage write speed (~1-5 MB/sec)

---

## Testing

### Unit Tests

**Status:** Partially implemented

**Test Cases:**
```typescript
describe('aggregateOldSessions', () => {
  it('should aggregate days older than 7 days', () => {
    // Create stats with 10 days of data
    // Run aggregation
    // Verify only last 7 days remain in recentDays
    // Verify weekly aggregates created correctly
  });
  
  it('should group days by ISO week', () => {
    // Test Monday-Sunday grouping
  });
  
  it('should calculate totals correctly', () => {
    // Verify totalDeskTime = sum of all days
    // Verify daysActive = count of days with desk time > 0
  });
  
  it('should remove aggregated days from recentDays', () => {
    // Verify old days deleted after aggregation
  });
});

describe('aggregateOldWeeks', () => {
  it('should aggregate weeks older than 1 year', () => {
    // Similar tests for week → month aggregation
  });
});

describe('cleanupOldData', () => {
  it('should handle quota exceeded gracefully', () => {
    // Mock QuotaExceededError
    // Verify cleanup runs
    // Verify retry succeeds
  });
});
```

### Manual Testing

**Test 1: Wait 7 Days**
1. Use app for 7 days
2. Check midnight on day 8
3. Verify day 1 moved to `historicalWeeks`

**Test 2: Simulate Quota Exceeded**
1. Fill localStorage with dummy data
2. Trigger stats save
3. Verify cleanup runs automatically

**Test 3: Long-Term Usage**
1. Simulate 2 years of data (mock timestamps)
2. Verify storage size stays under 300 KB

---

## Future Enhancements

### 1. Configurable Retention Policy

```typescript
settings: {
  retentionPolicy: {
    detailedDays: 7,      // User can choose 7, 14, 30
    weeklyWeeks: 52,      // User can choose 26, 52, 104
    monthlyMonths: 120,   // User can choose 60, 120, unlimited
  }
}
```

### 2. Smart Aggregation Timing

```typescript
// Aggregate during idle time instead of midnight
if (document.hidden && userIdleFor > 60000) {
  aggregateOldSessions(stats);
}
```

### 3. Compression

```typescript
// Use LZ-string compression for localStorage
import LZString from 'lz-string';

const compressed = LZString.compress(JSON.stringify(stats));
localStorage.setItem(key, compressed);
```

**Benefit:** Could reduce storage size by 50-70%

### 4. IndexedDB Migration

```typescript
// Use IndexedDB for unlimited storage
const db = await openDB('commitspace', 1, {
  upgrade(db) {
    db.createObjectStore('sessions');
    db.createObjectStore('aggregates');
  },
});
```

**Benefit:** No 5 MB limit, can store full detail forever

### 5. Cloud Backup

```typescript
// Optional cloud sync for long-term backup
async function syncToCloud(stats: StatsData) {
  await fetch('/api/backup', {
    method: 'POST',
    body: JSON.stringify(stats),
  });
}
```

---

## Related Documentation

- [[statsStorage|statsStorage.ts]] - Implementation file
- [[useStatsTracking]] - Hook that triggers aggregation
- [[SESSION-TRACKING]] - Creates the data that gets aggregated
- [[TYPES-REFERENCE]] - Data structures used in aggregation

---

## References

- **localStorage API:** https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **Storage Limits:** https://web.dev/storage-for-the-web/
- **Implementation:** `src/utils/statsStorage.ts:90-253`

---

## Questions / TODOs

1. Should we allow users to export before aggregation (preserve full detail)?
2. Can we use Web Workers to run aggregation in background?
3. Should we add visual indicator showing how much data is aggregated vs. detailed?
4. Could we use differential compression (store deltas instead of full snapshots)?
5. Should we migrate to IndexedDB for unlimited storage?
