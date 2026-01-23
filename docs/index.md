# Commit Space - Documentation Index

> **Last Updated:** 2026-01-23
> **Version:** 2.1
> **Status:** Active Development (Documentation Standardized)

## Quick Navigation

### Getting Started
- [[architecture/overview|Architecture Overview]] - High-level system design
- [[DATA-FLOW|Data Flow]] - How data moves through the application
- [[GETTING-STARTED|Getting Started]] - Setup and development guide

### Code Structure (Standardized)

#### Hooks
- [[hooks/use-webcam|useWebcam]] - Webcam access and stream management
- [[hooks/use-pose-detection|usePoseDetection]] - MediaPipe pose detection integration
- [[hooks/use-presence-tracking|usePresenceTracking]] - Presence analysis from landmarks
- [[hooks/use-stats-tracking|useStatsTracking]] - Session and statistics tracking ⭐ CORE
- [[hooks/use-d3-timeline|useD3Timeline]] - D3.js timeline visualization
- [[hooks/use-notifications|useNotifications]] - Break reminder notifications
- [[hooks/use-canvas-overlay|useCanvasOverlay]] - Pose landmark visualization

#### Components
- [[components/video-capture|VideoCapture]] - Main orchestrator component ⭐ CORE
- [[components/daily-stats|DailyStats]] - Today's statistics dashboard
- [[components/stats-modal|StatsModal]] - Detailed statistics modal
- [[components/settings-modal|SettingsModal]] - User settings and preferences
- [[components/timeline-chart|TimelineChart]] - Interactive timeline chart
- [[components/weekly-bar-chart|WeeklyBarChart]] - 7-day bar chart
- [[components/stat-box|StatBox]] - Reusable stat display
- [[components/goal-progress-box|GoalProgressBox]] - Goal progress display
- [[components/session-timer|SessionTimer]] - Active session duration clock
- [[components/confirm-dialog|ConfirmDialog]] - Interactive confirmation modal
- [[components/app|App]] - Root application component

#### Utilities
- [[utils/poseDetector|poseDetector]] - MediaPipe singleton wrapper
- [[utils/presenceAnalyzer|presenceAnalyzer]] - Presence detection algorithms
- [[utils/activityAnalyzer|activityAnalyzer]] - Activity detection and labeling
- [[utils/statsStorage|statsStorage]] - localStorage persistence layer
- [[utils/landmarkDrawer|landmarkDrawer]] - Canvas drawing utilities

#### Types
- [[reference/types|stats]] - TypeScript type definitions

### Features & Concepts

#### Core Features
- [[features/session-tracking|Session Tracking]] ⭐ CORE - Manual session control with intervals
- [[features/multi-tab-sync|Multi-Tab Synchronization]] ⭐ CORE - Leader election and coordination

#### Algorithms & Patterns
- [[algorithms/presence-detection|Presence Detection Algorithm]] ⭐ - Multi-criteria scoring system
- [[algorithms/hysteresis-filter|Hysteresis Filter Pattern]] - Noise reduction for state changes
- [[algorithms/leader-election|Leader Election Protocol]] - Multi-tab coordination via BroadcastChannel
- [[algorithms/data-aggregation|Data Aggregation Strategy]] - Progressive compression (7d → 52w → 120m)

### Technical Documentation

#### Architecture
- [[architecture/overview|Architecture Overview]]
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

---

**Need Help?** Check [[TROUBLESHOOTING|Troubleshooting]] or review the [[architecture/overview|Architecture Overview]]
