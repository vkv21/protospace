import { useEffect, useRef, useState } from 'react';
import type {
  StatsData,
  DailyStats,
  PresenceSession,
  PresenceInterval,
} from '../types/stats';
import {
  loadOrInitializeStats,
  saveStats,
  aggregateOldSessions,
} from '../utils/statsStorage';

interface UseStatsTrackingOptions {
  isPresent: boolean;
  lastSeen: Date | null;
}

interface UseStatsTrackingReturn {
  todayStats: DailyStats | null;
  currentSession: PresenceSession | null;
  isTracking: boolean;
  continuousDeskTime: number; // Seconds of continuous presence
  recentDays: Record<string, DailyStats>;
  goalHours: number;
  fullStats: StatsData;
  updateSettings: (newSettings: Partial<StatsData['settings']>) => void;
}

export const useStatsTracking = (
  options: UseStatsTrackingOptions
): UseStatsTrackingReturn => {
  const { isPresent } = options;

  const [stats, setStats] = useState<StatsData>(() => loadOrInitializeStats());
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [currentSession, setCurrentSession] = useState<PresenceSession | null>(
    null
  );
  const [continuousDeskTime, setContinuousDeskTime] = useState(0);
  const [isLeader, setIsLeader] = useState(true);

  const lastPresenceRef = useRef<boolean>(false);
  const currentIntervalRef = useRef<PresenceInterval | null>(null);
  const intervalStartRef = useRef<number>(0);
  const isLeaderRef = useRef<boolean>(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Get today's date string
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Initialize today's stats if needed
  useEffect(() => {
    const today = getTodayDate();

    if (!stats.recentDays[today]) {
      // Create new day
      const newDayStats: DailyStats = {
        date: today,
        sessions: [],
        totalDeskTime: 0,
        totalBreakTime: 0,
        goalHours: stats.settings.dailyGoalHours,
        lastUpdated: Date.now(),
      };

      setStats((prev) => ({
        ...prev,
        recentDays: {
          ...prev.recentDays,
          [today]: newDayStats,
        },
      }));
      setTodayStats(newDayStats);
    } else {
      setTodayStats(stats.recentDays[today]);
    }
  }, [stats]);

  // Multi-tab coordination with BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('aideskwatch_tracking');
      channelRef.current = channel;

      // Announce we're here
      channel.postMessage({ type: 'HELLO', tabId: Date.now() });

      channel.onmessage = (event) => {
        if (event.data.type === 'HELLO') {
          // Another tab is active, we become follower
          isLeaderRef.current = false;
          setIsLeader(false);
          console.log('Another tab is tracking, becoming follower');
        } else if (event.data.type === 'LEADER_ACTIVE') {
          isLeaderRef.current = false;
          setIsLeader(false);
        }
      };

      // Announce we're leader every 5 seconds
      const leaderInterval = setInterval(() => {
        if (isLeaderRef.current) {
          channel.postMessage({ type: 'LEADER_ACTIVE' });
        }
      }, 5000);

      return () => {
        clearInterval(leaderInterval);
        channel.close();
      };
    } catch {
      // BroadcastChannel not supported
      console.warn(
        'BroadcastChannel not supported, multi-tab coordination disabled'
      );
      isLeaderRef.current = true;
      setIsLeader(true);
    }
  }, []);

  // Handle presence state changes
  useEffect(() => {
    if (!isLeaderRef.current || !todayStats) return;

    const now = Date.now();
    const wasPresent = lastPresenceRef.current;

    // State change: not present -> present
    if (isPresent && !wasPresent) {
      console.log('Presence detected, starting interval');

      // Start new presence interval
      const newInterval: PresenceInterval = {
        type: 'present',
        start: now,
        end: now, // Will be updated continuously
      };
      currentIntervalRef.current = newInterval;
      intervalStartRef.current = now;

      // If no current session or last session ended, start new session
      if (!currentSession || currentSession.end !== null) {
        const newSession: PresenceSession = {
          id: `session_${now}`,
          start: now,
          end: null,
          presence: [newInterval],
        };
        setCurrentSession(newSession);
      } else {
        // Add interval to existing session
        setCurrentSession((prev) =>
          prev
            ? {
                ...prev,
                presence: [...prev.presence, newInterval],
              }
            : null
        );
      }
    }
    // State change: present -> not present
    else if (!isPresent && wasPresent) {
      console.log('Presence lost, ending interval');

      // End current interval
      if (currentIntervalRef.current) {
        currentIntervalRef.current.end = now;
        currentIntervalRef.current = null;
      }

      // Start away interval
      const awayInterval: PresenceInterval = {
        type: 'away',
        start: now,
        end: now,
      };
      currentIntervalRef.current = awayInterval;

      if (currentSession) {
        setCurrentSession((prev) =>
          prev
            ? {
                ...prev,
                presence: [...prev.presence, awayInterval],
              }
            : null
        );
      }

      // Reset continuous desk time
      setContinuousDeskTime(0);
    }

    lastPresenceRef.current = isPresent;
  }, [isPresent, todayStats, currentSession]);

  // Update current interval continuously while active
  useEffect(() => {
    if (!isLeaderRef.current) return;

    const interval = setInterval(() => {
      const now = Date.now();

      if (currentIntervalRef.current) {
        currentIntervalRef.current.end = now;

        // Update continuous desk time if present
        if (currentIntervalRef.current.type === 'present') {
          const elapsed = Math.floor((now - intervalStartRef.current) / 1000);
          setContinuousDeskTime(elapsed);
        }

        // Update current session
        setCurrentSession((prev) => {
          if (!prev) return null;

          // Update the last interval
          const updatedPresence = [...prev.presence];
          if (updatedPresence.length > 0) {
            updatedPresence[updatedPresence.length - 1] = {
              ...currentIntervalRef.current!,
            };
          }

          return {
            ...prev,
            presence: updatedPresence,
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLeaderRef.current, isPresent]);

  // Save session to stats periodically
  useEffect(() => {
    if (!currentSession || !todayStats || !isLeaderRef.current) return;

    const saveInterval = setInterval(() => {
      const today = getTodayDate();

      // Update or add session to today's stats
      setStats((prev) => {
        const existingDayStats = prev.recentDays[today] || todayStats;
        const existingSessionIndex = existingDayStats.sessions.findIndex(
          (s) => s.id === currentSession.id
        );

        let updatedSessions;
        if (existingSessionIndex >= 0) {
          // Update existing session
          updatedSessions = [...existingDayStats.sessions];
          updatedSessions[existingSessionIndex] = currentSession;
        } else {
          // Add new session
          updatedSessions = [...existingDayStats.sessions, currentSession];
        }

        // Recalculate totals from all sessions
        const totalDeskTime = updatedSessions.reduce((sum, session) => {
          return (
            sum +
            session.presence
              .filter((i) => i.type === 'present')
              .reduce((s, i) => s + (i.end - i.start) / 1000, 0)
          );
        }, 0);

        const totalBreakTime = updatedSessions.reduce((sum, session) => {
          return (
            sum +
            session.presence
              .filter((i) => i.type === 'away')
              .reduce((s, i) => s + (i.end - i.start) / 1000, 0)
          );
        }, 0);

        const updatedDayStats: DailyStats = {
          ...existingDayStats,
          sessions: updatedSessions,
          totalDeskTime,
          totalBreakTime,
          lastUpdated: Date.now(),
        };

        const newStats = {
          ...prev,
          recentDays: {
            ...prev.recentDays,
            [today]: updatedDayStats,
          },
        };

        // Save to localStorage
        saveStats(newStats);
        setTodayStats(updatedDayStats);

        return newStats;
      });
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [currentSession, todayStats]);

  // Handle midnight rollover
  useEffect(() => {
    const checkMidnight = () => {
      const today = getTodayDate();

      if (todayStats && todayStats.date !== today) {
        console.log(
          'Midnight rollover detected, archiving day and starting new'
        );

        // End current session at midnight
        if (currentSession && currentSession.end === null) {
          const midnight = new Date();
          midnight.setHours(0, 0, 0, 0);

          const endedSession: PresenceSession = {
            ...currentSession,
            end: midnight.getTime(),
          };

          // Save ended session
          setStats((prev) => {
            const updatedDayStats: DailyStats = {
              ...todayStats,
              sessions: [...todayStats.sessions, endedSession],
              lastUpdated: Date.now(),
            };

            const newStats = {
              ...prev,
              recentDays: {
                ...prev.recentDays,
                [todayStats.date]: updatedDayStats,
              },
            };

            // Aggregate old sessions
            aggregateOldSessions(newStats);
            saveStats(newStats);

            return newStats;
          });

          setCurrentSession(null);
          currentIntervalRef.current = null;
        }

        // Initialize new day
        const newDayStats: DailyStats = {
          date: today,
          sessions: [],
          totalDeskTime: 0,
          totalBreakTime: 0,
          goalHours: stats.settings.dailyGoalHours,
          lastUpdated: Date.now(),
        };

        setStats((prev) => ({
          ...prev,
          recentDays: {
            ...prev.recentDays,
            [today]: newDayStats,
          },
        }));
        setTodayStats(newDayStats);
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkMidnight, 10000);

    return () => clearInterval(interval);
  }, [todayStats, currentSession, stats.settings.dailyGoalHours]);

  // Function to update settings
  const updateSettings = (newSettings: Partial<StatsData['settings']>) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        settings: {
          ...prev.settings,
          ...newSettings,
        },
      };
      saveStats(updated);
      return updated;
    });
  };

  return {
    todayStats,
    currentSession,
    isTracking: isLeader && currentSession !== null,
    continuousDeskTime,
    recentDays: stats.recentDays,
    goalHours: stats.settings.dailyGoalHours,
    fullStats: stats,
    updateSettings,
  };
};
