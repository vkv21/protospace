# VideoCapture Component ⭐

> **File:** `/src/components/VideoCapture.tsx`
> **Tags:** `#components` `#orchestrator` `#main` `#core`
> **Complexity:** Very High
> **Lines:** 611

---

## 1. File/Module Name

`VideoCapture.tsx` - **MAIN ORCHESTRATOR COMPONENT** - Coordinates all hooks and displays primary UI

## 2. Purpose & Role

The central component that brings everything together. Orchestrates all 6 custom hooks (camera, pose detection, presence tracking, stats tracking, notifications, canvas overlay), manages UI state (modals, toggles), and renders the main application interface including video feed, status indicators, controls, and statistics dashboard.

## 3. Inputs

**Props:** None (root-level component)

**State:**
- `devMode: boolean` - Show pose landmarks overlay (persisted)
- `selfViewEnabled: boolean` - Show/hide video feed (persisted)
- `isStatsModalOpen: boolean` - Stats modal visibility
- `isSettingsModalOpen: boolean` - Settings modal visibility

## 4. Outputs / Rendered Value

**Renders:**
- Video capture card with controls
- Presence status indicator
- Session controls (Start/Stop)
- Camera controls (Start/Stop)
- Dev mode toggle
- Self-view toggle
- Settings button
- DailyStats dashboard
- StatsModal (detailed statistics)
- SettingsModal (user preferences)

## 5. Key Logic & Flow

### Component Structure
```
VideoCapture
├── Left Column (lg:col-span-2)
│   ├── Video Card
│   │   ├── Header (title, toggles, settings)
│   │   ├── Video Container
│   │   │   ├── <video> element
│   │   │   └── <canvas> overlay (dev mode)
│   │   ├── Loading/Error States
│   │   ├── Presence Status Badge
│   │   ├── Camera Controls
│   │   └── Session Controls
│   └── Leader/Follower Status
├── Right Column (lg:col-span-1)
│   └── DailyStats Component
├── StatsModal (overlay)
└── SettingsModal (overlay)
```

### Hook Orchestration
```typescript
// 1. Camera
const { videoRef, isCapturing, startCapture, stopCapture } = useWebcam();

// 2. AI Detection
const { landmarks, isLoading, error } = usePoseDetection(videoRef, {
  enabled: isCapturing,
  intervalMs: 500
});

// 3. Presence Analysis
const { isPresent, confidence } = usePresenceTracking(landmarks);

// 4. Session Tracking
const { 
  todayStats, 
  currentSession, 
  startSession, 
  stopSession 
} = useStatsTracking({ isPresent });

// 5. Notifications
const { notificationPermission, requestPermission } = 
  useNotifications({ continuousDeskTime });

// 6. Dev Overlay
useCanvasOverlay({ canvasRef, videoRef, landmarks, enabled: devMode });
```

### UI State Flow
```
Camera Start → Loading → Pose Detection → Presence Status → Session Start
```

### Session Control Logic
```typescript
// Start Session Button
- Disabled if: no camera OR not present OR already tracking
- On click: startSession() from useStatsTracking

// Stop Session Button  
- Disabled if: not tracking
- On click: stopSession() from useStatsTracking
```

### Presence Status Badge
```
🟢 Present (Green) - confidence ≥ 50%
🟡 Low Confidence (Yellow) - confidence < 50%
🔴 Away (Red) - not present
```

## 6. External Dependencies

**Hooks:**
- [[hooks/useWebcam|useWebcam]]
- [[hooks/usePoseDetection|usePoseDetection]]
- [[hooks/usePresenceTracking|usePresenceTracking]]
- [[hooks/useStatsTracking|useStatsTracking]]
- [[hooks/useNotifications|useNotifications]]
- [[hooks/useCanvasOverlay|useCanvasOverlay]]

**Components:**
- [[components/DailyStats|DailyStats]]
- [[components/StatsModal|StatsModal]]
- [[components/SettingsModal|SettingsModal]]

**Utilities:**
- [[utils/presenceAnalyzer|presenceAnalyzer]] - formatDeskTime()

## 7. Integration Points

### Used By:
- [[components/App|App]] (src/App.tsx:95) - Root component

### Uses:
- All 7 custom hooks
- 3 child components (DailyStats, StatsModal, SettingsModal)

## 8. Edge Cases & Notable Behaviors

### Persistent UI Preferences
```typescript
// localStorage keys:
- 'commitspace_dev_mode' → devMode state
- 'commitspace_self_view' → selfViewEnabled state
```

### Self-View Toggle
- When OFF: Video/canvas hidden but still capturing
- Allows privacy while tracking continues
- Applied via `invisible` CSS class (keeps in DOM)

### Dev Mode
- Shows pose landmarks overlay on video
- Useful for debugging presence detection
- Persisted across sessions

### Button Disable Logic
```typescript
// Start Camera: Always enabled
// Stop Camera: Disabled if !isCapturing

// Start Session: Disabled if !isCapturing OR !isPresent OR isTracking
// Stop Session: Disabled if !isTracking
```

### Multi-Tab Banner
```
If !isLeader:
  "⚠️ Tracking is active in another tab..."
  (Shows at top of left column)
```

### Loading States
```
1. Camera starting: "Starting camera..."
2. MediaPipe loading: "Loading AI model..."
3. Ready: Show presence status
```

### Error Handling
```
- Camera error: Display error message with explanation
- Pose detection error: Display error in status area
- Fallback to red "Away" status on errors
```

## 9. Tests

**Current:** No tests

**Critical Tests Needed:**
- Hook orchestration
- Button enable/disable logic
- Modal interactions
- State persistence
- Error state rendering

## 10. Questions / TODOs

### Open Questions
1. **Auto-start camera?** Should camera start automatically on load?
2. **Auto-start session?** Should session start when camera starts?
3. **Persistent session?** Should session resume after page reload?

### Potential Improvements
- Camera device selector (front/back, multiple cameras)
- Resolution selector
- FPS/quality settings
- Keyboard shortcuts (Space = start/stop session)
- Fullscreen video mode
- Picture-in-picture mode

### Known Issues
- Large component (611 lines) - could be split
- Many nested conditions - refactor for clarity

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[components/DailyStats|DailyStats]]
- [[components/StatsModal|StatsModal]]
- [[components/SettingsModal|SettingsModal]]
- All hook documentation

## Component Hierarchy

```
VideoCapture ⭐ (orchestrator)
├── useWebcam
├── usePoseDetection
├── usePresenceTracking
├── useStatsTracking
├── useNotifications
├── useCanvasOverlay
├── DailyStats
│   ├── StatBox (×3)
│   ├── GoalProgressBox
│   ├── TimelineChart
│   └── WeeklyBarChart
├── StatsModal
│   └── WeeklyBarChart
└── SettingsModal
```

## Quick Reference

**Start Tracking:**
1. Click "Start Camera"
2. Wait for AI model to load
3. Ensure presence detected (green badge)
4. Click "Start Session"

**Stop Tracking:**
1. Click "Stop Session"
2. Optionally click "Stop Camera"

**View Statistics:**
- Click "View All Statistics" button
- Opens StatsModal with Today/Week/All-Time tabs

---

**This is the most important component - it's where everything comes together!**
