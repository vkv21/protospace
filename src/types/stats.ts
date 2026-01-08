/**
 * Types for session-based statistics tracking and historical data management
 */

export interface PresenceInterval {
  type: 'present' | 'away';
  start: number; // Unix timestamp (ms)
  end: number; // Unix timestamp (ms)
  confidence?: number; // Average confidence during interval (0-1)
}

export interface PresenceSession {
  id: string; // Unique session identifier
  start: number; // Unix timestamp (ms)
  end: number | null; // null if ongoing
  presence: PresenceInterval[];
}

export interface DailyStats {
  date: string; // ISO date: "2026-01-08"
  sessions: PresenceSession[];
  totalDeskTime: number; // Cached total in seconds
  totalBreakTime: number; // Cached total in seconds
  goalHours: number; // Daily goal for this day
  lastUpdated: number; // Unix timestamp (ms)
}

export interface WeeklyAggregate {
  weekStart: string; // ISO date of Monday
  totalDeskTime: number; // Seconds
  totalBreakTime: number; // Seconds
  avgDailyHours: number; // Average hours per day
  daysActive: number; // Number of days with activity
}

export interface MonthlyAggregate {
  monthStart: string; // ISO date: "2026-01-01"
  totalDeskTime: number; // Seconds
  totalBreakTime: number; // Seconds
  avgDailyHours: number; // Average hours per day
  daysActive: number; // Number of days with activity
}

export interface AllTimeStats {
  totalDeskTime: number; // Seconds
  startDate: string; // ISO date of first tracking
  daysTracked: number; // Total days with any activity
  avgDailyHours: number; // Average hours across all tracked days
}

export interface UserSettings {
  dailyGoalHours: number; // Default: 4
  weeklyGoalHours: number; // Default: 20
  breakReminderEnabled: boolean; // Default: true
  breakReminderInterval: number; // Minutes, default: 120
}

export interface NotificationPreferences {
  enabled: boolean;
  breakReminders: boolean;
  goalAchieved: boolean; // Future use
  weeklyReport: boolean; // Future use
}

export interface StatsData {
  version: number; // Schema version for migrations
  recentDays: {
    [date: string]: DailyStats; // Last 7 days with detailed sessions
  };
  historicalWeeks: WeeklyAggregate[]; // 52 weeks (1 year)
  historicalMonths: MonthlyAggregate[]; // 24 months (2 years)
  allTime: AllTimeStats;
  settings: UserSettings;
  notifications: NotificationPreferences;
}

// Initial default values
export const DEFAULT_SETTINGS: UserSettings = {
  dailyGoalHours: 4,
  weeklyGoalHours: 20,
  breakReminderEnabled: true,
  breakReminderInterval: 120,
};

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  enabled: false, // Requires explicit permission
  breakReminders: true,
  goalAchieved: true,
  weeklyReport: false,
};

// Storage keys
export const STORAGE_KEYS = {
  STATS_V2: 'aideskwatch_stats_v2',
  CONFIG: 'aideskwatch_config',
  // Legacy keys for migration
  LEGACY_PRESENCE: 'aideskwatch_presence',
  LEGACY_DATE: 'aideskwatch_last_date',
} as const;

// Retention policy
export const RETENTION_POLICY = {
  DETAILED_SESSIONS_DAYS: 7,
  WEEKLY_AGGREGATES: 52, // weeks
  MONTHLY_AGGREGATES: 24, // months
} as const;
