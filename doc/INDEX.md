# AI Desk Watch - Documentation Index

> **Last Updated:** 2026-01-21
> **Version:** 2.0
> **Status:** Active Development

## Quick Navigation

### Getting Started
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]] - High-level system design
- [[DATA-FLOW|Data Flow]] - How data moves through the application
- [[GETTING-STARTED|Getting Started]] - Setup and development guide

### Code Structure

#### Hooks
- [[hooks/useWebcam|useWebcam]] - Webcam access and stream management
- [[hooks/usePoseDetection|usePoseDetection]] - MediaPipe pose detection integration
- [[hooks/usePresenceTracking|usePresenceTracking]] - Presence analysis from landmarks
- [[hooks/useStatsTracking|useStatsTracking]] - Session and statistics tracking ⭐ CORE
- [[hooks/useD3Timeline|useD3Timeline]] - D3.js timeline visualization
- [[hooks/useNotifications|useNotifications]] - Break reminder notifications
- [[hooks/useCanvasOverlay|useCanvasOverlay]] - Pose landmark visualization

#### Components
- [[components/VideoCapture|VideoCapture]] - Main orchestrator component ⭐ CORE
- [[components/DailyStats|DailyStats]] - Today's statistics dashboard
- [[components/StatsModal|StatsModal]] - Detailed statistics modal
- [[components/SettingsModal|SettingsModal]] - User settings and preferences
- [[components/TimelineChart|TimelineChart]] - Interactive timeline chart
- [[components/WeeklyBarChart|WeeklyBarChart]] - 7-day bar chart
- [[components/StatBox|StatBox]] - Reusable stat display
- [[components/GoalProgressBox|GoalProgressBox]] - Goal progress display
- [[components/App|App]] - Root application component

#### Utilities
- [[utils/poseDetector|poseDetector]] - MediaPipe singleton wrapper
- [[utils/presenceAnalyzer|presenceAnalyzer]] - Presence detection algorithms
- [[utils/statsStorage|statsStorage]] - localStorage persistence layer
- [[utils/landmarkDrawer|landmarkDrawer]] - Canvas drawing utilities

#### Types
- [[types/stats|stats]] - TypeScript type definitions

### Features & Concepts

#### Core Features
- [[features/SESSION-TRACKING|Session Tracking]] ⭐ CORE - Manual session control with intervals
- [[features/MULTI-TAB-SYNC|Multi-Tab Synchronization]] ⭐ CORE - Leader election and coordination

#### Algorithms & Patterns
- [[algorithms/PRESENCE-DETECTION|Presence Detection Algorithm]] ⭐ - Multi-criteria scoring system
- [[algorithms/HYSTERESIS-FILTER|Hysteresis Filter Pattern]] - Noise reduction for state changes
- [[algorithms/LEADER-ELECTION|Leader Election Protocol]] - Multi-tab coordination via BroadcastChannel
- [[algorithms/DATA-AGGREGATION|Data Aggregation Strategy]] - Progressive compression (7d → 52w → 120m)

### Technical Documentation

#### Architecture
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[STATE-MANAGEMENT|State Management]]
- [[COMPONENT-HIERARCHY|Component Hierarchy]]
- [[HOOK-DEPENDENCIES|Hook Dependency Graph]]

#### Development
- [[DEVELOPMENT-GUIDE|Development Guide]]
- [[TESTING-STRATEGY|Testing Strategy]]
- [[BUILD-DEPLOYMENT|Build & Deployment]]
- [[TROUBLESHOOTING|Troubleshooting]]

#### Privacy & Security
- [[PRIVACY-DESIGN|Privacy-First Design]]
- [[DATA-RETENTION|Data Retention Policy]]
- [[SECURITY-CONSIDERATIONS|Security Considerations]]

## Document Metadata

All documentation files include standardized metadata for easy navigation:

```yaml
---
tags: [hooks, presence, tracking]
related: [useStatsTracking, presenceAnalyzer]
complexity: medium
last_updated: 2026-01-21
---
```

## Project Statistics

- **Total Lines of Code:** ~7,500+
- **Documentation:** 23 markdown files (~11,000 lines)
- **Hooks:** 7 custom hooks
- **Components:** 9 React components
- **Utilities:** 4 utility modules
- **Tests:** 2 test suites (needs expansion)

## Technology Stack

- **Frontend:** React 19, TypeScript 5.9
- **Build:** Vite 7.2 (Rolldown)
- **AI:** MediaPipe Pose Landmarker
- **Visualization:** D3.js
- **Styling:** TailwindCSS 4
- **Testing:** Vitest, Testing Library

## Key Principles

1. **Privacy-First:** All processing happens client-side
2. **Manual Control:** User controls session start/stop
3. **Data Minimization:** Store only necessary presence intervals
4. **Multi-Tab Safe:** Leader election prevents conflicts
5. **Progressive Enhancement:** Works without notifications
6. **Accessibility:** Keyboard navigation, screen reader support

## Navigation Tips

- Use `[[link]]` syntax for Obsidian wiki-links
- ⭐ marks core/critical components
- Links include context (e.g., "used by X" or "depends on Y")
- Each doc has "Related Documents" section at bottom

## Quick Reference

### Common Tasks
- **Understanding presence detection:** See [[algorithms/PRESENCE-DETECTION|Presence Detection Algorithm]]
- **Fix flickering presence state:** See [[algorithms/HYSTERESIS-FILTER|Hysteresis Filter]]
- **Debug multi-tab issues:** See [[features/MULTI-TAB-SYNC|Multi-Tab Sync]] & [[algorithms/LEADER-ELECTION|Leader Election]]
- **Understand data storage:** See [[algorithms/DATA-AGGREGATION|Data Aggregation]]
- **Modify session tracking:** See [[features/SESSION-TRACKING|Session Tracking]]

### File Locations
- **Hooks:** `/src/hooks/`
- **Components:** `/src/components/`
- **Utilities:** `/src/utils/`
- **Types:** `/src/types/`
- **Tests:** `/src/**/__tests__/`
- **Documentation:** `/doc/`

---

**Need Help?** Check [[TROUBLESHOOTING|Troubleshooting]] or review the [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
