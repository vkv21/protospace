import { useState, useEffect } from 'react';
import { formatDeskTime, formatGoalProgress } from '../utils/presenceAnalyzer';
import { getActivityLabel, getActivityIcon } from '../utils/activityAnalyzer';
import { TimelineChart } from './TimelineChart';
import { WeeklyBarChart } from './WeeklyBarChart';
import { StatBox } from './StatBox';
import { GoalProgressBox } from './GoalProgressBox';
import type {
  DailyStats as DailyStatsType,
  PresenceSession,
  ActivityType,
} from '../types/stats';

interface DailyStatsProps {
  stats: DailyStatsType | null;
  currentSession: PresenceSession | null;
  continuousDeskTime: number;
  isTracking: boolean;
  recentDays: Record<string, DailyStatsType>;
  goalHours: number;
  notificationPermission?: NotificationPermission;
  onRequestNotifications?: () => void;
  onOpenStatsModal?: () => void;
  currentActivity?: ActivityType | null;
  activityConfidence?: number;
}

export const DailyStats = ({
  stats,
  currentSession,
  continuousDeskTime,
  isTracking,
  recentDays,
  goalHours,
  notificationPermission,
  onRequestNotifications,
  onOpenStatsModal,
  currentActivity,
  activityConfidence,
}: DailyStatsProps) => {
  // Persistent expand/collapse state for advanced panels
  const [showTimeline, setShowTimeline] = useState(() => {
    return localStorage.getItem('commitspace_showTimeline') !== 'false';
  });
  const [showWeekly, setShowWeekly] = useState(() => {
    return localStorage.getItem('commitspace_showWeekly') !== 'false';
  });
  const [showDebug, setShowDebug] = useState(() => {
    return localStorage.getItem('commitspace_showDebug') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('commitspace_showTimeline', showTimeline.toString());
  }, [showTimeline]);
  useEffect(() => {
    localStorage.setItem('commitspace_showWeekly', showWeekly.toString());
  }, [showWeekly]);
  useEffect(() => {
    localStorage.setItem('commitspace_showDebug', showDebug.toString());
  }, [showDebug]);
  // All hooks MUST be called before any conditional returns
  const [isSessionExpanded, setIsSessionExpanded] = useState(false);
  const [sessionDeskTime, setSessionDeskTime] = useState(0);
  const [sessionBreakTime, setSessionBreakTime] = useState(0);

  // Calculate current session stats (updates every second for live tracking)
  useEffect(() => {
    if (!currentSession || !isTracking) {
      setSessionDeskTime(0);
      setSessionBreakTime(0);
      return;
    }

    const calculateSessionStats = () => {
      let deskTime = 0;
      let breakTime = 0;

      currentSession.presence.forEach((interval) => {
        const endTime = interval.end ?? Date.now();
        const duration = (endTime - interval.start) / 1000; // seconds
        if (interval.type === 'present') {
          deskTime += duration;
        } else {
          breakTime += duration;
        }
      });

      setSessionDeskTime(deskTime);
      setSessionBreakTime(breakTime);
    };

    // Calculate immediately
    calculateSessionStats();

    // Update every second for live tracking
    const interval = setInterval(calculateSessionStats, 1000);

    return () => clearInterval(interval);
  }, [currentSession, isTracking]);

  // Early return AFTER all hooks
  if (!stats) {
    return (
      <div className="bg-gray-100 rounded-lg p-4">
        <p className="text-gray-500 text-sm">Loading statistics...</p>
      </div>
    );
  }

  // Convert seconds to hours for goal progress calculation
  const currentHours = stats.totalDeskTime / 3600;
  const goalProgress = formatGoalProgress(currentHours, stats.goalHours);

  // Get color based on goal progress
  const getProgressColor = () => {
    if (goalProgress >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (goalProgress >= 80) return 'text-green-600 dark:text-green-400';
    if (goalProgress >= 50) return 'text-yellow-600 dark:text-yellow-400';
    if (goalProgress >= 25) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressBg = () => {
    if (goalProgress >= 100)
      return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    if (goalProgress >= 80)
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (goalProgress >= 50)
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    if (goalProgress >= 25)
      return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 border border-gray-200 dark:border-gray-700">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* At Desk */}
        <StatBox
          title="At Desk"
          value={formatDeskTime(Math.floor(stats.totalDeskTime))}
        />

        {/* Break Time */}
        <StatBox
          title="Break Time"
          value={formatDeskTime(Math.floor(stats.totalBreakTime))}
        />

        {/* Sessions */}
        <StatBox title="Sessions" value={stats.sessions.length} />

        {/* Goal Progress */}
        <GoalProgressBox
          goalProgress={goalProgress}
          goalHours={stats.goalHours}
          getProgressColor={getProgressColor}
          getProgressBg={getProgressBg}
        />
      </div>

      {/* Current Activity (when tracking) - Full width below stats */}
      {isTracking && currentActivity && currentActivity !== 'away' && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 sm:p-5 rounded-xl border border-purple-200/50 dark:border-purple-700/50 shadow-sm">
          <div className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 tracking-wide uppercase flex items-center gap-2">
            <span className="text-lg">{getActivityIcon(currentActivity)}</span>
            <span>Current Activity</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">
              {getActivityLabel(currentActivity)}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              Confidence: {Math.round((activityConfidence || 0) * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* View Details Button */}
      {onOpenStatsModal && (
        <div className="flex justify-center">
          <button
            onClick={onOpenStatsModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            View Details
          </button>
        </div>
      )}

      {/* Notification Permission Banner */}
      {notificationPermission === 'default' && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 dark:border-amber-600 rounded-r-lg p-3 sm:p-3.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
              <span className="text-amber-600 dark:text-amber-400 text-lg">
                🔔
              </span>
            </div>
            <span className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex-1 font-medium">
              Enable break reminders for healthy work habits
            </span>
            <button
              onClick={onRequestNotifications}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all whitespace-nowrap shadow-sm hover:shadow-md font-semibold"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Notification Status */}
      {notificationPermission === 'granted' && (
        <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-600 rounded-r-lg p-2.5 sm:p-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20"></span>
              <span className="relative flex items-center justify-center rounded-full h-6 w-6 bg-green-100 dark:bg-green-800/50">
                <span className="text-green-600 dark:text-green-400 text-base">
                  ✓
                </span>
              </span>
            </div>
            <span className="text-xs sm:text-sm text-green-800 dark:text-green-200 font-medium">
              Break reminders enabled
            </span>
          </div>
        </div>
      )}

      {/* Timeline Chart (collapsible) */}
      <div>
        <button
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none mb-2 sm:mb-3 tracking-wide transition-colors w-full"
          onClick={() => setShowTimeline((v) => !v)}
          aria-expanded={showTimeline}
        >
          <span
            className={`transition-transform text-[10px] ${
              showTimeline ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
          Timeline
        </button>
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showTimeline ? 'max-h-250 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {showTimeline && <TimelineChart sessions={stats.sessions} />}
        </div>
      </div>

      {/* Weekly Bar Chart (collapsible) */}
      <div>
        <button
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none mb-2 sm:mb-3 tracking-wide transition-colors w-full"
          onClick={() => setShowWeekly((v) => !v)}
          aria-expanded={showWeekly}
        >
          <span
            className={`transition-transform text-[10px] ${
              showWeekly ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
          Weekly Chart
        </button>
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showWeekly ? 'max-h-250 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {showWeekly && (
            <WeeklyBarChart
              recentDays={recentDays}
              goalHours={goalHours}
              className="mt-2"
            />
          )}
        </div>
      </div>

      {/* Debug Info (collapsible) */}
      <div>
        <button
          className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none mb-1 tracking-wide"
          onClick={() => setShowDebug((v) => !v)}
          aria-expanded={showDebug}
        >
          <span
            className={`transition-transform ${showDebug ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          Debug Info
        </button>
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showDebug ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {showDebug && (
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 space-y-1 bg-gray-100 dark:bg-gray-900 rounded p-2">
              <div>Date: {stats.date}</div>
              <div>Total Desk Time: {stats.totalDeskTime.toFixed(0)}s</div>
              <div>Total Break Time: {stats.totalBreakTime.toFixed(0)}s</div>
              <div>Sessions: {stats.sessions.length}</div>
              <div>
                Last Updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tracking Status */}
      {isTracking && currentSession && (
        <div
          className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          onClick={() => setIsSessionExpanded(!isSessionExpanded)}
        >
          <div className="space-y-3">
            {/* Header with progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Active Session
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 dark:text-blue-300">
                    {formatDeskTime(Math.floor(sessionDeskTime))} / 1h
                  </span>
                  <svg
                    className={`w-4 h-4 text-blue-600 dark:text-blue-300 transition-transform ${
                      isSessionExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-blue-200 dark:bg-blue-800/30 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min((sessionDeskTime / 3600) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Expanded details */}
            {isSessionExpanded && (
              <div className="grid grid-cols-3 gap-3 text-sm pt-2 border-t border-blue-200 dark:border-blue-800">
                <div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Desk Time
                  </div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    {formatDeskTime(Math.floor(sessionDeskTime))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Break Time
                  </div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    {formatDeskTime(Math.floor(sessionBreakTime))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Continuous
                  </div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    {formatDeskTime(Math.floor(continuousDeskTime))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
