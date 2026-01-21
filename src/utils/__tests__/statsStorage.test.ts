import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadOrInitializeStats,
  saveStats,
  exportToCSV,
  exportToJSON,
} from '../statsStorage';
import type { StatsData } from '../../types/stats';

describe('statsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadOrInitializeStats', () => {
    it('should initialize with default stats when no data exists', () => {
      const stats = loadOrInitializeStats();

      expect(stats.settings.dailyGoalHours).toBe(4);
      expect(stats.settings.weeklyGoalHours).toBe(20);
      expect(stats.settings.breakReminderEnabled).toBe(true);
      expect(stats.settings.breakReminderInterval).toBe(120);
      expect(stats.notifications.breakReminders).toBe(true);
      expect(Object.keys(stats.recentDays)).toHaveLength(0);
    });

    it('should load existing data from localStorage', () => {
      const mockStats: StatsData = {
        recentDays: {
          '2026-01-08': {
            date: '2026-01-08',
            sessions: [],
            totalDeskTime: 7200,
            totalBreakTime: 600,
            goalHours: 4,
            lastUpdated: Date.now(),
          },
        },
        historicalWeeks: [],
        historicalMonths: [],
        allTime: {
          totalDeskTime: 7200,
          startDate: '2026-01-08',
          daysTracked: 1,
          avgDailyHours: 2,
        },
        settings: {
          dailyGoalHours: 4,
          weeklyGoalHours: 20,
          breakReminderEnabled: true,
          breakReminderInterval: 120,
        },
        notifications: {
          enabled: false,
          breakReminders: true,
          goalAchieved: true,
          weeklyReport: false,
        },
      };

      localStorage.setItem('aideskwatch_stats', JSON.stringify(mockStats));

      const stats = loadOrInitializeStats();

      expect(stats.recentDays['2026-01-08'].totalDeskTime).toBe(7200);
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('aideskwatch_stats', 'invalid{json}');

      const stats = loadOrInitializeStats();

      expect(Object.keys(stats.recentDays)).toHaveLength(0);
    });
  });

  describe('saveStats', () => {
    it('should save stats to localStorage', () => {
      const stats = loadOrInitializeStats();
      stats.recentDays['2026-01-08'] = {
        date: '2026-01-08',
        sessions: [],
        totalDeskTime: 3600,
        totalBreakTime: 300,
        goalHours: 4,
        lastUpdated: Date.now(),
      };

      saveStats(stats);

      const saved = localStorage.getItem('aideskwatch_stats');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.recentDays['2026-01-08'].totalDeskTime).toBe(3600);
    });

    it('should handle quota exceeded error gracefully', () => {
      // Mock setItem to throw quota error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

      const stats = loadOrInitializeStats();

      // Should not throw
      expect(() => saveStats(stats)).not.toThrow();

      // Restore original
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('exportToCSV', () => {
    it('should generate CSV with headers and data', () => {
      const stats: StatsData = {
        recentDays: {
          '2026-01-08': {
            date: '2026-01-08',
            sessions: [],
            totalDeskTime: 7200,
            totalBreakTime: 600,
            goalHours: 4,
            lastUpdated: Date.now(),
          },
          '2026-01-07': {
            date: '2026-01-07',
            sessions: [],
            totalDeskTime: 10800,
            totalBreakTime: 900,
            goalHours: 4,
            lastUpdated: Date.now(),
          },
        },
        historicalWeeks: [],
        historicalMonths: [],
        allTime: {
          totalDeskTime: 18000,
          startDate: '2026-01-07',
          daysTracked: 2,
          avgDailyHours: 2.5,
        },
        settings: {
          dailyGoalHours: 4,
          weeklyGoalHours: 20,
          breakReminderEnabled: true,
          breakReminderInterval: 120,
        },
        notifications: {
          enabled: false,
          breakReminders: true,
          goalAchieved: true,
          weeklyReport: false,
        },
      };

      const csv = exportToCSV(stats);

      expect(csv).toContain(
        'Date,Desk Time (hours),Break Time (minutes),Sessions,Goal (hours)'
      );
      expect(csv).toContain('2026-01-07,3.00,15,0,4');
      expect(csv).toContain('2026-01-08,2.00,10,0,4');
    });

    it('should handle empty data', () => {
      const stats = loadOrInitializeStats();
      const csv = exportToCSV(stats);

      expect(csv).toContain(
        'Date,Desk Time (hours),Break Time (minutes),Sessions,Goal (hours)'
      );
      // Should only have header (no trailing newline since no data rows)
      const lines = csv.split('\n').filter((line) => line.length > 0);
      expect(lines).toHaveLength(1); // just header
    });
  });

  describe('exportToJSON', () => {
    it('should generate JSON with metadata', () => {
      const stats = loadOrInitializeStats();
      stats.recentDays['2026-01-08'] = {
        date: '2026-01-08',
        sessions: [],
        totalDeskTime: 3600,
        totalBreakTime: 300,
        goalHours: 4,
        lastUpdated: Date.now(),
      };

      const json = exportToJSON(stats);
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.exportDate).toBeDefined();
      expect(parsed.metadata.timezone).toBeDefined();
      expect(parsed.data).toEqual(stats);
    });

    it('should produce valid JSON', () => {
      const stats = loadOrInitializeStats();
      const json = exportToJSON(stats);

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});
