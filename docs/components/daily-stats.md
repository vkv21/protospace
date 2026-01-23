# DailyStats Component

> **File:** `/src/components/DailyStats.tsx`
> **Tags:** `#components` `#dashboard` `#statistics` `#visualization`
> **Complexity:** High
> **Lines:** 383

---

## 1. File/Module Name

`DailyStats.tsx` - Today's statistics dashboard with collapsible sections

## 2. Purpose & Role

Primary statistics display component. Shows today's desk time, break time, sessions, goal progress, active session panel, timeline chart, weekly bar chart, and debug information. Manages collapsible panel states with localStorage persistence.

## 3. Inputs

```typescript
{
  stats: DailyStats | null,              // Today's statistics
  currentSession: PresenceSession | null, // Active session or null
  continuousDeskTime: number,            // Seconds in current interval
  isTracking: boolean,                   // Session active flag
  recentDays: Record<string, DailyStats>, // Last 7 days
  goalHours: number,                     // Daily goal setting
  notificationPermission?: NotificationPermission,
  onRequestNotifications?: () => void,
  onOpenStatsModal?: () => void
}
```

## 4. Outputs / Rendered Value

**Renders:**
- 4 stat boxes (Desk Time, Break Time, Sessions, Goal Progress)
- Active Session panel (expandable)
- Notification permission banner
- Timeline chart (collapsible)
- Weekly bar chart (collapsible)
- Debug panel (collapsible)
- "View All Statistics" button

## 5. Key Logic & Flow

### Panel State Management
```typescript
// Persistent collapse states
const [showTimeline, setShowTimeline] = useState(() => {
  return localStorage.getItem('commitspace_showTimeline') !== 'false';
});

useEffect(() => {
  localStorage.setItem('commitspace_showTimeline', showTimeline.toString());
}, [showTimeline]);
```

### Active Session Calculation
```typescript
// Updates every second
useEffect(() => {
  const calculateSessionStats = () => {
    let deskTime = 0;
    let breakTime = 0;
    
    currentSession.presence.forEach((interval) => {
      const endTime = interval.end ?? Date.now();
      const duration = (endTime - interval.start) / 1000;
      if (interval.type === 'present') deskTime += duration;
      else breakTime += duration;
    });
    
    setSessionDeskTime(deskTime);
    setSessionBreakTime(breakTime);
  };
  
  calculateSessionStats();
  const interval = setInterval(calculateSessionStats, 1000);
  return () => clearInterval(interval);
}, [currentSession, isTracking]);
```

### Goal Progress Coloring
```typescript
// Dynamic color based on progress
if (goalProgress >= 100) → Emerald (goal met)
if (goalProgress >= 80)  → Green
if (goalProgress >= 50)  → Yellow
if (goalProgress >= 25)  → Orange
else                     → Red
```

### Component Sections
1. **Stat Boxes** - 4-column grid (responsive)
2. **Active Session** - Expandable panel when tracking
3. **Notification Banner** - Only if permission not granted
4. **Timeline** - Collapsible chart with today's intervals
5. **Weekly Chart** - Collapsible 7-day bar chart
6. **Debug Panel** - Collapsible raw data (dev tool)

## 6. External Dependencies

- [[components/StatBox|StatBox]]
- [[components/GoalProgressBox|GoalProgressBox]]
- [[components/TimelineChart|TimelineChart]]
- [[components/WeeklyBarChart|WeeklyBarChart]]
- [[utils/presenceAnalyzer|presenceAnalyzer]] - formatDeskTime, formatGoalProgress
- [[types/stats|stats]] - DailyStats, PresenceSession types

## 7. Integration Points

### Used By:
- [[components/VideoCapture|VideoCapture]] (src/components/VideoCapture.tsx:420)

### Data Flow:
```
useStatsTracking
  ↓
VideoCapture (passes props)
  ↓
DailyStats (displays statistics)
  ↓
├─→ StatBox (×3)
├─→ GoalProgressBox
├─→ TimelineChart → useD3Timeline
└─→ WeeklyBarChart
```

## 8. Edge Cases & Notable Behaviors

### Loading State
```typescript
if (!stats) {
  return <div>Loading statistics...</div>;
}
```

### Active Session Display
- Only shown when `isTracking === true`
- Updates every second with live data
- Shows session start time and duration
- Expandable to show desk/break time breakdown

### Notification Banner
```
Shows only if:
- notificationPermission !== 'granted'
- onRequestNotifications callback provided
```

### Collapsible Sections
- Default states:
  - Timeline: OPEN
  - Weekly: OPEN
  - Debug: CLOSED
- Chevron icon rotates on expand/collapse
- Smooth height transition

### Goal Achievement
```
If goalProgress >= 100:
  Shows "🎯 Goal achieved!" message
```

### Debug Panel Content
```json
{
  "sessions": [...],
  "totalDeskTime": 7200,
  "totalBreakTime": 900,
  "goalHours": 4,
  "currentSession": {...}
}
```

## 9. Tests

**Current:** No tests

**Suggested:**
- Session calculation logic
- Goal progress coloring
- Panel collapse state persistence
- Loading state rendering

## 10. Questions / TODOs

### Potential Improvements
- Export statistics button
- Share statistics (image/link)
- Goal editing inline
- Session history list
- Comparison with previous days

## Related Documents

- [[INDEX|Documentation Index]]
- [[components/VideoCapture|VideoCapture]]
- [[components/StatBox|StatBox]]
- [[components/GoalProgressBox|GoalProgressBox]]
- [[components/TimelineChart|TimelineChart]]
- [[components/WeeklyBarChart|WeeklyBarChart]]

## localStorage Keys

- `commitspace_showTimeline` - Timeline panel state
- `commitspace_showWeekly` - Weekly chart panel state
- `commitspace_showDebug` - Debug panel state

---

**Next:** [[components/StatsModal|StatsModal]]
