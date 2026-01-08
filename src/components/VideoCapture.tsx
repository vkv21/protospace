import { useRef, useState, useEffect } from 'react';
import { useWebcam } from '../hooks/useWebcam';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { usePresenceTracking } from '../hooks/usePresenceTracking';
import { useCanvasOverlay } from '../hooks/useCanvasOverlay';
import { useStatsTracking } from '../hooks/useStatsTracking';
import { useNotifications } from '../hooks/useNotifications';
import { formatDeskTime } from '../utils/presenceAnalyzer';
import { DailyStats } from './DailyStats';
import { StatsModal } from './StatsModal';
import { SettingsModal } from './SettingsModal';

export const VideoCapture = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dev mode state with localStorage persistence
  const [devMode, setDevMode] = useState(() => {
    const stored = localStorage.getItem('aideskwatch_dev_mode');
    return stored === 'true';
  });

  // Self view state with localStorage persistence
  const [selfViewEnabled, setSelfViewEnabled] = useState(() => {
    const stored = localStorage.getItem('aideskwatch_self_view');
    return stored !== 'false'; // Default to true
  });

  // Modal state
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Persist dev mode to localStorage
  useEffect(() => {
    localStorage.setItem('aideskwatch_dev_mode', devMode.toString());
  }, [devMode]);

  // Persist self view preference to localStorage
  useEffect(() => {
    localStorage.setItem('aideskwatch_self_view', selfViewEnabled.toString());
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
  const { isPresent, confidence, lastSeen, deskTime } =
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
  } = useStatsTracking({
    isPresent,
    lastSeen,
  });

  // Notification system for break reminders
  const { notificationPermission, requestPermission } = useNotifications({
    continuousDeskTime,
    enabled: isCapturing && isPresent,
  });

  // Canvas overlay for landmark visualization in dev mode
  useCanvasOverlay({
    canvasRef,
    videoRef,
    landmarks,
    enabled: devMode && isCapturing,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Video & Controls */}
      <div className="lg:col-span-2 space-y-6">
        {/* Video Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
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
                <div className="absolute top-3 right-3">
                  <span
                    className="w-2 h-2 bg-red-500 rounded-full block"
                    style={{
                      boxShadow: '0 0 3px rgba(239, 68, 68, 0.4)',
                    }}
                  ></span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex justify-center my-4">
              {!isCapturing ? (
                <button
                  onClick={startCapture}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
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

            {/* Status */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Status
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Real-time monitoring
                  </p>
                </div>
              </div>

              {/* Loading State */}
              {isPoseLoading && isCapturing && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-3">
                  <p className="text-sm">
                    Initializing pose detection model...
                  </p>
                </div>
              )}

              {/* Pose Detection Error */}
              {poseError && (
                <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded mb-3">
                  <p className="text-sm">{poseError}</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                {/* Status with indicator */}
                <div className={`flex items-center justify-between mb-4 p-4 rounded-lg shadow-sm border transition-all ${
                  !isCapturing
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    : isPoseLoading
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : isPresent
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                }`}>
                  <span className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                    Status:
                  </span>
                  <div className="flex items-center gap-3">
                    {!isCapturing ? (
                      <span className="text-gray-500 dark:text-gray-400 italic text-lg">
                        Camera Off
                      </span>
                    ) : isPoseLoading ? (
                      <span className="text-blue-600 dark:text-blue-400 italic text-lg">
                        Loading...
                      </span>
                    ) : isPresent ? (
                      <>
                        <span className="w-5 h-5 bg-green-500 rounded-full animate-pulse shadow-lg ring-2 ring-green-300"></span>
                        <span className="text-green-700 dark:text-green-300 font-bold text-xl">
                          Present
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-5 h-5 bg-red-500 rounded-full shadow-lg"></span>
                        <span className="text-red-600 dark:text-red-400 font-bold text-xl">
                          Away
                        </span>
                      </>
                    )}
                  </div>
                </div>

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
    </div>
  );
};
