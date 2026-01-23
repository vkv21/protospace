# 🔖 Code Review Note: StatsModal.tsx

### 1. **File/Module Name**
- `src/components/StatsModal.tsx`

### 2. **Purpose & Role (What does it do?)**
- A comprehensive full-screen overlay that provides detailed statistics across different timeframes (Today, Week, Month, All-Time). It handles data exporting (CSV/JSON), data clearing with confirmation, and displays historical session lists and charts.

### 3. **Inputs**
- **Props**:
    - `isOpen`: Boolean controlling modal visibility.
    - `onClose`: Callback to close the modal.
    - `stats`: `StatsData` object (contains settings and all-time aggregates).
    - `recentDays`: `Record<string, DailyStats>` for historical visualization.

### 4. **Outputs / Returned Value**
- A tabbed modal UI featuring:
    - **Today Tab**: Detailed breakdown of today's time and a chronological session list.
    - **Week Tab**: Aggregated weekly totals and the `WeeklyBarChart`.
    - **Month Tab**: (Placeholder) Monthly aggregation.
    - **All-Time Tab**: Summary cards for total time, days tracked, and daily averages.
    - **Export/Clear Actions**: Buttons to download data or wipe local storage.
    - **Privacy Disclaimer**: Note about local-only storage.

### 5. **Key Logic & Flow**
- **Lifecycle Management**: 
    - Listens for the `Escape` key to close.
    - Locks `document.body` scroll when open.
- **Data Export**: Uses `Blob` and `URL.createObjectURL` to trigger file downloads for CSV and JSON formats based on utility functions from `statsStorage`.
- **Destructive Action**: `handleClearData` implements a "double-tap" confirmation logic (state toggles, then clears on second click within 5s).
- **Tab Selection**: Uses `activeTab` state to conditionally render different statistical views.

### 6. **External Dependencies**
- **Utils**: `formatDeskTime`, `formatGoalProgress`, `exportToCSV`, `exportToJSON`, `clearAllData`.
- **Components**: `WeeklyBarChart`.
- **Types**: `StatsData`, `DailyStats`.
- **React**: `useState`, `useEffect`.

### 7. **Integration Points**
- Triggered by `DailyStats.tsx` or `App.tsx` via the "View Details" or "Stats" button.
- Consumes the central `recentDays` and `stats` state.

### 8. **Edge Cases & Notable Behaviors**
- **Backdrop Closing**: Closes when clicking the blurred background (`handleBackdropClick`).
- **Data Persistence**: `clearAllData` triggers a `window.location.reload()` to ensure all in-memory React states are reset to match the empty local storage.
- **Empty States**: Shows "No data" placeholders if `todayStats` is missing or no sessions are recorded.

### 9. **Tests (if any)**
- TODO: Check for `StatsModal.test.tsx`.

### 10. **Questions / TODOs for Further Study**
- The "Month" tab is currently a placeholder; implementation is pending.
- The `weeklyTotals` and `last7Days` are calculated on every render; consider memoizing them with `useMemo` if `recentDays` grows large.
- All-time data depends on `stats.allTime` structure; verify if this structure is updated correctly in the storage utility during tracking.
