import React from 'react';

interface GoalProgressBoxProps {
  goalProgress: number;
  goalHours: number;
  getProgressColor: () => string;
  getProgressBg: () => string;
}

/**
 * A specialized component for displaying goal progress.
 */
export const GoalProgressBox: React.FC<GoalProgressBoxProps> = ({
  goalProgress,
  goalHours,
  getProgressColor,
  getProgressBg,
}) => {
  return (
    <div
      className={`rounded-xl p-3 sm:p-4 shadow-sm border flex flex-col items-start min-h-[80px] w-full ${getProgressBg()}`}
    >
      <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5 tracking-wide uppercase flex items-center gap-1">
        Goal Progress
        {goalProgress >= 100 && <span className="text-base">🎯</span>}
      </div>
      <div
        className={`text-lg sm:text-xl font-bold whitespace-nowrap overflow-hidden ${getProgressColor()}`}
      >
        {goalProgress}%
      </div>
      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate w-full">
        {goalHours}h goal
      </div>
    </div>
  );
};
