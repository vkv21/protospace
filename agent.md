# AI Agent Instructions for CommitSpace FE

This document provides instructions for an AI agent working on this codebase.

## 1. Project Overview

This is the frontend for **CommitSpace**, a web application designed to automatically track a user's desk time and break time. It uses **local camera-based pose detection** via MediaPipe to monitor when the user is "at desk" versus "away" and provides real-time statistics and historical data.

**Core Functionality:**

- Capture webcam video feed and run pose detection using MediaPipe locally in the browser.
- Analyze pose landmarks to determine user presence (present vs. away) with confidence scoring.
- Track sessions with start/stop controls, recording presence/away intervals throughout the day.
- Calculate daily statistics (total desk time, break time, continuous desk time) in real-time.
- Persist statistics to `localStorage` to handle page reloads and maintain history.
- Display real-time stats, daily goals, historical data, and interactive timeline visualizations.
- Handle multi-tab scenarios gracefully using BroadcastChannel API with a leader/follower pattern to prevent duplicate tracking.
- Provide break reminder notifications based on continuous desk time.

## 2. Tech Stack

- **Framework**: React
- **Language**: TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest
- **Linting**: ESLint
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **Pose Detection**: MediaPipe Pose Landmarker (runs client-side in browser)
- **Visualization**: D3.js (for timeline charts)

## 3. Codebase Architecture

The application's logic is primarily organized within custom hooks and utility functions.

### Key Files & Directories:

- **`src/hooks/useStatsTracking.ts`**: This is the **most critical file**. It contains the central logic for session management, multi-tab coordination, statistics calculation, and data persistence. **Any changes to tracking logic will likely happen here.**
- **`src/hooks/useWebcam.ts`**: Manages webcam access and video stream lifecycle.
- **`src/hooks/usePoseDetection.ts`**: Runs MediaPipe pose detection on the video stream at regular intervals (500ms default).
- **`src/hooks/usePresenceTracking.ts`**: Analyzes pose landmarks to determine presence status with hysteresis and confidence scoring.
- **`src/utils/statsStorage.ts`**: Handles all `localStorage` interactions (reading, writing, and initializing statistics).
- **`src/utils/presenceAnalyzer.ts`**: Contains core logic for analyzing pose landmarks and calculating presence confidence.
- **`src/utils/poseDetector.ts`**: Singleton wrapper for MediaPipe PoseLandmarker initialization and management.
- **`src/types/stats.ts`**: Contains all TypeScript type definitions for the core data structures (`DailyStats`, `PresenceSession`, `PresenceInterval`, etc.).
- **`src/components/`**: Contains all reusable React components (VideoCapture, DailyStats, TimelineChart, etc.).
- **`APP-ARCHITECTURE.md`**: Provides a detailed diagram and explanation of the data flow and component responsibilities. **Consult this file for a deeper understanding of the architecture.**
- **`STATISTICS-CALCULATION.md`**: Documents how statistics are calculated from sessions and intervals.
- **`TESTING.md`**: Manual testing checklist and testing strategy for MVP features.

### Data Flow Summary:

1.  `useWebcam` captures the video stream from the user's webcam.
2.  `usePoseDetection` runs MediaPipe pose detection on video frames every 500ms, extracting 33 body landmarks.
3.  `usePresenceTracking` analyzes landmarks using `presenceAnalyzer.ts` to determine if the user is present (with confidence score and hysteresis for stability).
4.  `useStatsTracking` consumes the `isPresent` status and manages the current session.
5.  When a session is active, `useStatsTracking` creates `PresenceInterval` objects (present/away) and updates them every second.
6.  Every 5 seconds, it calculates aggregate stats (`totalDeskTime`, `totalBreakTime`, etc.) and saves them to `localStorage` via `statsStorage.ts`.
7.  UI components in `src/components/` receive the calculated stats from `useStatsTracking` and render them.
8.  Multi-tab coordination via BroadcastChannel ensures only one tab actively tracks at a time.

## 4. Development Guidelines

- **Follow Conventions**: Adhere strictly to the existing coding style, naming conventions, and architectural patterns.
- **Type Safety**: Use the types defined in `src/types/stats.ts`. Ensure all new code is strongly typed.
- **Immutability**: When updating state, especially complex nested objects like the `stats` data, prefer immutable patterns (e.g., using spread syntax `...`) to avoid side effects.
- **Centralized Logic**: Keep business logic concentrated in the `hooks` directory. UI components should be as "dumb" as possible, primarily responsible for displaying data they receive as props.
- **Test Your Code**: Add Vitest tests for any new or modified business logic, especially in the `hooks` and `utils` directories.
- **Privacy First**: All processing happens client-side. No video or pose data is sent to any server. Statistics are stored locally in the browser only.

## 5. Available Commands

Use the following `npm` scripts for development and verification:

- **`npm run dev`**: Start the local development server.
- **`npm run build`**: Create a production build.
- **`npm run lint`**: Run ESLint to check for code quality issues.
- **`npm test`**: Execute the Vitest test suite.
- **`npm run coverage`**: Run tests and generate a coverage report.

**Before committing, please ensure `npm run lint` and `npm test` pass successfully.**

## 6. Key Architecture Decisions

### Why Client-Side Only?

- **Privacy**: No video data leaves the user's device. All processing is local.
- **Simplicity**: No backend infrastructure needed for MVP.
- **Performance**: MediaPipe runs efficiently in modern browsers via WebAssembly.

### Session-Based Tracking

- Users manually start/stop work sessions using UI controls.
- Statistics are calculated by aggregating all sessions throughout the day.
- Time between sessions is NOT counted as break time (see `STATISTICS-CALCULATION.md`).

### Multi-Tab Coordination

- Uses BroadcastChannel API for tab communication.
- Leader election with heartbeat mechanism ensures only one tab tracks actively.
- Other tabs show "Tracking in another tab" message.

### Data Retention

- Detailed session data: 7 days
- Weekly aggregates: 52 weeks
- Monthly aggregates: 24 months
- All data stored in `localStorage` under `commitspace_stats` key.
