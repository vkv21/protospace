import { formatDuration } from '../utils/presenceAnalyzer';

interface SessionTimerProps {
  elapsedSeconds: number | null;
  isVisible: boolean;
}

/**
 * SessionTimer Component
 * 
 * Displays the elapsed time for the current active session in a subtle,
 * professional card format. Only renders when a session is active.
 * 
 * Design Philosophy: Prominent but subtle - clean, professional, not tacky
 * 
 * @param elapsedSeconds - Number of seconds elapsed since session start (null if no session)
 * @param isVisible - Whether the timer should be visible
 */
export const SessionTimer = ({ elapsedSeconds, isVisible }: SessionTimerProps) => {
  // Don't render if no elapsed time or not visible
  if (elapsedSeconds === null || !isVisible) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left: Icon + Label */}
        <div className="flex items-center gap-3">
          {/* Clock icon container - subtle gray background */}
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            {/* Simple outlined clock icon */}
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {/* Clock circle */}
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              {/* Clock hands */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6l4 2"
              />
            </svg>
          </div>
          
          {/* Label - secondary text color */}
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Session Duration
          </span>
        </div>

        {/* Right: Timer Display - bold, monospace, primary color */}
        <div className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100">
          {formatDuration(elapsedSeconds)}
        </div>
      </div>
    </div>
  );
};
