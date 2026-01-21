import type {
  StatsData,
  DailyStats,
  WeeklyAggregate,
  MonthlyAggregate,
} from '../types/stats';
import {
  DEFAULT_SETTINGS,
  DEFAULT_NOTIFICATIONS,
  STORAGE_KEYS,
  RETENTION_POLICY,
} from '../types/stats';
import {
  getWeekStartDate,
  generateCSV,
  generateJSON,
} from './presenceAnalyzer';

/**
 * Load statistics data from localStorage
 */
export function loadStats(): StatsData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!stored) return null;

    const data: StatsData = JSON.parse(stored);
    return data;
  } catch (error) {
    console.error('Failed to load stats from localStorage:', error);
    return null;
  }
}

/**
 * Save statistics data to localStorage
 */
export function saveStats(stats: StatsData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save stats to localStorage:', error);
    // Check if quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, cleaning up old data...');
      cleanupOldData(stats);
      // Try saving again after cleanup
      try {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      } catch (retryError) {
        console.error('Failed to save even after cleanup:', retryError);
      }
    }
  }
}

/**
 * Create initial empty stats data
 */
export function createInitialStats(): StatsData {
  const today = new Date().toISOString().split('T')[0];

  return {
    recentDays: {},
    historicalWeeks: [],
    historicalMonths: [],
    allTime: {
      totalDeskTime: 0,
      startDate: today,
      daysTracked: 0,
      avgDailyHours: 0,
    },
    settings: { ...DEFAULT_SETTINGS },
    notifications: { ...DEFAULT_NOTIFICATIONS },
  };
}

/**
 * Load or initialize statistics data
 */
export function loadOrInitializeStats(): StatsData {
  const stats = loadStats();
  return stats ?? createInitialStats();
}

/**
 * Aggregate old sessions (7+ days) into weekly summaries
 */
export function aggregateOldSessions(stats: StatsData): void {
  const now = new Date();
  const cutoffDate = new Date(
    now.getTime() -
      RETENTION_POLICY.DETAILED_SESSIONS_DAYS * 24 * 60 * 60 * 1000
  );
  const cutoffISO = cutoffDate.toISOString().split('T')[0];

  const daysToAggregate: Array<[string, DailyStats]> = [];

  // Find days older than retention period
  Object.entries(stats.recentDays).forEach(([date, dayStats]) => {
    if (date < cutoffISO) {
      daysToAggregate.push([date, dayStats]);
    }
  });

  if (daysToAggregate.length === 0) return;

  // Group by week
  const weekGroups = new Map<string, DailyStats[]>();

  daysToAggregate.forEach(([date, dayStats]) => {
    const weekStartDate = getWeekStartDate(new Date(date));
    const weekStart = weekStartDate.toISOString().split('T')[0];
    if (!weekGroups.has(weekStart)) {
      weekGroups.set(weekStart, []);
    }
    weekGroups.get(weekStart)!.push(dayStats);
  });

  // Create weekly aggregates
  weekGroups.forEach((days, weekStart) => {
    const totalDeskTime = days.reduce((sum, day) => sum + day.totalDeskTime, 0);
    const totalBreakTime = days.reduce(
      (sum, day) => sum + day.totalBreakTime,
      0
    );
    const daysActive = days.filter((day) => day.totalDeskTime > 0).length;
    const avgDailyHours =
      daysActive > 0 ? totalDeskTime / 3600 / daysActive : 0;

    const weeklyAggregate: WeeklyAggregate = {
      weekStart,
      totalDeskTime,
      totalBreakTime,
      avgDailyHours,
      daysActive,
    };

    // Check if week already exists
    const existingIndex = stats.historicalWeeks.findIndex(
      (w) => w.weekStart === weekStart
    );

    if (existingIndex >= 0) {
      // Update existing
      stats.historicalWeeks[existingIndex] = weeklyAggregate;
    } else {
      // Add new
      stats.historicalWeeks.push(weeklyAggregate);
    }
  });

  // Remove aggregated days from recent days
  daysToAggregate.forEach(([date]) => {
    delete stats.recentDays[date];
  });

  // Sort weeks by date
  stats.historicalWeeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Trim to retention limit
  if (stats.historicalWeeks.length > RETENTION_POLICY.WEEKLY_AGGREGATES) {
    stats.historicalWeeks = stats.historicalWeeks.slice(
      -RETENTION_POLICY.WEEKLY_AGGREGATES
    );
  }

  console.log(
    `Aggregated ${daysToAggregate.length} old days into weekly summaries`
  );
}

/**
 * Aggregate old weeks (1+ year) into monthly summaries
 */
export function aggregateOldWeeks(stats: StatsData): void {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const cutoffISO = cutoffDate.toISOString().split('T')[0];

  const weeksToAggregate = stats.historicalWeeks.filter(
    (week) => week.weekStart < cutoffISO
  );

  if (weeksToAggregate.length === 0) return;

  // Group by month
  const monthGroups = new Map<string, WeeklyAggregate[]>();

  weeksToAggregate.forEach((week) => {
    const monthStart = week.weekStart.substring(0, 7) + '-01'; // YYYY-MM-01
    if (!monthGroups.has(monthStart)) {
      monthGroups.set(monthStart, []);
    }
    monthGroups.get(monthStart)!.push(week);
  });

  // Create monthly aggregates
  monthGroups.forEach((weeks, monthStart) => {
    const totalDeskTime = weeks.reduce(
      (sum, week) => sum + week.totalDeskTime,
      0
    );
    const totalBreakTime = weeks.reduce(
      (sum, week) => sum + week.totalBreakTime,
      0
    );
    const daysActive = weeks.reduce((sum, week) => sum + week.daysActive, 0);
    const avgDailyHours =
      daysActive > 0 ? totalDeskTime / 3600 / daysActive : 0;

    const monthlyAggregate: MonthlyAggregate = {
      monthStart,
      totalDeskTime,
      totalBreakTime,
      avgDailyHours,
      daysActive,
    };

    // Check if month already exists
    const existingIndex = stats.historicalMonths.findIndex(
      (m) => m.monthStart === monthStart
    );

    if (existingIndex >= 0) {
      stats.historicalMonths[existingIndex] = monthlyAggregate;
    } else {
      stats.historicalMonths.push(monthlyAggregate);
    }
  });

  // Remove aggregated weeks
  stats.historicalWeeks = stats.historicalWeeks.filter(
    (week) => week.weekStart >= cutoffISO
  );

  // Sort months by date
  stats.historicalMonths.sort((a, b) =>
    a.monthStart.localeCompare(b.monthStart)
  );

  // Trim to retention limit
  if (stats.historicalMonths.length > RETENTION_POLICY.MONTHLY_AGGREGATES) {
    stats.historicalMonths = stats.historicalMonths.slice(
      -RETENTION_POLICY.MONTHLY_AGGREGATES
    );
  }

  console.log(
    `Aggregated ${weeksToAggregate.length} old weeks into monthly summaries`
  );
}

/**
 * Cleanup old data when storage quota is exceeded
 */
function cleanupOldData(stats: StatsData): void {
  // First try aggregating old sessions
  aggregateOldSessions(stats);

  // Then try aggregating old weeks
  aggregateOldWeeks(stats);

  // If still need space, drop oldest monthly data
  if (stats.historicalMonths.length > 12) {
    stats.historicalMonths = stats.historicalMonths.slice(-12);
    console.log('Dropped oldest monthly data to free space');
  }
}

/**
 * Export data to CSV format
 */
export function exportToCSV(stats: StatsData): string {
  return generateCSV(stats);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(stats: StatsData): string {
  return generateJSON(stats);
}

/**
 * Clear all statistics data
 */
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.STATS);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  console.log('All statistics data cleared');
}

/**
 * Download data as file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
