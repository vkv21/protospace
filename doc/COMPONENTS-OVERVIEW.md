# Component Documentation Summary

> **Category:** Components Quick Reference
> **Last Updated:** 2026-01-21

---

## StatBox Component

**File:** `/src/components/StatBox.tsx` (30 lines)

**Purpose:** Reusable statistic display card

**Props:**
```typescript
{
  title: string,        // Label (e.g., "At Desk")
  value: string | number, // Value to display
  className?: string    // Optional additional classes
}
```

**Usage:**
```tsx
<StatBox title="At Desk" value="2h 15m" />
<StatBox title="Sessions" value={5} />
```

**Styling:** White/dark card with rounded corners, shadow, responsive text

---

## GoalProgressBox Component

**File:** `/src/components/GoalProgressBox.tsx` (38 lines)

**Purpose:** Specialized goal progress display with dynamic coloring

**Props:**
```typescript
{
  goalProgress: number,              // Percentage (0-100+)
  goalHours: number,                 // Goal in hours
  getProgressColor: () => string,    // Text color function
  getProgressBg: () => string        // Background color function
}
```

**Features:**
- Shows "🎯 Goal achieved!" when goalProgress >= 100
- Dynamic color-coding (red → orange → yellow → green → emerald)
- Displays percentage and goal hours
- Responsive design

---

## TimelineChart Component

**File:** `/src/components/TimelineChart.tsx` (188 lines)

**Purpose:** Interactive timeline visualization wrapper

**Props:**
```typescript
{
  sessions: PresenceSession[],  // Array of sessions to visualize
  className?: string            // Optional CSS classes
}
```

**Features:**
- Uses [[hooks/useD3Timeline|useD3Timeline]] hook
- Responsive container with ResizeObserver
- Zoom controls (In/Out/Reset)
- Zoom level display
- Legend (Present/Away/Current Time)
- Empty state when no sessions

**Integration:**
```tsx
<TimelineChart sessions={todayStats?.sessions || []} />
```

---

## WeeklyBarChart Component

**File:** `/src/components/WeeklyBarChart.tsx` (276 lines)

**Purpose:** 7-day bar chart with goal line overlay

**Props:**
```typescript
{
  recentDays: Record<string, DailyStats>,  // Last 7 days data
  goalHours: number,                        // Daily goal for reference line
  className?: string
}
```

**Features:**
- D3.js bar chart with responsive container
- Color coding: Green bars (goal met), Gray bars (below goal)
- Dashed horizontal goal line
- Hover tooltips with percentage
- Grid lines and axes
- Shows last 7 days (Mon-Sun)

**Calculation:**
```typescript
// Height based on goal achievement
const percentage = (deskTime / (goalHours * 3600)) * 100;
```

---

## StatsModal Component

**File:** `/src/components/StatsModal.tsx` (497 lines)

**Purpose:** Detailed statistics modal with tabs (Today, Week, Month, All-Time)

**Props:**
```typescript
{
  isOpen: boolean,
  onClose: () => void,
  stats: StatsData,                        // Full statistics object
  recentDays: Record<string, DailyStats>
}
```

**Features:**
- **Today Tab:** Session list with intervals, time breakdown
- **Week Tab:** 7-day summary with totals, WeeklyBarChart
- **Month Tab:** Coming soon placeholder
- **All-Time Tab:** Lifetime statistics and insights
- Export buttons (CSV, JSON)
- Clear all data button (with confirmation)
- Keyboard navigation (ESC to close)
- Body scroll lock when open
- Backdrop click to close

**Export Functionality:**
- CSV: Formatted text file
- JSON: Complete data structure
- Uses [[utils/statsStorage|statsStorage]] export functions

---

## SettingsModal Component

**File:** `/src/components/SettingsModal.tsx` (436 lines)

**Purpose:** User settings and preferences management

**Props:**
```typescript
{
  isOpen: boolean,
  onClose: () => void,
  settings: UserSettings,
  onSave: (settings: Partial<UserSettings>) => void,
  notificationPermission?: NotificationPermission,
  onRequestNotifications?: () => void
}
```

**Sections:**

### 1. Goals
- Daily goal slider (0.5-24 hours)
- Weekly goal slider (1-168 hours)
- Visual feedback with current values

### 2. Notifications
- Permission request button
- Break reminders toggle
- Break interval slider (30-240 minutes)
- Status indicators

### 3. Data Management
- Privacy information
- Reset to defaults button
- Data storage explanation

**Features:**
- Unsaved changes warning
- Success toast on save
- Input validation
- Keyboard support (ESC to close)
- Backdrop click with unsaved changes confirmation

**Default Settings:**
```typescript
{
  dailyGoalHours: 4,
  weeklyGoalHours: 20,
  breakReminderEnabled: false,
  breakReminderInterval: 120  // minutes
}
```

---

## Component Hierarchy

```
App (root)
└── VideoCapture (orchestrator) ⭐
    ├── DailyStats (dashboard)
    │   ├── StatBox × 3
    │   ├── GoalProgressBox
    │   ├── TimelineChart
    │   │   └── useD3Timeline (hook)
    │   └── WeeklyBarChart
    ├── StatsModal (overlay)
    │   └── WeeklyBarChart
    └── SettingsModal (overlay)
```

## Component Sizes

| Component | Lines | Complexity |
|-----------|-------|------------|
| App | 102 | Low |
| StatBox | 30 | Low |
| GoalProgressBox | 38 | Low |
| TimelineChart | 188 | Medium |
| WeeklyBarChart | 276 | Medium-High |
| DailyStats | 383 | High |
| SettingsModal | 436 | High |
| StatsModal | 497 | High |
| VideoCapture | 611 | Very High |

## Common Patterns

### Modal Pattern
```typescript
// All modals follow this structure:
- isOpen prop for visibility
- onClose callback
- Backdrop with click-to-close
- ESC key handling
- Body scroll lock
- Z-index layering
```

### Responsive Design
```typescript
// Grid breakpoints used throughout:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
```

### Dark Mode Support
```typescript
// All components use Tailwind dark: variants
className="bg-white dark:bg-gray-800"
className="text-gray-900 dark:text-gray-100"
```

## Testing Status

All components: **No tests** (0% coverage)

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[HOOKS-OVERVIEW|Hooks Overview]]
- Individual component docs in `doc/components/`

---

**All 9 components documented!**
