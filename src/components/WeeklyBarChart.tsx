import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import type { DailyStats } from '../types/stats';

interface WeeklyBarChartProps {
  recentDays: Record<string, DailyStats>;
  goalHours: number;
  className?: string;
}

export const WeeklyBarChart = ({
  recentDays,
  goalHours,
  className = '',
}: WeeklyBarChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 200 });

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

  // Prepare data for last 7 days
  useEffect(() => {
    if (!svgRef.current || dimensions.width <= 0) return;

    const margins = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = dimensions.width - margins.left - margins.right;
    const height = dimensions.height - margins.top - margins.bottom;

    // Generate last 7 days
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    // Prepare data with goal achievement
    const data = last7Days.map((date) => {
      const dayStats = recentDays[date];
      const hours = dayStats ? dayStats.totalDeskTime / 3600 : 0;
      const metGoal = hours >= goalHours;

      // Format date for display (e.g., "Mon 1/6")
      const dateObj = new Date(date + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = dateObj.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
      });

      return {
        date,
        displayDate: `${dayName} ${monthDay}`,
        hours,
        metGoal,
      };
    });

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margins.left},${margins.top})`);

    // Create scales
    const xScale = scaleBand()
      .domain(data.map((d) => d.displayDate))
      .range([0, width])
      .padding(0.3);

    const yScale = scaleLinear()
      .domain([0, Math.max(12, goalHours * 1.2)])
      .range([height, 0]);

    // Create axes
    const xAxis = axisBottom(xScale);
    const yAxis = axisLeft(yScale)
      .ticks(6)
      .tickFormat((d) => `${d}h`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6b7280')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    const yAxisGroup = g.append('g').attr('class', 'y-axis').call(yAxis);

    yAxisGroup
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#6b7280');

    yAxisGroup.selectAll('line').style('stroke', '#d1d5db');

    yAxisGroup.select('.domain').style('stroke', '#d1d5db');

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        axisLeft(yScale)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .style('stroke', '#e5e7eb')
      .style('stroke-opacity', 0.5)
      .select('.domain')
      .remove();

    // Add goal line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(goalHours))
      .attr('y2', yScale(goalHours))
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.7);

    // Add goal label
    g.append('text')
      .attr('x', width - 5)
      .attr('y', yScale(goalHours) - 5)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', '#f59e0b')
      .style('font-weight', 'bold')
      .text(`Goal: ${goalHours}h`);

    // Create tooltip
    let tooltip: d3.Selection<
      HTMLDivElement,
      unknown,
      HTMLElement,
      unknown
    > | null = null;

    function showTooltip(event: MouseEvent, d: (typeof data)[0]) {
      if (!tooltip) {
        tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'weekly-chart-tooltip')
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

      const hoursFormatted = d.hours.toFixed(2);
      const percentage = ((d.hours / goalHours) * 100).toFixed(0);
      const status = d.metGoal ? '✓ Goal Met' : '✗ Below Goal';

      tooltip
        .html(
          `
          <strong>${d.displayDate}</strong><br/>
          ${hoursFormatted} hours (${percentage}%)<br/>
          <span style="color: ${
            d.metGoal ? '#22c55e' : '#ef4444'
          }">${status}</span>
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

    // Draw bars
    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.displayDate)!)
      .attr('y', (d) => yScale(d.hours))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => height - yScale(d.hours))
      .attr('fill', (d) => (d.metGoal ? '#22c55e' : '#9ca3af'))
      .attr('opacity', 0.8)
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1);
        showTooltip(event, d);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.8);
        hideTooltip();
      });

    // Cleanup
    return () => {
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [dimensions.width, dimensions.height, recentDays, goalHours]);

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Last 7 Days</h3>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500 rounded opacity-80"></div>
            <span className="text-gray-600">Goal Met</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-400 rounded opacity-80"></div>
            <span className="text-gray-600">Below Goal</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        />
      </div>

      {/* Footer hint */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hover over bars for details
      </div>
    </div>
  );
};
