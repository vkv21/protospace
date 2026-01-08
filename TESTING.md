# MVP Testing Strategy & Manual Testing Checklist

## Recently Added Features (MVP Phase 1)

### ✅ Core Tracking System

1. **Session Management**

   - Creates new `PresenceSession` when user enters camera frame
   - Adds `PresenceInterval` (type: 'present' or 'away') for each state change
   - Tracks continuous desk time in real-time
   - Auto-saves to localStorage every 5 seconds

2. **Statistics Display** (`DailyStats` component)

   - **At Desk Card**: Shows formatted time (HH:MM:SS) from current session
   - **Break Time Card**: Total away time in seconds
   - **Sessions Count**: Number of presence sessions today
   - **Goal Progress**: Circular progress with color coding
     - Green: >80% of goal
     - Yellow: 50-80% of goal
     - Red: <50% of goal
   - **Active Session Indicator**: Blue pulse animation when tracking
   - **Debug Panel**: Collapsible section showing raw data

3. **Break Reminder Notifications**

   - Triggers after **120 minutes** continuous desk time (2 hours)
   - Shows browser notification with formatted time message
   - **5-minute cooldown** between notifications
   - Click notification to focus app window
   - Auto-closes after 10 seconds
   - Permission banner when not granted

4. **Data Persistence**

   - localStorage key: `aideskwatch_stats_v2`
   - Auto-migrates from v1 format (`aideskwatch_presence`)
   - Midnight rollover: Archives previous day, starts new day
   - Retention: 7 days detailed, 52 weeks aggregated, 24 months

5. **Multi-Tab Coordination**
   - BroadcastChannel API for communication
   - Leader election (first tab to start becomes leader)
   - Heartbeat every 5 seconds
   - Other tabs show: "Tracking in another tab"

---

## Manual Testing Checklist

### 🧪 Test 1: Basic Tracking Flow

**Goal**: Verify session creation and presence detection integration

- [ ] Start dev server (`npm run dev`)
- [ ] Open browser DevTools → Application → Local Storage
- [ ] Click "Start Camera" button
- [ ] Sit in frame (face visible)
- [ ] **Expected**:
  - "Presence Detected" shows as "Yes"
  - "Active Session" indicator appears (blue pulse)
  - "At Desk" time starts incrementing
  - localStorage `aideskwatch_stats_v2` key appears
- [ ] Wait 10 seconds
- [ ] **Expected**: Sessions count = 1
- [ ] Leave frame completely
- [ ] **Expected**:
  - "Presence Detected" changes to "No"
  - "Break Time" starts incrementing
  - "At Desk" time stops incrementing
- [ ] Return to frame
- [ ] **Expected**:
  - "Presence Detected" back to "Yes"
  - "At Desk" time resumes incrementing
  - Sessions count still = 1 (same session continues)

**Pass Criteria**: ✅ Presence detection triggers session updates, localStorage saves data

---

### 🧪 Test 2: localStorage Persistence

**Goal**: Verify data survives page refresh

- [ ] With active tracking session, note current "At Desk" time
- [ ] Open DevTools → Application → Local Storage → `aideskwatch_stats_v2`
- [ ] Copy value to text editor for inspection
- [ ] Refresh page (F5 or Cmd+R)
- [ ] Click "Start Camera" again
- [ ] Sit in frame
- [ ] **Expected**:
  - Previous session data loads
  - "At Desk" time continues from where it left off
  - JSON structure includes:
    ```json
    {
      "version": 2,
      "recentDays": {
        "2026-01-08": {
          "sessions": [{
            "presence": [...]
          }]
        }
      }
    }
    ```

**Pass Criteria**: ✅ Data persists across page reloads

---

### 🧪 Test 3: Notification System

**Goal**: Test break reminder triggers and cooldown

**Note**: Default interval is 120 minutes. For faster testing:

1. Temporarily edit [types/stats.ts](../src/types/stats.ts) line 43
2. Change `breakReminderInterval: 120` to `breakReminderInterval: 1`
3. Restart dev server

- [ ] Click "Enable Break Reminders" button
- [ ] Grant notification permission in browser prompt
- [ ] **Expected**: Green checkmark appears next to "Break Notifications"
- [ ] Sit in frame continuously for 1-2 minutes (with modified interval)
- [ ] **Expected**:
  - Browser notification appears: "Time for a break!"
  - Message shows: "You've been at your desk for X minutes"
  - Notification auto-closes after 10 seconds
- [ ] Continue sitting in frame
- [ ] **Expected**: No duplicate notification for 5 minutes (cooldown)
- [ ] Leave frame for 1 minute, return
- [ ] **Expected**: Continuous desk time resets, notification won't trigger until another continuous period

**Pass Criteria**: ✅ Notifications trigger correctly with cooldown

---

### 🧪 Test 4: Multi-Tab Coordination

**Goal**: Verify only one tab tracks at a time

- [ ] Open app in first tab with camera started
- [ ] Sit in frame, verify tracking works
- [ ] Open second tab with same URL
- [ ] In second tab, click "Start Camera"
- [ ] **Expected in Tab 2**:
  - Message: "Tracking in another tab" OR
  - Leader takeover after 10-second timeout
- [ ] Close first tab
- [ ] **Expected in Tab 2**:
  - Becomes leader within 10 seconds
  - Starts tracking

**Pass Criteria**: ✅ No duplicate tracking, smooth leader transition

---

### 🧪 Test 5: Midnight Rollover (Simulated)

**Goal**: Verify day transitions work correctly

**Method 1 - Wait for midnight**:

- [ ] Keep app running overnight
- [ ] Check at 12:01 AM
- [ ] **Expected**:
  - Previous day's data archived in `recentDays`
  - New day initialized with 0 hours
  - Sessions count resets to 0

**Method 2 - Mock time** (advanced):

1. Edit [useStatsTracking.ts](../src/hooks/useStatsTracking.ts)
2. Find `const today = new Date().toISOString().split('T')[0];`
3. Temporarily replace with yesterday's date
4. Reload page, verify old data
5. Change back to today's date
6. **Expected**: New day starts fresh

**Pass Criteria**: ✅ Day boundaries handled correctly

---

### 🧪 Test 6: Goal Progress Calculation

**Goal**: Verify color-coded progress works

- [ ] Default daily goal = 4 hours (14,400 seconds)
- [ ] Track presence until "At Desk" shows > 3h 12min (80%)
- [ ] **Expected**: Goal Progress card is **green**
- [ ] Stop camera, edit localStorage to reduce desk time to 2h
- [ ] Refresh page, start camera
- [ ] **Expected**: Goal Progress card is **yellow** (50-80%)
- [ ] Stop camera, edit localStorage to reduce desk time to 1h
- [ ] Refresh page, start camera
- [ ] **Expected**: Goal Progress card is **red** (<50%)

**Pass Criteria**: ✅ Color coding matches percentage thresholds

---

### 🧪 Test 7: Data Migration from V1

**Goal**: Verify old format converts correctly

**Setup**:

1. Clear localStorage (`localStorage.clear()` in console)
2. Set old format manually:
   ```javascript
   localStorage.setItem('aideskwatch_presence', '7200'); // 2 hours
   localStorage.setItem('aideskwatch_last_date', '2026-01-07');
   ```
3. Refresh page

- [ ] Check localStorage for `aideskwatch_stats_v2` key
- [ ] **Expected**:
  - New v2 key exists
  - Contains migrated data from v1
  - Shows 2 hours for 2026-01-07
  - Console log: "Migration successful!"

**Pass Criteria**: ✅ V1 data preserved in v2 format

---

## Automated Testing Strategy

### 🎯 Testing Pyramid

```
         /\
        /  \  E2E Tests (Manual for now)
       /____\
      /      \  Component Tests
     /________\
    /          \  Integration Tests (Hooks)
   /____________\
  /              \  Unit Tests (Utilities) ← Start here
 /________________\
```

### ✅ Unit Tests (15 passed, 17 failed - in progress)

**Location**: `src/utils/__tests__/`

**Current Status**:

- ✅ `formatDeskTime()` - Working correctly
- ✅ `calculateBreakTime()` - 2/3 tests pass (bug found: NaN on undefined end)
- ❌ `formatGoalProgress()` - Function doesn't exist (need to implement)
- ❌ `aggregateWeeklyStats()` - Signature mismatch (expects array, receives object)
- ❌ `getWeekStartDate()` - Returns string, not Date object
- ❌ CSV/JSON export - Headers don't match test expectations

**Action Items**:

1. Implement missing utility functions
2. Fix function signatures to match tests OR update tests to match implementation
3. Add tests for existing functions we rely on

### 🔄 Integration Tests (TODO)

**Location**: `src/hooks/__tests__/`

**Planned Tests**:

- `useStatsTracking.test.ts`:
  - Session creation on first presence
  - Interval appending on state changes
  - localStorage auto-save every 5s
  - Midnight rollover logic
  - Multi-tab leader election
- `useNotifications.test.ts`:
  - Permission request flow
  - Notification trigger at break interval
  - Cooldown period enforcement
  - Notification click handler

### 🧩 Component Tests (TODO)

**Location**: `src/components/__tests__/`

**Planned Tests**:

- `DailyStats.test.tsx`:
  - Renders 4 metric cards
  - Color coding based on goal progress
  - Active session indicator visibility
  - Notification banner conditional render
  - Debug panel toggle

### 📊 Coverage Goals

- **Phase 1** (Current): 60%+ coverage on utilities
- **Phase 2**: 50%+ coverage on hooks
- **Phase 3**: 40%+ coverage on components

Run coverage: `npm run test:coverage`

---

## Known Issues from Test Results

### 🐛 Bug #1: `calculateBreakTime` returns NaN for ongoing intervals

**File**: [presenceAnalyzer.ts](../src/utils/presenceAnalyzer.ts)
**Issue**: When `interval.end` is `undefined`, subtraction produces NaN
**Fix**: Skip intervals without end time

### 🐛 Bug #2: Missing utility functions

**Functions needed**:

- `formatGoalProgress(current: number, goal: number): number` - Calculate percentage
- Fix `aggregateWeeklyStats` to accept `Record<string, DailyStats>` instead of array
- Fix `getWeekStartDate` to return Date object instead of string

### 🐛 Bug #3: CSV export headers mismatch

**Expected**: `Date,Desk Time (hours),Break Time (minutes),Sessions,Goal (hours)`
**Actual**: `Date,Desk Time (hours),Break Time (hours),Sessions,Goal (hours),Achievement (%)`
**Decision needed**: Update implementation OR update tests

### 🐛 Bug #4: Settings structure mismatch

**Test expects**: `stats.settings.notifications.breakReminderEnabled`
**Actual**: `stats.settings.breakReminderEnabled` (flat structure)
**Fix**: Align types/stats.ts with statsStorage.ts

---

## Next Steps

### Immediate (Now):

1. **Fix failing unit tests** - Implement missing functions or adjust tests
2. **Run tests in watch mode** - `npm test` catches regressions
3. **Manually test core flows** - Use checklist above

### Short-term (Before adding timeline):

1. **Add hook integration tests** - Test useStatsTracking thoroughly
2. **Test notification system** - Mock Notification API
3. **Achieve 60%+ util coverage** - Critical path protection

### Long-term (As we build):

1. **Component tests for new features** - Timeline, modals, charts
2. **E2E tests** - Playwright/Cypress for critical user flows
3. **Visual regression tests** - Percy/Chromatic for UI consistency

---

## CI/CD Integration (Future)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --run
      - run: npm run test:coverage
```

---

**Last Updated**: January 8, 2026  
**Test Status**: 15/32 passing (47%) - In progress 🚧
