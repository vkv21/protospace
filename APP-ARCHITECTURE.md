# CommitSpace Application Architecture

This document provides a comprehensive overview of the CommitSpace frontend application architecture, data flow, and component responsibilities.

## Table of Contents

1. [Application Overview](#application-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Data Flow](#data-flow)
4. [Component Hierarchy](#component-hierarchy)
5. [State Management](#state-management)
6. [Storage Strategy](#storage-strategy)
7. [Multi-Tab Coordination](#multi-tab-coordination)

---

## Application Overview

CommitSpace is a **privacy-first, client-side web application** that tracks user desk time using local camera-based pose detection. All processing happens in the browser using MediaPipe, with no data sent to any server.

**Key Features:**

- Real-time pose detection using MediaPipe Pose Landmarker
- Manual session start/stop controls
- Presence/away interval tracking within sessions
- Daily statistics with goal tracking (4-hour default)
- Historical data aggregation (weekly/monthly/all-time)
- Interactive D3.js timeline visualization
- Break reminder notifications
- Multi-tab coordination using BroadcastChannel API
- Dark mode support
- Privacy-focused data export (CSV/JSON)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION ENTRY                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  main.tsx → App.tsx                                                              │
│      ↓                                                                           │
│  - Dark mode state management                                                    │
│  - Global layout and header                                                      │
│      ↓                                                                           │
│  VideoCapture Component (Main Container)                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CAMERA & POSE DETECTION LAYER                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  useWebcam Hook                                                                  │
│  ├─ Manages MediaStream access                                                   │
│  ├─ Controls video element lifecycle                                             │
│  └─ Handles camera permissions and errors                                        │
│                                                                                  │
│                      ↓                                                           │
│                                                                                  │
│  usePoseDetection Hook                                                           │
│  ├─ Initializes MediaPipe PoseLandmarker (via poseDetector.ts singleton)        │
│  ├─ Runs detection every 500ms on video frames                                   │
│  ├─ Extracts 33 body landmarks (x, y, z coordinates)                             │
│  └─ Returns: landmarks[], isLoading, error                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PRESENCE ANALYSIS LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  usePresenceTracking Hook                                                        │
│  ├─ Receives landmarks from usePoseDetection                                     │
│  ├─ Calls presenceAnalyzer.analyzePoseLandmarks()                                │
│  ├─ Applies hysteresis (2-frame default) for stability                           │
│  ├─ Tracks confidence score (0-1)                                                │
│  └─ Returns: isPresent, confidence, lastSeen, deskTime                           │
│                                                                                  │
│  presenceAnalyzer.ts                                                             │
│  ├─ Checks visibility of key landmarks (nose, shoulders, elbows, hips)          │
│  ├─ Validates body proportions and geometry                                      │
│  ├─ Calculates confidence based on landmark quality                              │
│  └─ Returns: { isPresent: boolean, confidence: number }                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       SESSION & STATISTICS TRACKING LAYER                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  useStatsTracking Hook ⭐ CORE LOGIC                                             │
│  ├─ Multi-tab coordination (leader election via BroadcastChannel)               │
│  ├─ Session lifecycle management (start/stop)                                    │
│  ├─ Creates PresenceInterval objects (present/away) every second                 │
│  ├─ Calculates aggregate stats every 5 seconds:                                  │
│  │  ├─ totalDeskTimeSeconds (sum of all 'present' intervals)                     │
│  │  ├─ totalBreakTimeSeconds (sum of all 'away' intervals)                       │
│  │  ├─ continuousDeskTime (longest uninterrupted presence)                       │
│  │  └─ sessionCount                                                              │
│  ├─ Saves to localStorage via statsStorage.ts every 5 seconds                    │
│  ├─ Handles break reminder notifications                                         │
│  └─ Returns: todayStats, currentSession, isTracking, continuousDeskTime, etc.    │
│                                                                                  │
│  Data Structures:                                                                │
│  ├─ PresenceInterval: { type: 'present'|'away', start, end?, confidence }       │
│  ├─ PresenceSession: { id, presence: PresenceInterval[] }                       │
│  └─ DailyStats: { date, sessions[], totalDeskTimeSeconds, ... }                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            DATA PERSISTENCE LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  statsStorage.ts                                                                 │
│  ├─ loadOrInitializeStats() - Load or create initial stats                       │
│  ├─ saveStats(stats) - Persist to localStorage                                   │
│  ├─ Data retention policy:                                                       │
│  │  ├─ Detailed sessions: 7 days (in recentDays)                                 │
│  │  ├─ Weekly aggregates: 52 weeks                                               │
│  │  └─ Monthly aggregates: 24 months                                             │
│  ├─ aggregateOldSessions() - Move 7+ day sessions to weekly summaries            │
│  ├─ aggregateOldWeeks() - Move 1+ year weeks to monthly summaries                │
│  ├─ exportToCSV() / exportToJSON() - Privacy-focused data export                 │
│  └─ clearAllData() - Reset all statistics                                        │
│                                                                                  │
│  Storage Keys:                                                                   │
│  ├─ commitspace_stats (main statistics data)                                     │
│  ├─ commitspace_config (user settings)                                           │
│  └─ commitspace_dark_mode (theme preference)                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              UI PRESENTATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  VideoCapture Component                                                          │
│  ├─ Orchestrates all hooks                                                       │
│  ├─ Manages camera and tracking state                                            │
│  ├─ Handles modal state (stats, settings)                                        │
│  └─ Renders main UI layout                                                       │
│                                                                                  │
│  DailyStats Component                                                            │
│  ├─ Displays today's statistics                                                  │
│  ├─ Shows goal progress (4-hour default)                                         │
│  ├─ Current session details (expandable)                                         │
│  ├─ Timeline visualization toggle                                                │
│  ├─ Weekly summary toggle                                                        │
│  ├─ Debug panel toggle (localStorage persist)                                    │
│  └─ Break reminder notification banner                                           │
│                                                                                  │
│  Supporting Components:                                                          │
│  ├─ StatBox - Reusable stat display                                              │
│  ├─ GoalProgressBox - Goal progress with visual indicators                       │
│  ├─ TimelineChart - D3.js interactive timeline (useD3Timeline hook)              │
│  ├─ StatsModal - Historical data (week/month/all-time tabs)                      │
│  └─ SettingsModal - User preferences and goals                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Camera Initialization Flow

```
User clicks "Start Camera"
  ↓
useWebcam.startCapture()
  ↓
navigator.mediaDevices.getUserMedia({ video: true })
  ↓
Video stream attached to <video> element
  ↓
usePoseDetection enabled
```

### 2. Pose Detection Flow (Every 500ms)

```
usePoseDetection interval fires
  ↓
poseDetector.detect(videoElement, timestamp)
  ↓
MediaPipe processes frame
  ↓
Returns 33 landmarks or null
  ↓
setLandmarks(result)
```

### 3. Presence Analysis Flow (Every detection)

```
landmarks updated
  ↓
usePresenceTracking receives new landmarks
  ↓
presenceAnalyzer.analyzePoseLandmarks(landmarks)
  ↓
Check landmark visibility + geometry
  ↓
Apply hysteresis filter (2 frames)
  ↓
Update: isPresent, confidence, lastSeen
```

### 4. Session Tracking Flow (Every second when tracking)

```
useStatsTracking interval (1000ms)
  ↓
Check isPresent from usePresenceTracking
  ↓
Update current PresenceInterval:
  - If present: extend current 'present' interval or create new one
  - If away: end 'present' interval, start/extend 'away' interval
  ↓
Every 5 seconds: Calculate aggregate stats
  ↓
statsStorage.saveStats(updatedStats)
```

### 5. Statistics Calculation Flow

```
Calculate aggregate stats (every 5 seconds):
  ↓
For each session in today's sessions:
  ├─ Sum all 'present' intervals → totalDeskTimeSeconds
  ├─ Sum all 'away' intervals → totalBreakTimeSeconds
  ├─ Find longest 'present' streak → continuousDeskTime
  └─ Count sessions → sessionCount
  ↓
Calculate goal progress: (deskTime / goalHours) * 100
  ↓
Update DailyStats object
  ↓
Save to localStorage
```

### 6. Multi-Tab Coordination Flow

```
Tab opens
  ↓
useStatsTracking initializes
  ↓
BroadcastChannel created ('commitspace_tracking')
  ↓
Send heartbeat every 2 seconds
  ↓
Leader election:
  - If no heartbeat from other tabs for 5s → become leader
  - If heartbeat detected → become follower
  ↓
Only leader runs tracking logic
  ↓
Followers show "Tracking in another tab" message
```

---

## Component Hierarchy

```
App
├── Header (dark mode toggle)
└── VideoCapture (main container)
    ├── Camera Controls (Start/Stop)
    ├── Video Preview (conditionally rendered)
    ├── DailyStats
    │   ├── StatBox (multiple instances)
    │   ├── GoalProgressBox
    │   ├── Current Session Panel (expandable)
    │   ├── TimelineChart (collapsible)
    │   ├── Weekly Summary (collapsible)
    │   └── Debug Panel (collapsible)
    ├── StatsModal
    │   ├── Today Tab
    │   ├── Week Tab
    │   ├── Month Tab
    │   └── All Time Tab
    └── SettingsModal
        ├── Daily Goal Input
        ├── Weekly Goal Input
        ├── Break Reminder Toggle
        ├── Break Interval Input
        └── Notification Preferences
```

---

## State Management

### Global State (App.tsx)

- `darkMode` - Theme preference (persisted to localStorage)

### VideoCapture State

- `devMode` - Show developer features (persisted)
- `selfViewEnabled` - Show video preview (persisted)
- `isStatsModalOpen` - Stats modal visibility
- `isSettingsModalOpen` - Settings modal visibility

### Hook State

**useWebcam:**

- `isCapturing` - Camera active status
- `error` - Camera access errors
- `streamRef` - MediaStream reference

**usePoseDetection:**

- `landmarks` - Current pose landmarks (33 points)
- `isLoading` - MediaPipe initialization status
- `error` - Detection errors

**usePresenceTracking:**

- `isPresent` - Current presence status
- `confidence` - Detection confidence (0-1)
- `lastSeen` - Timestamp of last detection
- `deskTime` - Legacy total desk time

**useStatsTracking (Core):**

- `stats` - Full StatsData object
- `todayStats` - Today's DailyStats
- `currentSession` - Active PresenceSession or null
- `continuousDeskTime` - Longest current streak
- `isTracking` - Session active status
- `recentDays` - Last 7 days of detailed data
- `isLeader` - Multi-tab leader status

---

## Storage Strategy

### Data Structure in localStorage

**Key: `commitspace_stats`**

```typescript
{
  recentDays: {
    "2026-01-21": {
      date: "2026-01-21",
      sessions: [
        {
          id: "session_1737456000000",
          presence: [
            { type: "present", start: 1737456000000, end: 1737456300000, confidence: 0.95 },
            { type: "away", start: 1737456300000, end: 1737456600000 }
          ]
        }
      ],
      totalDeskTimeSeconds: 7200,
      totalBreakTimeSeconds: 1800,
      sessionCount: 2,
      longestSessionSeconds: 3600
    }
  },
  weeklyAggregates: [
    {
      weekStart: "2026-01-19",
      totalDeskTimeSeconds: 28800,
      totalBreakTimeSeconds: 7200,
      daysActive: 5,
      averageDailySeconds: 5760
    }
  ],
  monthlyAggregates: [],
  allTime: {
    totalDeskTimeSeconds: 144000,
    totalBreakTimeSeconds: 36000,
    totalSessions: 120,
    firstSessionDate: "2025-12-01"
  },
  settings: {
    dailyGoalHours: 4,
    weeklyGoalHours: 20,
    breakReminderEnabled: true,
    breakReminderInterval: 120
  },
  notifications: {
    enabled: false,
    breakReminders: true,
    goalAchieved: true,
    weeklyReport: false
  }
}
```

### Retention Policy

- **Detailed sessions:** 7 days in `recentDays`
- **Weekly aggregates:** 52 weeks (1 year)
- **Monthly aggregates:** 24 months (2 years)
- **All-time stats:** Forever

### Aggregation Process

1. Daily: At midnight, sessions older than 7 days are aggregated into weekly summaries
2. Weekly: Weekly summaries older than 1 year are aggregated into monthly summaries
3. Cleanup: Runs when storage quota is exceeded, removing oldest data first

---

## Multi-Tab Coordination

### Leader Election Algorithm

```typescript
// Heartbeat mechanism
const HEARTBEAT_INTERVAL = 2000; // 2 seconds
const LEADER_TIMEOUT = 5000; // 5 seconds

// On mount
1. Subscribe to BroadcastChannel
2. Listen for heartbeats from other tabs
3. Send own heartbeat every 2s

// Leader election
if (no heartbeat received for 5s) {
  setIsLeader(true);
  startTracking();
} else {
  setIsLeader(false);
  stopTracking();
  showFollowerMessage();
}

// On unmount
1. Stop heartbeat
2. Close BroadcastChannel
3. Allow other tabs to become leader
```

### Message Types

- `heartbeat` - Tab is alive and tracking
- `session_started` - New session created
- `session_stopped` - Session ended
- `stats_updated` - Statistics changed

---

## Key Utilities

### presenceAnalyzer.ts

```typescript
// Core presence detection logic
analyzePoseLandmarks(landmarks) → { isPresent, confidence }
calculateBreakTime(session) → seconds
calculateContinuousDeskTime(session) → seconds
formatGoalProgress(current, goal) → percentage
aggregateWeeklyStats(days) → { totalDeskTime, avgDaily, daysActive }
```

### poseDetector.ts

```typescript
// Singleton MediaPipe manager
getInstance() → PoseDetectorSingleton
initialize() → Promise<void>
detect(videoElement, timestamp) → PoseDetectionResult | null
close() → void
isReady() → boolean
```

### statsStorage.ts

```typescript
// Data persistence
loadOrInitializeStats() → StatsData
saveStats(stats) → void
aggregateOldSessions(stats) → void
exportToCSV(stats) → string
exportToJSON(stats) → string
clearAllData() → void
```

---

## Privacy & Security

### Privacy-First Design

✅ All processing happens client-side
✅ No video or pose data sent to servers
✅ No analytics or tracking
✅ Data stored only in browser localStorage
✅ User controls all data (export/delete)

### Data Minimization

- Only store presence intervals, not raw pose data
- Aggregate old data to reduce storage
- No personally identifiable information collected

### User Control

- Manual session start/stop
- Clear all data option
- Export data (CSV/JSON)
- No automatic uploads

---

## Testing Strategy

See `TESTING.md` for detailed testing checklist.

**Test Coverage:**

- ✅ Utility functions (presenceAnalyzer, statsStorage)
- ⏳ Hooks (useWebcam, usePoseDetection, usePresenceTracking, useStatsTracking)
- ⏳ Components (VideoCapture, DailyStats, StatsModal)
- ⏳ E2E flows (session tracking, multi-tab coordination)

**Target: 70%+ code coverage**

---

## Future Enhancements

### Potential Features (Post-MVP)

- 📊 More detailed analytics and insights
- 🎯 Customizable goals and milestones
- 📱 PWA support for mobile
- 🔔 Advanced notification types
- 📈 Productivity trends and patterns
- 🌐 Optional cloud backup (with user consent)
- 🤖 ML-based posture analysis

### Technical Improvements

- WebWorker for pose detection (offload main thread)
- IndexedDB for larger data storage
- Better error recovery and retry logic
- Accessibility improvements (ARIA labels, keyboard navigation)
- Performance optimizations (memoization, virtualization)

---

## Troubleshooting

### Common Issues

**Camera not starting:**

- Check browser permissions
- Ensure HTTPS or localhost
- Try different browser

**Pose detection not working:**

- Wait for MediaPipe to load
- Ensure good lighting
- Check camera angle (face should be visible)

**Multi-tab issues:**

- Check BroadcastChannel support
- Clear localStorage if corrupted
- Refresh all tabs

**Stats not saving:**

- Check localStorage quota
- Clear old data
- Check browser console for errors

---

## Contributing

When modifying this codebase:

1. **Read the docs:** Start with `agent.md`, then this file
2. **Follow patterns:** Match existing code style and architecture
3. **Test thoroughly:** Add tests for new features
4. **Update docs:** Keep documentation in sync with code
5. **Privacy first:** Never compromise user privacy

---

**Last Updated:** January 21, 2026  
**Version:** 1.0.0 (MVP)
