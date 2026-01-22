import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  StatsData,
  DailyStats,
  PresenceSession,
  PresenceInterval,
  ActivityType,
} from '../types/stats';
import {
  loadOrInitializeStats,
  saveStats,
  aggregateOldSessions,
} from '../utils/statsStorage';

interface UseStatsTrackingOptions {
  isPresent: boolean;
  lastSeen: Date | null;
  currentActivity?: ActivityType | null;
  activityConfidence?: number;
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
  startSession: () => void;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
}

export const useStatsTracking = (
  options: UseStatsTrackingOptions
): UseStatsTrackingReturn => {
  const { isPresent, currentActivity, activityConfidence } = options;

  const [stats, setStats] = useState<StatsData>(() => loadOrInitializeStats());
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [currentSession, setCurrentSession] = useState<PresenceSession | null>(
    null
  );
  const [continuousDeskTime, setContinuousDeskTime] = useState(0);
  const [isLeader, setIsLeader] = useState(false); // Start as follower
  const leaderTimeoutRef = useRef<number | null>(null);
  const tabIdRef = useRef(Date.now());
  const lastHeartbeatRef = useRef<number>(Date.now()); // Track last leader heartbeat

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

  // Manual session start function
  const startSession = useCallback(() => {
    if (!isLeaderRef.current || !todayStats) {
      console.warn('Cannot start session: not leader or no today stats');
      return;
    }

    if (currentSession && currentSession.end === null) {
      console.warn('Session already active');
      return;
    }

    const now = Date.now();
    console.log('Starting new session manually');

    // Create new session
    const newSession: PresenceSession = {
      id: `session_${now}`,
      start: now,
      end: null,
      presence: [],
    };

    // If user is present, start with presence interval
    if (isPresent) {
      const presenceInterval: PresenceInterval = {
        type: 'present',
        start: now,
        end: now,
      };
      newSession.presence.push(presenceInterval);
      currentIntervalRef.current = presenceInterval;
      intervalStartRef.current = now;
    } else {
      // Start with away interval
      const awayInterval: PresenceInterval = {
        type: 'away',
        start: now,
        end: now,
      };
      newSession.presence.push(awayInterval);
      currentIntervalRef.current = awayInterval;
    }

    setCurrentSession(newSession);
    lastPresenceRef.current = isPresent;
    setContinuousDeskTime(0);
  }, [todayStats, isPresent, currentSession]);

  // Manual session stop function
  const stopSession = useCallback(() => {
    if (!currentSession || currentSession.end !== null) {
      console.warn('No active session to stop');
      return;
    }

    const now = Date.now();
    console.log('Stopping session manually');

    // If session is paused, resume it first to close the pause interval
    if (currentSession.isPaused) {
      // End the pause interval
      if (currentIntervalRef.current && currentIntervalRef.current.type === 'paused') {
        currentIntervalRef.current.end = now;
      }
    } else {
      // End current interval if not paused
      if (currentIntervalRef.current) {
        currentIntervalRef.current.end = now;
      }
    }

    // End session
    const endedSession: PresenceSession = {
      ...currentSession,
      end: now,
      isPaused: false, // Clear pause state
      presence: currentSession.presence.map((interval, idx) =>
        idx === currentSession.presence.length - 1
          ? { ...interval, end: now }
          : interval
      ),
    };

    // Save to today's stats
    if (todayStats) {
      const today = getTodayDate();

      setStats((prev) => {
        const existingDayStats = prev.recentDays[today] || todayStats;
        const updatedSessions = [...existingDayStats.sessions, endedSession];

        // Recalculate totals
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

        saveStats(newStats);
        setTodayStats(updatedDayStats);

        return newStats;
      });
    }

    // Clear current session
    setCurrentSession(null);
    currentIntervalRef.current = null;
    setContinuousDeskTime(0);
  }, [currentSession, todayStats]);

  // Manual session pause function
  const pauseSession = useCallback(() => {
    if (!currentSession || currentSession.end !== null) {
      console.warn('No active session to pause');
      return;
    }

    if (currentSession.isPaused) {
      console.warn('Session is already paused');
      return;
    }

    const now = Date.now();
    console.log('Pausing session manually');

    // End current interval (present or away)
    if (currentIntervalRef.current) {
      currentIntervalRef.current.end = now;
    }

    // Start a paused interval
    const pauseInterval: PresenceInterval = {
      type: 'paused',
      start: now,
      end: now,
    };
    currentIntervalRef.current = pauseInterval;

    // Update session to paused state
    setCurrentSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isPaused: true,
        pausedAt: now,
        presence: [...prev.presence, pauseInterval],
      };
    });

    // Reset continuous desk time when pausing
    setContinuousDeskTime(0);
  }, [currentSession]);

  // Manual session resume function
  const resumeSession = useCallback(() => {
    if (!currentSession || currentSession.end !== null) {
      console.warn('No session to resume');
      return;
    }

    if (!currentSession.isPaused) {
      console.warn('Session is not paused');
      return;
    }

    const now = Date.now();
    console.log('Resuming session manually');

    // End the pause interval
    if (currentIntervalRef.current && currentIntervalRef.current.type === 'paused') {
      currentIntervalRef.current.end = now;
    }

    // Start new interval based on current presence
    const newInterval: PresenceInterval = {
      type: isPresent ? 'present' : 'away',
      start: now,
      end: now,
    };
    currentIntervalRef.current = newInterval;

    if (isPresent) {
      intervalStartRef.current = now;
    }

    // Update session to resumed state
    setCurrentSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        isPaused: false,
        pausedAt: undefined,
        presence: [...prev.presence, newInterval],
      };
    });

    // Update last presence ref
    lastPresenceRef.current = isPresent;
  }, [currentSession, isPresent]);

  // Multi-tab coordination with BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('commitspace_tracking');
      channelRef.current = channel;

      // Message handler
      channel.onmessage = (event) => {
        if (event.data.type === 'I_AM_LEADER') {
          // Another tab is leader, stay as follower
          lastHeartbeatRef.current = Date.now(); // Track leader heartbeat
          if (leaderTimeoutRef.current) {
            clearTimeout(leaderTimeoutRef.current);
            leaderTimeoutRef.current = null;
          }
          isLeaderRef.current = false;
          setIsLeader(false);
        }

        if (event.data.type === 'HELLO' && isLeaderRef.current) {
          // I'm leader, announce to newcomer
          channel.postMessage({
            type: 'I_AM_LEADER',
            tabId: tabIdRef.current,
          });
        }
      };

      // Announce arrival
      channel.postMessage({ type: 'HELLO', tabId: tabIdRef.current });

      // Wait for leader response (500ms timeout)
      leaderTimeoutRef.current = setTimeout(() => {
        // No leader responded, become leader
        isLeaderRef.current = true;
        setIsLeader(true);
        console.log('Became leader tab');

        // Announce leadership
        channel.postMessage({
          type: 'I_AM_LEADER',
          tabId: tabIdRef.current,
        });
      }, 500);

      // Periodic leader announcements
      const announceInterval = setInterval(() => {
        if (isLeaderRef.current) {
          channel.postMessage({
            type: 'I_AM_LEADER',
            tabId: tabIdRef.current,
          });
        }
      }, 5000);

      return () => {
        clearInterval(announceInterval);
        if (leaderTimeoutRef.current) {
          clearTimeout(leaderTimeoutRef.current);
        }
        channel.close();
      };
    } catch (error) {
      // Fallback: become leader if BroadcastChannel unsupported
      console.warn('BroadcastChannel not supported');
      isLeaderRef.current = true;
      setIsLeader(true);
    }
  }, []);

  // Leader death detection - followers check for leader heartbeat
  useEffect(() => {
    if (isLeaderRef.current) {
      // Leaders don't need to check for themselves
      return;
    }

    const LEADER_TIMEOUT = 10000; // 10 seconds without heartbeat
    const CHECK_INTERVAL = 5000; // Check every 5 seconds

    const checkInterval = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - lastHeartbeatRef.current;

      if (timeSinceHeartbeat > LEADER_TIMEOUT) {
        console.log('Leader appears dead (no heartbeat for 10s), becoming new leader');
        isLeaderRef.current = true;
        setIsLeader(true);

        // Announce new leadership
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: 'I_AM_LEADER',
            tabId: tabIdRef.current,
          });
        }
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(checkInterval);
  }, [isLeader]); // Re-run when leader status changes

  // Handle presence state changes (only when session is active and not paused)
  useEffect(() => {
    if (
      !isLeaderRef.current ||
      !todayStats ||
      !currentSession ||
      currentSession.end !== null ||
      currentSession.isPaused // Don't track presence when paused
    )
      return;

    const now = Date.now();
    const wasPresent = lastPresenceRef.current;

    // State change: not present -> present
    if (isPresent && !wasPresent) {
      console.log('Presence detected, starting interval');

      // End current away interval if exists
      if (
        currentIntervalRef.current &&
        currentIntervalRef.current.type === 'away'
      ) {
        currentIntervalRef.current.end = now;
      }

      // Start new presence interval
      const newInterval: PresenceInterval = {
        type: 'present',
        start: now,
        end: now,
        activity: currentActivity || undefined,
        confidence: activityConfidence,
      };
      currentIntervalRef.current = newInterval;
      intervalStartRef.current = now;

      // Add interval to current session
      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              presence: [...prev.presence, newInterval],
            }
          : null
      );
    }
    // State change: present -> not present
    else if (!isPresent && wasPresent) {
      console.log('Presence lost, ending interval');

      // End current presence interval
      if (
        currentIntervalRef.current &&
        currentIntervalRef.current.type === 'present'
      ) {
        currentIntervalRef.current.end = now;
      }

      // Start away interval
      const awayInterval: PresenceInterval = {
        type: 'away',
        start: now,
        end: now,
      };
      currentIntervalRef.current = awayInterval;

      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              presence: [...prev.presence, awayInterval],
            }
          : null
      );

      // Reset continuous desk time
      setContinuousDeskTime(0);
    }

    lastPresenceRef.current = isPresent;
  }, [isPresent, todayStats, currentSession, currentActivity, activityConfidence]);

  // Update current interval continuously while active (but not when paused)
  useEffect(() => {
    if (
      !isLeaderRef.current ||
      !currentSession ||
      currentSession.end !== null ||
      currentSession.isPaused // Don't update intervals when paused
    )
      return;

    const interval = setInterval(() => {
      const now = Date.now();

      if (currentIntervalRef.current) {
        currentIntervalRef.current.end = now;

        // Update activity for present intervals
        if (currentIntervalRef.current.type === 'present') {
          const elapsed = Math.floor((now - intervalStartRef.current) / 1000);
          setContinuousDeskTime(elapsed);
          
          // Update activity in real-time
          if (currentActivity && currentActivity !== 'away') {
            currentIntervalRef.current.activity = currentActivity;
            currentIntervalRef.current.confidence = activityConfidence;
          }
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
  }, [currentSession, currentActivity, activityConfidence]);
  // Save session to stats periodically
  useEffect(() => {
    if (
      !currentSession ||
      !todayStats ||
      !isLeaderRef.current ||
      currentSession.end !== null
    )
      return;

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
    isTracking:
      isLeader && currentSession !== null && currentSession.end === null,
    continuousDeskTime,
    recentDays: stats.recentDays,
    goalHours: stats.settings.dailyGoalHours,
    fullStats: stats,
    updateSettings,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
  };
};
