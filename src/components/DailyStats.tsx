import { useState, useEffect } from 'react';
import { formatDeskTime, formatGoalProgress } from '../utils/presenceAnalyzer';
import { TimelineChart } from './TimelineChart';
import { WeeklyBarChart } from './WeeklyBarChart';
import type {
  DailyStats as DailyStatsType,
  PresenceSession,
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
}: DailyStatsProps) => {
  // Persistent expand/collapse state for advanced panels
  const [showTimeline, setShowTimeline] = useState(() => {
    return localStorage.getItem('aideskwatch_showTimeline') !== 'false';
  });
  const [showWeekly, setShowWeekly] = useState(() => {
    return localStorage.getItem('aideskwatch_showWeekly') !== 'false';
  });
  const [showDebug, setShowDebug] = useState(() => {
    return localStorage.getItem('aideskwatch_showDebug') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('aideskwatch_showTimeline', showTimeline.toString());
  }, [showTimeline]);
  useEffect(() => {
    localStorage.setItem('aideskwatch_showWeekly', showWeekly.toString());
  }, [showWeekly]);
  useEffect(() => {
    localStorage.setItem('aideskwatch_showDebug', showDebug.toString());
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
  const breakTimeFormatted = formatDeskTime(Math.floor(stats.totalBreakTime));

  // Get color based on goal progress
  const getProgressColor = () => {
    if (goalProgress >= 80) return 'text-green-600';
    if (goalProgress >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 border border-gray-200 dark:border-gray-700">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* At Desk */}
        <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-start min-w-[100px] min-h-[60px] sm:min-h-[70px]">
          <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5 tracking-wide uppercase">
            At Desk
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden">
            {formatDeskTime(Math.floor(stats.totalDeskTime))}
          </div>
        </div>

        {/* Break Time */}
        <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-start min-w-[100px] min-h-[60px] sm:min-h-[70px]">
          <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5 tracking-wide uppercase">
            Break Time
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden">
            {breakTimeFormatted}
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-start min-w-[100px] min-h-[60px] sm:min-h-[70px]">
          <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5 tracking-wide uppercase">
            Sessions
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden">
            {stats.sessions.length}
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-start min-w-[100px] min-h-[60px] sm:min-h-[70px]">
          <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5 tracking-wide uppercase">
            Goal Progress
          </div>
          <div
            className={`text-lg sm:text-xl font-bold whitespace-nowrap overflow-hidden ${getProgressColor()}`}
          >
            {goalProgress}%
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {stats.goalHours}h goal
          </div>
        </div>
      </div>

      {/* View Details Button */}
      {onOpenStatsModal && (
        <div className="flex justify-center">
          <button
            onClick={onOpenStatsModal}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            View Details
          </button>
        </div>
      )}

      {/* Notification Permission Banner */}
      {notificationPermission === 'default' && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 sm:p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="text-amber-600 dark:text-amber-400 text-base sm:text-lg">
              🔔
            </div>
            <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 flex-1">
              Enable break reminders for healthy work habits
            </span>
            <button
              onClick={onRequestNotifications}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Notification Status */}
      {notificationPermission === 'granted' && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-2.5 sm:p-3">
          <div className="flex items-center gap-2.5">
            <div className="text-green-600 dark:text-green-400 text-base sm:text-lg">
              ✓
            </div>
            <span className="text-xs sm:text-sm text-green-700 dark:text-green-300">
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
          className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setIsSessionExpanded(!isSessionExpanded)}
        >
          <div className="space-y-3">
            {/* Header with progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-900">
                    Active Session
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600">
                    {formatDeskTime(Math.floor(sessionDeskTime))} / 1h
                  </span>
                  <svg
                    className={`w-4 h-4 text-blue-600 transition-transform ${
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
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min((sessionDeskTime / 3600) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Expanded details */}
            {isSessionExpanded && (
              <div className="grid grid-cols-3 gap-3 text-sm pt-2 border-t border-blue-200">
                <div>
                  <div className="text-xs text-blue-600">Desk Time</div>
                  <div className="font-semibold text-blue-900">
                    {formatDeskTime(Math.floor(sessionDeskTime))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600">Break Time</div>
                  <div className="font-semibold text-blue-900">
                    {formatDeskTime(Math.floor(sessionBreakTime))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600">Continuous</div>
                  <div className="font-semibold text-blue-900">
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
