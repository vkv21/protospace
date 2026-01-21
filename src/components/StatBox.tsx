import React from 'react';

interface StatBoxProps {
  title: string;
  value: string | number;
  className?: string;
}

/**
 * A reusable component for displaying a statistic box.
 */
export const StatBox: React.FC<StatBoxProps> = ({
  title,
  value,
  className = '',
}) => {
  return (
    <div
      className={`bg-gray-50/80 dark:bg-gray-900/80 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-start min-h-[80px] w-full ${className}`}
    >
      <div className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5 tracking-wide uppercase">
        {title}
      </div>
      <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden">
        {value}
      </div>
    </div>
  );
};
