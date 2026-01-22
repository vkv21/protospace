import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3-selection';
import { scaleTime } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { zoom as d3Zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { PresenceInterval } from '../types/stats';
import { formatDuration } from '../utils/presenceAnalyzer';

interface UseD3TimelineOptions {
  width: number;
  height: number;
  intervals: PresenceInterval[];
  margins?: { top: number; right: number; bottom: number; left: number };
  onZoomChange?: (scale: number) => void;
}

interface UseD3TimelineReturn {
  svgRef: React.RefObject<SVGSVGElement | null>;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const DEFAULT_MARGINS = { top: 20, right: 20, bottom: 40, left: 50 };
const ZOOM_STORAGE_KEY = 'commitspace_timeline_zoom';

export const useD3Timeline = ({
  width,
  height,
  intervals,
  margins = DEFAULT_MARGINS,
  onZoomChange,
}: UseD3TimelineOptions): UseD3TimelineReturn => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  // Load saved zoom state
  const loadZoomState = useCallback(() => {
    try {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      return saved ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  }, []);

  // Save zoom state
  const saveZoomState = useCallback((scale: number) => {
    try {
      localStorage.setItem(ZOOM_STORAGE_KEY, scale.toString());
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Initialize D3 timeline
  useEffect(() => {
    if (!svgRef.current || width <= 0 || height <= 0) return;

    const svg = d3.select(svgRef.current);
    const innerWidth = width - margins.left - margins.right;
    const innerHeight = height - margins.top - margins.bottom;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margins.left},${margins.top})`);

    gRef.current = g;

    // Create time scale (24 hours)
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    const xScale = scaleTime()
      .domain([startOfDay, endOfDay])
      .range([0, innerWidth]);

    // Create axes
    const xAxis = axisBottom(xScale).ticks(12);

    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6b7280');

    xAxisGroup.selectAll('line').style('stroke', '#d1d5db');

    xAxisGroup.select('.domain').style('stroke', '#d1d5db');

    // Create clipping path
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'timeline-clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    // Create intervals group with clipping
    const intervalsGroup = g
      .append('g')
      .attr('class', 'intervals')
      .attr('clip-path', 'url(#timeline-clip)');

    // Draw intervals
    intervalsGroup
      .selectAll('rect')
      .data(intervals)
      .join('rect')
      .attr('x', (d) => xScale(new Date(d.start)))
      .attr('y', innerHeight * 0.3)
      .attr('width', (d) => {
        const end = d.end ?? Date.now();
        return Math.max(1, xScale(new Date(end)) - xScale(new Date(d.start)));
      })
      .attr('height', innerHeight * 0.4)
      .attr('fill', (d) => (d.type === 'present' ? '#22c55e' : '#ef4444'))
      .attr('opacity', 0.7)
      .attr('rx', 2)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1);
        showTooltip(event, d);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.7);
        hideTooltip();
      });

    // Draw current time indicator
    const now = new Date();
    if (now >= startOfDay && now <= endOfDay) {
      g.append('line')
        .attr('class', 'current-time')
        .attr('x1', xScale(now))
        .attr('x2', xScale(now))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.8);
    }

    // Setup zoom behavior
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 24])
      .translateExtent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on('zoom', (event) => {
        const newXScale = event.transform.rescaleX(xScale);

        xAxisGroup.call(axisBottom(newXScale).ticks(12));

        intervalsGroup
          .selectAll<SVGRectElement, PresenceInterval>('rect')
          .attr('x', (d) => newXScale(new Date(d.start)))
          .attr('width', (d) => {
            const end = d.end ?? Date.now();
            return Math.max(
              1,
              newXScale(new Date(end)) - newXScale(new Date(d.start))
            );
          });

        // Update current time indicator
        g.select('.current-time')
          .attr('x1', newXScale(now))
          .attr('x2', newXScale(now));

        saveZoomState(event.transform.k);
        onZoomChange?.(event.transform.k);
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    // Apply saved zoom state
    const savedZoom = loadZoomState();
    if (savedZoom !== 1) {
      svg.call(zoomBehavior.scaleTo, savedZoom);
    }

    // Tooltip functions
    let tooltip: d3.Selection<
      HTMLDivElement,
      unknown,
      HTMLElement,
      unknown
    > | null = null;

    function showTooltip(event: MouseEvent, d: PresenceInterval) {
      if (!tooltip) {
        tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'timeline-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px 12px')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('opacity', '0');
      }

      const startTime = new Date(d.start).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const endTime = d.end
        ? new Date(d.end).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : 'Ongoing';
      const duration = d.end
        ? Math.floor((d.end - d.start) / 1000)
        : Math.floor((Date.now() - d.start) / 1000);
      const durationStr = formatDuration(duration);

      tooltip
        .html(
          `
          <strong>${d.type === 'present' ? '✓ Present' : '✗ Away'}</strong><br/>
          ${startTime} - ${endTime}<br/>
          Duration: ${durationStr}
        `
        )
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
        .style('opacity', '1');
    }

    function hideTooltip() {
      if (tooltip) {
        tooltip.style('opacity', '0');
      }
    }

    // Cleanup
    return () => {
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [
    width,
    height,
    intervals,
    margins,
    loadZoomState,
    saveZoomState,
    onZoomChange,
  ]);

  // Control functions
  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.call(zoomBehaviorRef.current.transform, zoomIdentity);
    saveZoomState(1);
    onZoomChange?.(1);
  }, [saveZoomState, onZoomChange]);

  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.call(zoomBehaviorRef.current.scaleBy, 2);
  }, []);

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.call(zoomBehaviorRef.current.scaleBy, 0.5);
  }, []);

  return {
    svgRef,
    resetZoom,
    zoomIn,
    zoomOut,
  };
};
