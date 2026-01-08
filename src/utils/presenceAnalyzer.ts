import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

// MediaPipe Pose Landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export interface PresenceResult {
  isPresent: boolean;
  confidence: number;
  details?: {
    leftShoulderVisible: boolean;
    rightShoulderVisible: boolean;
    noseVisible: boolean;
    centered: boolean;
  };
}

// Configuration thresholds
const VISIBILITY_THRESHOLD = 0.6; // Minimum visibility score for landmarks
const NOSE_VISIBILITY_THRESHOLD = 0.5; // Lower threshold for nose
const CENTER_MIN_X = 0.25; // Left boundary for centered detection
const CENTER_MAX_X = 0.75; // Right boundary for centered detection
const UPPER_FRAME_MAX_Y = 0.7; // Upper body should be in upper portion of frame

/**
 * Analyzes pose landmarks to determine if a person is present at their desk.
 *
 * Criteria for "at desk":
 * 1. Both shoulders are visible (primary indicator)
 * 2. Upper body is centered in frame
 * 3. Person is in upper portion of frame (seated position)
 *
 * @param landmarks Array of pose landmarks from MediaPipe
 * @returns PresenceResult with isPresent flag and confidence score
 */
export function analyzePoseLandmarks(
  landmarks: NormalizedLandmark[]
): PresenceResult {
  if (!landmarks || landmarks.length === 0) {
    return {
      isPresent: false,
      confidence: 0,
    };
  }

  const nose = landmarks[POSE_LANDMARKS.NOSE];
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  // Check visibility of key landmarks
  const leftShoulderVisible =
    (leftShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const rightShoulderVisible =
    (rightShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const noseVisible = (nose?.visibility ?? 0) >= NOSE_VISIBILITY_THRESHOLD;

  // At least one shoulder must be visible (user might be turned slightly)
  const hasVisibleShoulder = leftShoulderVisible || rightShoulderVisible;

  // Both shoulders visible is stronger indicator
  const bothShouldersVisible = leftShoulderVisible && rightShoulderVisible;

  // Check if upper body is centered in frame
  let centered = false;
  let avgShoulderX = 0;

  if (leftShoulderVisible && rightShoulderVisible) {
    avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    centered = avgShoulderX >= CENTER_MIN_X && avgShoulderX <= CENTER_MAX_X;
  } else if (leftShoulderVisible) {
    centered = leftShoulder.x >= CENTER_MIN_X && leftShoulder.x <= CENTER_MAX_X;
  } else if (rightShoulderVisible) {
    centered =
      rightShoulder.x >= CENTER_MIN_X && rightShoulder.x <= CENTER_MAX_X;
  }

  // Check if person is in upper portion of frame (seated at desk)
  const inUpperFrame = noseVisible && nose.y <= UPPER_FRAME_MAX_Y;

  // Calculate confidence score (0-1)
  let confidenceScore = 0;

  if (bothShouldersVisible) {
    confidenceScore += 0.5; // Strong indicator
  } else if (hasVisibleShoulder) {
    confidenceScore += 0.3; // Moderate indicator
  }

  if (noseVisible) {
    confidenceScore += 0.2;
  }

  if (centered) {
    confidenceScore += 0.15;
  }

  if (inUpperFrame) {
    confidenceScore += 0.15;
  }

  // Determine presence based on minimum criteria
  // At minimum, need at least one shoulder visible
  const isPresent = hasVisibleShoulder && confidenceScore >= 0.4;

  return {
    isPresent,
    confidence: Math.min(confidenceScore, 1.0),
    details: {
      leftShoulderVisible,
      rightShoulderVisible,
      noseVisible,
      centered,
    },
  };
}

/**
 * Format seconds into HH:MM:SS display format
 */
export function formatDeskTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate total break time from a session's away intervals
 */
export function calculateBreakTime(session: {
  presence: Array<{ type: string; start: number; end?: number }>;
}): number {
  return session.presence
    .filter(
      (interval) => interval.type === 'away' && interval.end !== undefined
    )
    .reduce(
      (sum, interval) => sum + (interval.end! - interval.start) / 1000,
      0
    );
}

/**
 * Calculate the longest continuous desk time period from a session
 */
export function calculateContinuousDeskTime(session: {
  presence: Array<{ type: string; start: number; end?: number }>;
}): number {
  let maxDuration = 0;
  const now = Date.now();

  for (const interval of session.presence) {
    if (interval.type === 'present') {
      const endTime = interval.end ?? now;
      const duration = (endTime - interval.start) / 1000;
      if (duration > maxDuration) {
        maxDuration = duration;
      }
    }
  }

  return maxDuration;
}

/**
 * Format goal progress as percentage
 * @param current Current hours worked
 * @param goal Goal hours
 */
export function formatGoalProgress(current: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.round((current / goal) * 100);
}

/**
 * Aggregate weekly statistics from daily stats
 */
export function aggregateWeeklyStats(
  days: Record<string, { deskTimeSeconds: number; breakTimeSeconds: number }>
): {
  totalDeskTimeSeconds: number;
  totalBreakTimeSeconds: number;
  averageDailyHours: number;
  daysActive: number;
} {
  const daysList = Object.values(days);
  const totalDeskTimeSeconds = daysList.reduce(
    (sum, day) => sum + day.deskTimeSeconds,
    0
  );
  const totalBreakTimeSeconds = daysList.reduce(
    (sum, day) => sum + day.breakTimeSeconds,
    0
  );
  const daysActive = daysList.filter((day) => day.deskTimeSeconds > 0).length;
  const averageDailyHours =
    daysActive > 0 ? totalDeskTimeSeconds / 3600 / daysActive : 0;

  return {
    totalDeskTimeSeconds,
    totalBreakTimeSeconds,
    averageDailyHours,
    daysActive,
  };
}

/**
 * Aggregate monthly statistics from weekly stats
 */
export function aggregateMonthlyStats(
  weeks: Array<{
    totalDeskTimeSeconds: number;
    totalBreakTimeSeconds: number;
    daysActive: number;
  }>
): {
  totalDeskTimeSeconds: number;
  totalBreakTimeSeconds: number;
  averageDailyHours: number;
  daysActive: number;
} {
  const totalDeskTimeSeconds = weeks.reduce(
    (sum, week) => sum + week.totalDeskTimeSeconds,
    0
  );
  const totalBreakTimeSeconds = weeks.reduce(
    (sum, week) => sum + week.totalBreakTimeSeconds,
    0
  );
  const daysActive = weeks.reduce((sum, week) => sum + week.daysActive, 0);
  const averageDailyHours =
    daysActive > 0 ? totalDeskTimeSeconds / 3600 / daysActive : 0;

  return {
    totalDeskTimeSeconds,
    totalBreakTimeSeconds,
    averageDailyHours,
    daysActive,
  };
}

/**
 * Generate CSV export of statistics data
 */
export function generateCSV(stats: any): string {
  const headers = [
    'Date',
    'Desk Time (hours)',
    'Break Time (minutes)',
    'Sessions',
    'Goal (hours)',
  ];

  const rows: string[] = [headers.join(',')];

  // Add recent days data
  if (stats.recentDays) {
    Object.entries(stats.recentDays).forEach(([date, day]: [string, any]) => {
      const deskHours = (day.totalDeskTime / 3600).toFixed(2);
      const breakMinutes = Math.round(day.totalBreakTime / 60);
      const sessions = day.sessions?.length || 0;
      const goal = day.goalHours;

      rows.push(`${date},${deskHours},${breakMinutes},${sessions},${goal}`);
    });
  }

  return rows.join('\n');
}

/**
 * Generate JSON export of statistics data with metadata
 */
export function generateJSON(stats: any): string {
  const exportData = {
    metadata: {
      version: 2,
      exportDate: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    data: stats,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Get the start date of the week (Monday) for a given date
 */
export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
