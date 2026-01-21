import { useState, useEffect, useCallback } from 'react';
import type { UserSettings } from '../types/stats';
import { DEFAULT_SETTINGS } from '../types/stats';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  notificationPermission?: NotificationPermission;
  onRequestNotifications?: () => void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSave,
  notificationPermission,
  onRequestNotifications,
}: SettingsModalProps) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
  }, [settings, isOpen]);

  // Close handler
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setTimeout(() => setShowUnsavedWarning(false), 5000);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, hasUnsavedChanges, handleClose]);

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
      handleClose();
    }
  };

  const handleSettingChange = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    onSave(localSettings);
    setHasUnsavedChanges(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleResetToDefaults = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    setHasUnsavedChanges(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] m-4 bg-gray-50/90 dark:bg-gray-900 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure goals and notifications
            </p>
          </div>
          <button
            onClick={handleClose}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Goals Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Goals
            </h3>

            <div className="space-y-4">
              {/* Daily Goal */}
              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Daily Goal
                  </span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {localSettings.dailyGoalHours} hours
                  </span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={localSettings.dailyGoalHours}
                  onChange={(e) =>
                    handleSettingChange(
                      'dailyGoalHours',
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0.5h</span>
                  <span>24h</span>
                </div>
              </div>

              {/* Weekly Goal */}
              <div>
                <label className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Weekly Goal
                  </span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {localSettings.weeklyGoalHours} hours
                  </span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="168"
                  step="1"
                  value={localSettings.weeklyGoalHours}
                  onChange={(e) =>
                    handleSettingChange(
                      'weeklyGoalHours',
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1h</span>
                  <span>168h (24×7)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              Notifications
            </h3>

            <div className="space-y-4">
              {/* Permission Status */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Browser Permissions
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {notificationPermission === 'granted'
                        ? 'Notifications are enabled'
                        : notificationPermission === 'denied'
                        ? 'Notifications are blocked'
                        : 'Notifications not enabled'}
                    </div>
                  </div>
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={onRequestNotifications}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Enable
                    </button>
                  )}
                  {notificationPermission === 'granted' && (
                    <span className="text-green-600 dark:text-green-400">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </div>

              {/* Break Reminders Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Break Reminders
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Remind me to take breaks
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.breakReminderEnabled}
                    onChange={(e) =>
                      handleSettingChange(
                        'breakReminderEnabled',
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Break Reminder Interval */}
              {localSettings.breakReminderEnabled && (
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reminder Interval
                    </span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {localSettings.breakReminderInterval} minutes
                    </span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="240"
                    step="15"
                    value={localSettings.breakReminderInterval}
                    onChange={(e) =>
                      handleSettingChange(
                        'breakReminderInterval',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>30 min</span>
                    <span>4 hours</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Recommended: 120 minutes (2 hours) for healthy work habits
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Data Management Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
              Data Management
            </h3>

            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Privacy First:</strong> All your data is stored
                  locally in your browser. Nothing is sent to any server. You
                  have full control.
                </p>
              </div>

              <button
                onClick={handleResetToDefaults}
                className="w-full px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Reset to Default Settings
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Unsaved Changes Warning */}
        {showUnsavedWarning && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900/80 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm font-medium">You have unsaved changes</p>
            <p className="text-xs mt-1">
              Save your changes or click Cancel to discard them
            </p>
          </div>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-green-100 dark:bg-green-900/80 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium">Settings saved successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
};
