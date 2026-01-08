import { useState, useEffect, useRef } from 'react';
import { useD3Timeline } from '../hooks/useD3Timeline';
import type { PresenceSession } from '../types/stats';

interface TimelineChartProps {
  sessions: PresenceSession[];
  className?: string;
}

export const TimelineChart = ({
  sessions,
  className = '',
}: TimelineChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 300 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // Flatten all intervals from all sessions
  const allIntervals = sessions.flatMap((session) => session.presence);

  const { svgRef, resetZoom, zoomIn, zoomOut } = useD3Timeline({
    width: dimensions.width,
    height: dimensions.height,
    intervals: allIntervals,
    onZoomChange: setZoomLevel,
  });

  // Handle responsive resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions((prev) => ({ ...prev, width }));
      }
    });

    resizeObserver.observe(containerRef.current);

    // Initial size
    const { width } = containerRef.current.getBoundingClientRect();
    setDimensions((prev) => ({ ...prev, width }));

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Today's Timeline
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Zoom: {zoomLevel.toFixed(1)}x
          </span>
          <div className="flex gap-1">
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out"
              disabled={zoomLevel <= 1}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In"
              disabled={zoomLevel >= 24}
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Reset Zoom"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded opacity-70"></div>
          <span className="text-gray-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded opacity-70"></div>
          <span className="text-gray-600">Away</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-0.5 bg-blue-500"
            style={{ borderTop: '2px dashed' }}
          ></div>
          <span className="text-gray-600">Current Time</span>
        </div>
      </div>

      {/* Timeline SVG */}
      <div ref={containerRef} className="w-full overflow-hidden">
        {allIntervals.length > 0 ? (
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="cursor-move"
            style={{ userSelect: 'none' }}
          />
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-gray-500">No activity recorded yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Start tracking to see your timeline
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {allIntervals.length > 0 && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          <span>Drag to pan • Scroll to zoom • Hover for details</span>
        </div>
      )}
    </div>
  );
};
