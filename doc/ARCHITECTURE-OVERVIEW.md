# Architecture Overview

> **File:** `/doc/ARCHITECTURE-OVERVIEW.md`
> **Last Updated:** 2026-01-21
> **Tags:** `#architecture` `#overview` `#design`
> **Complexity:** Medium

---

## Purpose

AI Desk Watch is a privacy-first desk time tracking application that uses client-side AI pose detection to determine user presence. This document provides a high-level overview of the system architecture, design decisions, and data flow.

## System Overview

### Core Concept

```
Camera → Pose Detection (AI) → Presence Analysis → Session Tracking → Statistics
```

The application follows a unidirectional data flow pattern where each layer builds upon the previous one, maintaining clear separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│                   (Dark Mode + Layout)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   VideoCapture.tsx                           │
│              (Main Orchestrator Component)                   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  useWebcam   │→ │usePoseDetect │→ │usePresence   │     │
│  │              │  │              │  │Tracking      │     │
│  └──────────────┘  └──────────────┘  └───────┬──────┘     │
│                                              │             │
│  ┌──────────────┐  ┌──────────────┐         │             │
│  │useStats      │← │useNotifica-  │←────────┘             │
│  │Tracking ⭐   │  │tions         │                        │
│  └──────────────┘  └──────────────┘                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ DailyStats   │  │ StatsModal   │  │SettingsModal │     │
│  │ Component    │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Layers

### 1. Input Layer (Camera & AI)

**Components:**
- [[hooks/useWebcam|useWebcam]] - Camera access
- [[hooks/usePoseDetection|usePoseDetection]] - MediaPipe integration
- [[utils/poseDetector|poseDetector]] - Singleton AI model

**Responsibilities:**
- Request camera permissions
- Manage video stream lifecycle
- Load and initialize MediaPipe model
- Extract 33 pose landmarks every 500ms
- Handle errors and cleanup

**Data Output:** `landmarks: NormalizedLandmark[] | null`

### 2. Analysis Layer (Presence Detection)

**Components:**
- [[hooks/usePresenceTracking|usePresenceTracking]] - Presence hook
- [[utils/presenceAnalyzer|presenceAnalyzer]] - Analysis algorithms

**Responsibilities:**
- Analyze pose landmarks for visibility
- Check body centering and positioning
- Calculate confidence scores
- Apply hysteresis filtering to prevent flickering
- Determine final presence state

**Data Output:** 
```typescript
{
  isPresent: boolean,
  confidence: number,
  lastSeen: Date | null,
  deskTime: number
}
```

### 3. Tracking Layer (Session & Stats)

**Components:**
- [[hooks/useStatsTracking|useStatsTracking]] ⭐ - Core tracking hook
- [[utils/statsStorage|statsStorage]] - Persistence layer
- [[types/stats|stats]] - Type definitions

**Responsibilities:**
- Manual session start/stop control
- Create presence intervals (present/away)
- Aggregate statistics from intervals
- Handle multi-tab coordination (leader election)
- Persist data to localStorage
- Handle midnight rollover
- Automatic data cleanup

**Data Output:** `DailyStats`, `PresenceSession[]`, `AllTimeStats`

### 4. Notification Layer

**Components:**
- [[hooks/useNotifications|useNotifications]] - Notification management

**Responsibilities:**
- Request notification permissions
- Track continuous desk time
- Schedule break reminders (default: 120 minutes)
- Prevent notification spam (5-minute minimum gap)

### 5. Presentation Layer (UI)

**Components:**
- [[components/VideoCapture|VideoCapture]] - Main container
- [[components/DailyStats|DailyStats]] - Dashboard
- [[components/StatsModal|StatsModal]] - Detailed stats
- [[components/SettingsModal|SettingsModal]] - Settings
- [[components/TimelineChart|TimelineChart]] - Timeline visualization
- [[components/WeeklyBarChart|WeeklyBarChart]] - Weekly chart

**Responsibilities:**
- Display real-time presence status
- Show statistics and visualizations
- Provide user controls (start/stop, settings)
- Handle modal interactions
- Responsive design

## Data Flow Sequence

### Application Startup

```
1. User visits page
2. React mounts App component
3. App loads dark mode preference from localStorage
4. VideoCapture component renders
5. User sees "Start Camera" button
   (Nothing happens until user clicks)
```

### Camera Start Flow

```
1. User clicks "Start Camera"
   ↓
2. useWebcam.startCapture()
   ↓
3. navigator.mediaDevices.getUserMedia({ video: true })
   ↓
4. Browser requests camera permission
   ↓
5. On success: Stream → <video> element
   ↓
6. usePoseDetection auto-starts
   ↓
7. MediaPipe model loads (async, ~2-3 seconds)
   ↓
8. Detection loop begins (every 500ms)
   ↓
9. Landmarks extracted → passed to usePresenceTracking
   ↓
10. Presence state calculated → displayed in UI
```

### Session Tracking Flow

```
1. User clicks "Start Session"
   ↓
2. useStatsTracking.startSession()
   ↓
3. Create new PresenceSession object
   ↓
4. Start first PresenceInterval (based on current presence)
   ↓
5. Every second:
   - Check if isPresent changed
   - If changed: end current interval, start new one
   ↓
6. Every 5 seconds:
   - Calculate aggregate stats (total desk/break time)
   - Save to localStorage
   ↓
7. User clicks "Stop Session" OR midnight occurs
   ↓
8. End current interval
   ↓
9. Finalize session (set end timestamp)
   ↓
10. Add session to todayStats
   ↓
11. Save final state to localStorage
```

### Multi-Tab Coordination Flow

```
Tab 1 (First):
  1. Create BroadcastChannel("stats-tracking")
  2. Send "HELLO" message
  3. Wait 500ms for response
  4. No response → become LEADER
  5. Start heartbeat (every 2 seconds)
  6. Track stats normally

Tab 2 (Second):
  1. Create BroadcastChannel("stats-tracking")
  2. Send "HELLO" message
  3. Receive "I_AM_LEADER" from Tab 1
  4. Become FOLLOWER
  5. Load stats from localStorage (read-only)
  6. Show "Tracking in another tab" banner
  7. Listen for "STATS_UPDATED" messages
  8. Update UI when stats change

Tab 1 Closes:
  1. Stop heartbeat
  2. After 500ms timeout, Tab 2 notices
  3. Tab 2 promotes itself to LEADER
  4. Tab 2 resumes tracking
```

## State Management Strategy

### Global State (App-Level)
- **Dark Mode** - Stored in App.tsx, persisted to `aideskwatch_dark_mode`

### Component State (Local UI)
- Modal open/closed states
- Panel expansion states
- Form inputs (settings)

### Hook State (Domain Logic)
- Camera status, video stream
- Pose landmarks (ephemeral)
- Presence state
- Session tracking state
- Notification state

### Persisted State (localStorage)
- Statistics data (`aideskwatch_stats`)
- User settings (`aideskwatch_config`)
- UI preferences (panel states, dev mode, etc.)

**No Redux/Context:** Application uses hooks and local state for simplicity.

## Design Patterns

### 1. Singleton Pattern
**Where:** [[utils/poseDetector|poseDetector]]

**Why:** MediaPipe model is expensive to load. Singleton ensures one instance per app.

```typescript
let instance: PoseDetectorSingleton | null = null;

export function getPoseDetector(): PoseDetectorSingleton {
  if (!instance) {
    instance = new PoseDetectorSingleton();
  }
  return instance;
}
```

### 2. Custom Hooks Pattern
**Where:** All 7 hooks

**Why:** Encapsulate complex logic, make components simple, enable reusability.

**Example:**
```typescript
// Hook handles all webcam complexity
const { videoRef, isCapturing, startCapture, stopCapture } = useWebcam();

// Component just uses it
<video ref={videoRef} />
<button onClick={startCapture}>Start</button>
```

### 3. Composition Pattern
**Where:** Component structure

**Why:** Build complex UIs from small, focused components.

```typescript
<DailyStats>
  <StatBox title="Desk Time" value="2h 15m" />
  <StatBox title="Break Time" value="45m" />
  <GoalProgressBox goalProgress={75} />
  <TimelineChart sessions={sessions} />
  <WeeklyBarChart recentDays={days} />
</DailyStats>
```

### 4. Leader Election Pattern
**Where:** [[hooks/useStatsTracking|useStatsTracking]]

**Why:** Prevent conflicts when multiple tabs are open.

**Mechanism:** BroadcastChannel with heartbeat and timeout.

### 5. Repository Pattern
**Where:** [[utils/statsStorage|statsStorage]]

**Why:** Abstract localStorage operations, handle errors, provide clean interface.

```typescript
// Component doesn't care about localStorage details
const stats = loadStats();
saveStats(updatedStats);
```

## Technology Choices

### React 19
- **Why:** Latest features, better performance, React Compiler support
- **Alternative:** Vue, Svelte - React chosen for ecosystem and familiarity

### TypeScript
- **Why:** Type safety, better IDE support, catch errors early
- **Alternative:** JavaScript - TypeScript essential for complex state management

### MediaPipe
- **Why:** Production-ready, GPU-accelerated, runs in browser
- **Alternative:** TensorFlow.js - MediaPipe more optimized for pose detection

### Vite
- **Why:** Fast HMR, modern build tool, ESM-native
- **Alternative:** Webpack, Parcel - Vite chosen for speed

### D3.js
- **Why:** Powerful, flexible, full control over visualization
- **Alternative:** Chart.js, Recharts - D3 chosen for interactivity (zoom, pan)

### TailwindCSS
- **Why:** Utility-first, rapid development, consistent design
- **Alternative:** Styled Components, CSS Modules - Tailwind chosen for speed

### localStorage
- **Why:** Simple, no server needed, privacy-preserving
- **Alternative:** IndexedDB, server storage - localStorage sufficient for data size

## Data Retention Policy

### Recent Data (7 days)
- **Storage:** `recentDays` object
- **Detail:** Full session data with intervals
- **Purpose:** Detailed analysis, timeline visualization

### Historical Weeks (52 weeks)
- **Storage:** `historicalWeeks[]` array
- **Detail:** Aggregated weekly totals
- **Purpose:** Long-term trends, weekly comparison

### Historical Months (24 months)
- **Storage:** `historicalMonths[]` array
- **Detail:** Aggregated monthly totals
- **Purpose:** Year-over-year comparison

### All-Time Stats
- **Storage:** `allTime` object
- **Detail:** Lifetime totals
- **Purpose:** Overall progress tracking

**Automatic Cleanup:** See [[algorithms/DATA-AGGREGATION|Data Aggregation Strategy]]

## Security & Privacy Design

### Privacy Principles
1. **Client-Side Only:** No server, no data transmission
2. **No Video Storage:** Only pose landmarks processed (never stored)
3. **No Landmark Storage:** Only presence intervals stored
4. **User Control:** Manual session control, export/delete data
5. **No Analytics:** Zero tracking or telemetry

### Security Considerations
- Camera permission required (browser security)
- localStorage is origin-bound (domain isolation)
- No XSS vectors (React escaping, no dangerouslySetInnerHTML)
- No sensitive data stored (only timestamps and durations)

## Performance Optimizations

### 1. Pose Detection Throttling
- Detection runs every 500ms (not 60fps)
- Reduces CPU/GPU load by 97%

### 2. Lazy Model Loading
- MediaPipe model loads only after camera starts
- Reduces initial page load time

### 3. Singleton Pattern
- One MediaPipe instance across all hooks
- Saves memory and initialization time

### 4. Hysteresis Filtering
- Prevents rapid state changes
- Reduces unnecessary re-renders

### 5. Throttled Storage
- Stats saved every 5 seconds (not every second)
- Reduces localStorage write operations

### 6. React Compiler
- Automatic memoization of components
- Reduces unnecessary re-renders

### 7. D3 Zoom State Persistence
- Saves zoom/pan state to localStorage
- Prevents reset on re-render

## Scalability Considerations

### Current Limits
- **localStorage Quota:** ~5-10MB (browser-dependent)
- **Data Retention:** 7 days detailed, 52 weeks aggregated
- **Sessions per Day:** Unlimited (practically 10-20)
- **Multi-Tab:** Leader election handles 2-5 tabs easily

### Future Scalability
- **IndexedDB Migration:** If localStorage insufficient
- **Cloud Sync:** Optional server backup (preserves privacy)
- **Export/Import:** Manual data migration between devices

## Error Handling Strategy

### Camera Errors
- Permission denied → Show helpful message
- Device not found → Suggest troubleshooting
- Stream error → Allow retry

### AI Model Errors
- Model load failure → Show error, allow retry
- Detection error → Log error, continue tracking

### Storage Errors
- Quota exceeded → Auto-cleanup old data
- Parse error → Reset to initial state (last resort)

### Multi-Tab Errors
- Channel error → Fall back to follower mode
- Heartbeat timeout → Promote to leader

## Testing Strategy

### Unit Tests
- **Utils:** [[utils/presenceAnalyzer|presenceAnalyzer]], [[utils/statsStorage|statsStorage]]
- **Focus:** Algorithms, calculations, data transformations

### Integration Tests
- **Hooks:** Test hook behavior with mock data
- **Components:** Test UI interactions

### Manual Tests
- **Real-world:** Camera, pose detection, multi-tab
- **Checklist:** See `TESTING.md`

**Current Coverage:** ~30% (utils covered, hooks/components need tests)

## Related Documents

- [[INDEX|Documentation Index]]
- [[DATA-FLOW|Detailed Data Flow]]
- [[COMPONENT-HIERARCHY|Component Hierarchy]]
- [[STATE-MANAGEMENT|State Management]]
- [[hooks/useStatsTracking|useStatsTracking]] - Core tracking logic
- [[features/MULTI-TAB-SYNC|Multi-Tab Synchronization]]

---

**Next Steps:** Review [[hooks/useStatsTracking|useStatsTracking]] for deep dive into tracking logic.
