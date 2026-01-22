import { useRef, useState, useEffect } from 'react';
// import custom hooks
import { useWebcam } from '../hooks/useWebcam';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { usePresenceTracking } from '../hooks/usePresenceTracking';
import { useCanvasOverlay } from '../hooks/useCanvasOverlay';
import { useStatsTracking } from '../hooks/useStatsTracking';
import { useNotifications } from '../hooks/useNotifications';
import { useSessionTimer } from '../hooks/useSessionTimer';

import { formatDeskTime } from '../utils/presenceAnalyzer';
import { DailyStats } from './DailyStats';
import { StatsModal } from './StatsModal';
import { SettingsModal } from './SettingsModal';
import { SessionTimer } from './SessionTimer';
import { ConfirmDialog } from './ConfirmDialog';

export const VideoCapture = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dev mode state with localStorage persistence
  const [devMode, setDevMode] = useState(() => {
    const stored = localStorage.getItem('commitspace_dev_mode');
    return stored === 'true';
  });

  // Self view state with localStorage persistence
  const [selfViewEnabled, setSelfViewEnabled] = useState(() => {
    const stored = localStorage.getItem('commitspace_self_view');
    return stored !== 'false'; // Default to true
  });

  // Modal state
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Persist dev mode to localStorage
  useEffect(() => {
    localStorage.setItem('commitspace_dev_mode', devMode.toString());
  }, [devMode]);

  // Persist self view preference to localStorage
  useEffect(() => {
    localStorage.setItem('commitspace_self_view', selfViewEnabled.toString());
  }, [selfViewEnabled]);

  const { videoRef, isCapturing, error, startCapture, stopCapture } =
    useWebcam();

  // Pose detection (runs every 500ms when camera is active)
  const {
    landmarks,
    isLoading: isPoseLoading,
    error: poseError,
  } = usePoseDetection(videoRef, {
    enabled: isCapturing,
    intervalMs: 500,
  });

  // Presence tracking based on pose landmarks
  const { isPresent, confidence, lastSeen, deskTime, currentActivity, activityConfidence } =
    usePresenceTracking(landmarks);

  // Stats tracking with sessions
  const {
    todayStats,
    currentSession,
    isTracking,
    continuousDeskTime,
    recentDays,
    goalHours,
    fullStats,
    updateSettings,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
  } = useStatsTracking({
    isPresent,
    lastSeen,
    currentActivity,
    activityConfidence,
  });

  // Debug logging for activity
  useEffect(() => {
    console.log('📊 VideoCapture - Activity State:', {
      isTracking,
      currentActivity,
      activityConfidence,
      isPresent,
    });
  }, [isTracking, currentActivity, activityConfidence, isPresent]);

  // Notification system for break reminders
  const { notificationPermission, requestPermission } = useNotifications({
    continuousDeskTime,
    enabled: isCapturing && isPresent,
  });

  // Calculate elapsed session time for active session
  const elapsedSeconds = useSessionTimer(currentSession);

  // Canvas overlay for landmark visualization in dev mode
  useCanvasOverlay({
    canvasRef,
    videoRef,
    landmarks,
    enabled: devMode && isCapturing,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 border-2 border-green-200 gap-6">
      {/* Left Column - Video & Controls */}
      <div className="border-2 border-green-400 lg:col-span-2 space-y-6">
        {/* Video Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Video Capture
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    AI-powered presence detection
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Settings */}
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all hover:scale-105 active:scale-95"
                  title="Settings"
                >
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
                {/* Self View */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium hidden sm:inline">
                    Self View
                  </span>
                  <span className="relative inline-block w-11 h-6">
                    <input
                      type="checkbox"
                      checked={selfViewEnabled}
                      onChange={(e) => setSelfViewEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </span>
                </label>
                {/* Dev Mode */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium hidden sm:inline">
                    Dev Mode
                  </span>
                  <span className="relative inline-block w-11 h-6">
                    <input
                      type="checkbox"
                      checked={devMode}
                      onChange={(e) => setDevMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </span>
                </label>
              </div>
            </div>

            {/* Video Container */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  !selfViewEnabled && isCapturing ? 'invisible' : ''
                }`}
                style={{ maxHeight: '480px' }}
              />
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${
                  !selfViewEnabled && isCapturing ? 'invisible' : ''
                }`}
                style={{ zIndex: 10 }}
              />
              {!isCapturing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <p className="text-white text-lg">Camera Off</p>
                </div>
              )}
              {isCapturing && !selfViewEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 gap-3">
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                    <line
                      x1="4"
                      y1="4"
                      x2="20"
                      y2="20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  <p className="text-white text-lg">Self View Hidden</p>
                  <p className="text-gray-400 text-sm">
                    Tracking is still active
                  </p>
                </div>
              )}
              {isCapturing && selfViewEnabled && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="text-white text-xs font-semibold">REC</span>
                </div>
              )}
            </div>

            {/* Session Timer - shows when session active, independent of camera */}
            {isTracking && currentSession && (
              <div className="mt-4">
                <SessionTimer 
                  elapsedSeconds={elapsedSeconds}
                  isVisible={isTracking}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded-r mb-4 flex items-start gap-3 shadow-md">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex justify-center my-4">
              {!isCapturing ? (
                <button
                  onClick={startCapture}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                  aria-label="Start Capture"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle cx="12" cy="12" r="6" fill="currentColor" />
                  </svg>
                  Start
                </button>
              ) : (
                <button
                  onClick={stopCapture}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label="Stop Capture"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      rx="3"
                      fill="currentColor"
                    />
                  </svg>
                  Stop
                </button>
              )}
            </div>

            {/* Session Control Buttons */}
            {isCapturing && (
              <div className="flex justify-center gap-3 mb-4">
                {!isTracking ? (
                  <button
                    onClick={startSession}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Start Session
                  </button>
                ) : (
                  <>
                    {currentSession?.isPaused ? (
                      <button
                        onClick={resumeSession}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Resume Session
                      </button>
                    ) : (
                      <button
                        onClick={pauseSession}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Pause Session
                      </button>
                    )}
                    <button
                      onClick={() => setShowStopConfirm(true)}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <rect
                          x="9"
                          y="9"
                          width="6"
                          height="6"
                          rx="1"
                          fill="currentColor"
                        />
                      </svg>
                      Stop Session
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md relative ${
                    isTracking ? 'bg-green-600' : 'bg-gray-500'
                  }`}
                >
                  {isTracking && (
                    <div className="absolute inset-0 rounded-xl bg-green-400 animate-ping opacity-20"></div>
                  )}
                  <svg
                    className="w-5 h-5 text-white relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Status
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isTracking
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {isTracking ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isTracking
                      ? 'Real-time monitoring active'
                      : 'Monitoring paused'}
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {isPoseLoading && isCapturing && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-r mb-3 flex items-start gap-3">
                  <svg
                    className="animate-spin h-5 w-5 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-sm font-medium">
                    Initializing pose detection model...
                  </p>
                </div>
              )}

              {/* Pose Detection Error */}
              {poseError && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 text-orange-700 dark:text-orange-400 px-4 py-3 rounded-r mb-3 flex items-start gap-3">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm">{poseError}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                {/* Activity Display (always show in dev mode) */}
                {devMode && (
                  <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
                    <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                      🎯 ACTIVITY DEBUG
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">isTracking:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {isTracking ? '✅ true' : '❌ false'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">currentActivity:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {currentActivity || 'null'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">activityConfidence:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {Math.round((activityConfidence || 0) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">isPresent:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {isPresent ? '✅ true' : '❌ false'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status with indicator */}
                {!isCapturing && (
                  <div className="flex items-center justify-between mb-4 p-4 rounded-lg shadow-sm border transition-all bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                      Status:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 dark:text-gray-400 italic text-lg">
                        Camera Off
                      </span>
                    </div>
                  </div>
                )}
                {isCapturing && isPoseLoading && (
                  <div className="flex items-center justify-between mb-4 p-4 rounded-lg shadow-sm border transition-all bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
                    <span className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                      Status:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-blue-600 dark:text-blue-400 italic text-lg">
                        Loading...
                      </span>
                    </div>
                  </div>
                )}
                {isCapturing && !isPoseLoading && isPresent && (
                  <div className="flex items-center justify-between mb-4 p-4 rounded-lg shadow-sm border-2 transition-all bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600">
                    <span className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                      Status:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-green-600 dark:bg-green-500 rounded-full animate-pulse shadow-lg"></span>
                      <span className="text-green-700 dark:text-green-400 font-bold text-xl">
                        Present
                      </span>
                    </div>
                  </div>
                )}
                {isCapturing && !isPoseLoading && !isPresent && (
                  <div className="flex items-center justify-between mb-4 p-4 rounded-lg shadow-sm border-2 transition-all bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-700">
                    <span className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                      Status:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-red-500 rounded-full shadow-lg"></span>
                      <span className="text-red-600 dark:text-red-400 font-bold text-xl">
                        Away
                      </span>
                    </div>
                  </div>
                )}

                {/* Confidence Score */}
                {isCapturing && !isPoseLoading && (
                  <div className="flex items-center justify-between mb-3 py-2">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Confidence:
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            confidence > 0.7
                              ? 'bg-green-500'
                              : confidence > 0.4
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Desk Time */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    Desk Time Today:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-mono font-bold text-lg">
                    {formatDeskTime(deskTime)}
                  </span>
                </div>

                {/* Current Activity (when tracking) */}
                {isTracking && currentActivity && currentActivity !== 'away' && (
                  <div className="flex items-center justify-between py-2 mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Current Activity:
                    </span>
                    <div className="text-right">
                      <div className="text-gray-900 dark:text-gray-100 font-bold text-base flex items-center gap-2 justify-end">
                        <span>{currentActivity}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round((activityConfidence || 0) * 100)}% confident
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Stats (full width on mobile, 1 column on lg+) */}
      <div className="lg:col-span-1">
        <DailyStats
          stats={todayStats}
          currentSession={currentSession}
          continuousDeskTime={continuousDeskTime}
          isTracking={isTracking}
          recentDays={recentDays}
          goalHours={goalHours}
          notificationPermission={notificationPermission}
          onRequestNotifications={requestPermission}
          onOpenStatsModal={() => setIsStatsModalOpen(true)}
          currentActivity={currentActivity}
          activityConfidence={activityConfidence}
        />
      </div>

      {/* Modals */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        stats={fullStats}
        recentDays={recentDays}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={fullStats.settings}
        onSave={updateSettings}
        notificationPermission={notificationPermission}
        onRequestNotifications={requestPermission}
      />

      <ConfirmDialog
        isOpen={showStopConfirm}
        onConfirm={() => {
          stopSession();
          setShowStopConfirm(false);
        }}
        onCancel={() => setShowStopConfirm(false)}
        title="Stop Session?"
        message="Are you sure you want to stop this session? This action cannot be undone."
        confirmText="Stop Session"
        cancelText="Keep Going"
        variant="danger"
      />
    </div>
  );
};
