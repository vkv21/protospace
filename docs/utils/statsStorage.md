### 1. **File/Module Name**
- `src/utils/statsStorage.ts`

### 2. **Purpose & Role (What does it do?)**
- Manages the persistence and lifecycle of user statistics in `localStorage`. It handles loading, saving, aggregating old data to save space, and exporting data for user download.

### 3. **Inputs**
- `saveStats(stats: StatsData)`: The full statistics object to be persisted.
- `aggregateOldSessions(stats: StatsData)`: Operates on the stats object to consolidate granular daily data.

### 4. **Outputs / Returned Value**
- `loadOrInitializeStats()`: Returns either the stored `StatsData` or a fresh initial state.
- `exportToCSV/JSON()`: Returns string representations of the data for export.

### 5. **Key Logic & Flow**
- **Persistence Layer**: Simple JSON serialization/deserialization over `localStorage`.
- **Retention Policy**:
    - **Detailed Sessions**: Kept for a specific number of days (default 7).
    - **Aggregation**: Older daily stats are merged into `historicalWeeks`, and older weeks into `historicalMonths`.
- **Quota Management**: If `localStorage` throws a `QuotaExceededError`, it triggers an emergency `cleanupOldData` routine to purge the oldest historical records.
- **File Downloads**: Uses a hidden `<a>` tag and `URL.createObjectURL` to trigger browser downloads of CSV/JSON data.

### 6. **External Dependencies**
- `../types/stats`: For the `StatsData` and `STORAGE_KEYS` definitions.
- `./presenceAnalyzer`: For shared logic like `getWeekStartDate`.

### 7. **Integration Points**
- Used by `useStatsTracking.ts` to persist session updates.
- Used by `SettingsModal.tsx` and `StatsModal.tsx` for data export and clearing.

### 8. **Edge Cases & Notable Behaviors**
- **Migration/Initialization**: `createInitialStats` ensures a valid state even on first run.
- **Micro-Aggregations**: Aggregation happens in-place on the passed `stats` object, which is then typically saved back to storage.
- **Safety**: Try-catch blocks surround all `localStorage` interactions to handle private browsing modes or restricted permissions.

### 9. **Tests (if any)**
- `src/utils/__tests__/statsStorage.test.ts` (Covers aggregation logic and storage limits).

### 10. **Questions / TODOs for Further Study**
- Should we use IndexedDB for larger datasets to avoid the 5MB `localStorage` limit?
- The aggregation logic is currently manual—should it be triggered automatically on a background worker or during app startup?
- Is there a need for "import" functionality to complement the export?
