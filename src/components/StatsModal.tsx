import { useState, useEffect } from 'react';
import { formatDeskTime, formatGoalProgress } from '../utils/presenceAnalyzer';
import { exportToCSV, exportToJSON, clearAllData } from '../utils/statsStorage';
import { WeeklyBarChart } from './WeeklyBarChart';
import type { StatsData, DailyStats } from '../types/stats';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: StatsData;
  recentDays: Record<string, DailyStats>;
}

type TabType = 'today' | 'week' | 'month' | 'all';

export const StatsModal = ({
  isOpen,
  onClose,
  stats,
  recentDays,
}: StatsModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(stats);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commitspace-export-${
      new Date().toISOString().split('T')[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = exportToJSON(stats);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commitspace-export-${
      new Date().toISOString().split('T')[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (showClearConfirm) {
      clearAllData();
      setShowClearConfirm(false);
      onClose();
      window.location.reload(); // Reload to reset state
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 5000); // Reset after 5s
    }
  };

  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayStats = recentDays[today];

  // Calculate weekly totals
  const weeklyTotals = Object.values(recentDays).reduce(
    (acc, day) => ({
      deskTime: acc.deskTime + day.totalDeskTime,
      breakTime: acc.breakTime + day.totalBreakTime,
      sessions: acc.sessions + day.sessions.length,
      daysActive: acc.daysActive + 1,
    }),
    { deskTime: 0, breakTime: 0, sessions: 0, daysActive: 0 }
  );

  // Get last 7 days for week tab
  const last7Days = Object.entries(recentDays)
    .slice(-7)
    .map(([, stats]) => stats);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-400/80 backdrop-blur-lg"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] m-4 bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Detailed Statistics
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 overflow-x-auto">
          {[
            { id: 'today' as TabType, label: 'Today' },
            { id: 'week' as TabType, label: 'Week' },
            { id: 'month' as TabType, label: 'Month' },
            { id: 'all' as TabType, label: 'All-Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Today Tab */}
          {activeTab === 'today' && (
            <div className="space-y-4">
              {todayStats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        At Desk
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatDeskTime(Math.floor(todayStats.totalDeskTime))}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Break Time
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatDeskTime(Math.floor(todayStats.totalBreakTime))}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Sessions
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {todayStats.sessions.length}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Goal
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatGoalProgress(
                          todayStats.totalDeskTime / 3600,
                          todayStats.goalHours
                        )}
                        %
                      </div>
                    </div>
                  </div>

                  {/* Session List */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Sessions ({todayStats.sessions.length})
                    </h3>
                    <div className="space-y-2">
                      {todayStats.sessions.length > 0 ? (
                        todayStats.sessions.map((session) => {
                          const startTime = new Date(
                            session.start
                          ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          const endTime = session.end
                            ? new Date(session.end).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Ongoing';
                          const deskTime = session.presence
                            .filter((p) => p.type === 'present')
                            .reduce((sum, p) => sum + (p.end - p.start), 0);

                          return (
                            <div
                              key={session.id}
                              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex justify-between items-center"
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {startTime} - {endTime}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {session.presence.length} intervals
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {formatDeskTime(Math.floor(deskTime / 1000))}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  desk time
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No sessions recorded today
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No data for today yet. Start tracking to see statistics!
                </div>
              )}
            </div>
          )}

          {/* Week Tab */}
          {activeTab === 'week' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Total Desk Time
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatDeskTime(Math.floor(weeklyTotals.deskTime))}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Total Breaks
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatDeskTime(Math.floor(weeklyTotals.breakTime))}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Total Sessions
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {weeklyTotals.sessions}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Days Active
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {weeklyTotals.daysActive}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <WeeklyBarChart
                  recentDays={recentDays}
                  goalHours={stats.settings.dailyGoalHours}
                />
              </div>

              <div className="space-y-2">
                {last7Days.map((dayStats) => (
                  <div
                    key={dayStats.date}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {new Date(dayStats.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dayStats.sessions.length} sessions
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatDeskTime(Math.floor(dayStats.totalDeskTime))}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        desk time
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Month Tab */}
          {activeTab === 'month' && (
            <div className="space-y-4">
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Monthly View Coming Soon
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Monthly aggregation will show 30-day overview with daily
                  averages and trends.
                </p>
              </div>
            </div>
          )}

          {/* All-Time Tab */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Total Desk Time
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {formatDeskTime(Math.floor(stats.allTime.totalDeskTime))}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {(stats.allTime.totalDeskTime / 3600).toFixed(1)} hours
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4">
                  <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                    Days Tracked
                  </div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.allTime.daysTracked}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Since{' '}
                    {new Date(stats.allTime.startDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4">
                  <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                    Daily Average
                  </div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.allTime.avgDailyHours.toFixed(1)}h
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    per active day
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Insights
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>
                      You've been tracking for {stats.allTime.daysTracked} days
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>
                      Average {stats.allTime.avgDailyHours.toFixed(1)} hours per
                      day at your desk
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>
                      Your goal is {stats.settings.dailyGoalHours} hours per day
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
              <p className="font-medium mb-1">🔒 Your Privacy Matters</p>
              <p>
                All data is stored locally in your browser. No server uploads.
                Export creates a backup you control.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={handleClearData}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  showClearConfirm
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50'
                }`}
              >
                {showClearConfirm ? 'Click Again to Confirm' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
