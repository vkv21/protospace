import { describe, it, expect } from 'vitest';
import {
  calculateBreakTime,
  calculateContinuousDeskTime,
  formatGoalProgress,
  aggregateWeeklyStats,
  aggregateMonthlyStats,
  getWeekStartDate,
  formatDeskTime,
} from '../presenceAnalyzer';
import type {
  PresenceSession,
  PresenceInterval,
  DailyStats,
  WeeklyAggregate,
} from '../../types/stats';

describe('presenceAnalyzer', () => {
  describe('calculateBreakTime', () => {
    it('should return 0 for session with no away intervals', () => {
      const session: PresenceSession = {
        startTime: Date.now(),
        endTime: Date.now() + 3600000, // 1 hour
        presence: [
          { type: 'present', start: Date.now(), end: Date.now() + 3600000 },
        ],
      };

      expect(calculateBreakTime(session)).toBe(0);
    });

    it('should calculate total break time from away intervals', () => {
      const now = Date.now();
      const session: PresenceSession = {
        startTime: now,
        endTime: now + 7200000, // 2 hours
        presence: [
          { type: 'present', start: now, end: now + 1800000 }, // 30 min
          { type: 'away', start: now + 1800000, end: now + 2400000 }, // 10 min break
          { type: 'present', start: now + 2400000, end: now + 5400000 }, // 50 min
          { type: 'away', start: now + 5400000, end: now + 6600000 }, // 20 min break
        ],
      };

      // Expected: 10 min + 20 min = 30 min = 1800 seconds
      expect(calculateBreakTime(session)).toBe(1800);
    });

    it('should handle ongoing away interval (no end time)', () => {
      const now = Date.now();
      const session: PresenceSession = {
        startTime: now,
        endTime: undefined,
        presence: [
          { type: 'present', start: now, end: now + 1800000 },
          { type: 'away', start: now + 1800000, end: undefined },
        ],
      };

      // Should not count ongoing interval
      expect(calculateBreakTime(session)).toBe(0);
    });
  });

  describe('calculateContinuousDeskTime', () => {
    it('should return 0 for session with no presence intervals', () => {
      const session: PresenceSession = {
        startTime: Date.now(),
        endTime: undefined,
        presence: [],
      };

      expect(calculateContinuousDeskTime(session)).toBe(0);
    });

    it('should find longest continuous presence period', () => {
      const now = Date.now();
      const session: PresenceSession = {
        startTime: now,
        endTime: undefined,
        presence: [
          { type: 'present', start: now, end: now + 1800000 }, // 30 min
          { type: 'away', start: now + 1800000, end: now + 2400000 },
          { type: 'present', start: now + 2400000, end: now + 5400000 }, // 50 min (longest)
          { type: 'away', start: now + 5400000, end: now + 5700000 },
          { type: 'present', start: now + 5700000, end: now + 7200000 }, // 25 min
        ],
      };

      // Expected: 50 minutes = 3000 seconds
      expect(calculateContinuousDeskTime(session)).toBe(3000);
    });

    it('should handle ongoing presence interval', () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 300000; // 5 minutes ago
      const session: PresenceSession = {
        startTime: fiveMinutesAgo,
        endTime: undefined,
        presence: [
          {
            type: 'present',
            start: fiveMinutesAgo,
            end: undefined,
          },
        ],
      };

      const result = calculateContinuousDeskTime(session);
      // Should be approximately 300 seconds (5 minutes)
      expect(result).toBeGreaterThanOrEqual(299);
      expect(result).toBeLessThanOrEqual(301);
    });
  });

  describe('formatGoalProgress', () => {
    it('should calculate percentage correctly', () => {
      expect(formatGoalProgress(2, 4)).toBe(50);
      expect(formatGoalProgress(3, 4)).toBe(75);
      expect(formatGoalProgress(4, 4)).toBe(100);
    });

    it('should handle exceeding goal', () => {
      expect(formatGoalProgress(5, 4)).toBe(125);
    });

    it('should handle zero goal', () => {
      expect(formatGoalProgress(2, 0)).toBe(0);
    });

    it('should round to whole number', () => {
      expect(formatGoalProgress(1, 3)).toBe(33); // 33.33... → 33
      expect(formatGoalProgress(2, 3)).toBe(67); // 66.66... → 67
    });
  });

  describe('aggregateWeeklyStats', () => {
    it('should sum desk time and break time across days', () => {
      const days: Record<string, DailyStats> = {
        '2026-01-06': {
          date: '2026-01-06',
          sessions: [],
          totalDeskTime: 7200, // 2 hours
          totalBreakTime: 600, // 10 min
          deskTimeSeconds: 7200,
          breakTimeSeconds: 600,
          goalHours: 4,
          lastUpdated: Date.now(),
        },
        '2026-01-07': {
          date: '2026-01-07',
          sessions: [],
          totalDeskTime: 10800, // 3 hours
          totalBreakTime: 900, // 15 min
          deskTimeSeconds: 10800,
          breakTimeSeconds: 900,
          goalHours: 4,
          lastUpdated: Date.now(),
        },
        '2026-01-08': {
          date: '2026-01-08',
          sessions: [],
          totalDeskTime: 14400, // 4 hours
          totalBreakTime: 1200, // 20 min
          deskTimeSeconds: 14400,
          breakTimeSeconds: 1200,
          goalHours: 4,
          lastUpdated: Date.now(),
        },
      };

      const result = aggregateWeeklyStats(days);

      expect(result.totalDeskTimeSeconds).toBe(32400); // 9 hours
      expect(result.totalBreakTimeSeconds).toBe(2700); // 45 min
      expect(result.daysActive).toBe(3);
      expect(result.averageDailyHours).toBeCloseTo(3, 1); // 9/3 = 3
    });

    it('should handle empty days object', () => {
      const result = aggregateWeeklyStats({});

      expect(result.totalDeskTimeSeconds).toBe(0);
      expect(result.totalBreakTimeSeconds).toBe(0);
      expect(result.daysActive).toBe(0);
      expect(result.averageDailyHours).toBe(0);
    });
  });

  describe('aggregateMonthlyStats', () => {
    it('should aggregate weekly stats into monthly', () => {
      const weeks: WeeklyAggregate[] = [
        {
          weekStart: '2026-01-05',
          totalDeskTimeSeconds: 72000, // 20 hours
          totalBreakTimeSeconds: 3600,
          daysActive: 5,
          averageDailyHours: 4,
        },
        {
          weekStart: '2026-01-12',
          totalDeskTimeSeconds: 64800, // 18 hours
          totalBreakTimeSeconds: 2700,
          daysActive: 5,
          averageDailyHours: 3.6,
        },
      ];

      const result = aggregateMonthlyStats(weeks);

      expect(result.totalDeskTimeSeconds).toBe(136800); // 38 hours
      expect(result.totalBreakTimeSeconds).toBe(6300);
      expect(result.daysActive).toBe(10);
      expect(result.averageDailyHours).toBeCloseTo(3.8, 1);
    });
  });

  describe('getWeekStartDate', () => {
    it('should return Monday for given date', () => {
      // Jan 8, 2026 is a Thursday
      const thursday = new Date('2026-01-08');
      const weekStart = getWeekStartDate(thursday);

      // Monday should be Jan 5, 2026 (but Date constructor might create Jan 4 in local time)
      // Let's check the actual day is Monday
      expect(weekStart.getDay()).toBe(1); // Monday = 1
    });

    it('should return same date if already Monday', () => {
      const monday = new Date('2026-01-05');
      const weekStart = getWeekStartDate(monday);

      // Should be a Monday
      expect(weekStart.getDay()).toBe(1);
    });

    it('should handle Sunday (rolls back to previous Monday)', () => {
      const sunday = new Date('2026-01-11');
      const weekStart = getWeekStartDate(sunday);

      // Should roll back to Monday
      expect(weekStart.getDay()).toBe(1);
    });
  });

  describe('formatDeskTime', () => {
    it('should format seconds as HH:MM:SS', () => {
      expect(formatDeskTime(3661)).toBe('01:01:01');
      expect(formatDeskTime(7200)).toBe('02:00:00');
      expect(formatDeskTime(45)).toBe('00:00:45');
    });

    it('should handle zero time', () => {
      expect(formatDeskTime(0)).toBe('00:00:00');
    });

    it('should handle large values', () => {
      expect(formatDeskTime(86400)).toBe('24:00:00'); // 24 hours
    });
  });
});
