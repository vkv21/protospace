# useD3Timeline Hook

> **File:** `/src/hooks/useD3Timeline.ts`
> **Tags:** `#hooks` `#d3` `#visualization` `#timeline` `#zoom`
> **Complexity:** High
> **Lines:** 329

---

## 1. File/Module Name

`useD3Timeline.ts` - D3.js-powered interactive timeline visualization with zoom/pan

## 2. Purpose & Role

Creates an interactive SVG timeline chart showing presence/away intervals across a 24-hour day. Supports zoom (1x-24x), pan, hover tooltips, and persists zoom state to localStorage. Used in DailyStats and TimelineChart components.

## 3. Inputs

```typescript
{
  width: number,              // Chart width
  height: number,             // Chart height
  intervals: PresenceInterval[],  // Array of presence/away intervals
  margins?: { top, right, bottom, left },  // Optional margins (default: 20/20/40/50)
  onZoomChange?: (scale: number) => void   // Zoom callback
}
```

## 4. Outputs

```typescript
{
  svgRef: React.RefObject<SVGSVGElement>,  // Attach to <svg> element
  resetZoom: () => void,                    // Reset to 1x zoom
  zoomIn: () => void,                       // Zoom in 2x
  zoomOut: () => void                       // Zoom out 0.5x
}
```

## 5. Key Logic & Flow

### Initialization
```
1. Create SVG with D3
2. Set up coordinate system with margins
3. Create time scale (00:00 - 23:59)
4. Draw X-axis (12 hour ticks)
5. Create clipping path (prevents overflow)
6. Draw interval rectangles (green=present, red=away)
7. Draw current time indicator (blue dashed line)
8. Attach zoom behavior
9. Load saved zoom state from localStorage
10. Set up hover tooltips
```

### Time Scale
```typescript
const xScale = scaleTime()
  .domain([startOfDay, endOfDay])  // 00:00:00 - 23:59:59
  .range([0, innerWidth]);          // Pixel coordinates
```

### Drawing Intervals
```
For each interval:
1. Calculate X position: xScale(interval.start)
2. Calculate width: xScale(interval.end) - xScale(interval.start)
3. Color: green (#22c55e) for 'present', red (#ef4444) for 'away'
4. Height: 40% of inner height
5. Y position: 30% from top (centered)
6. Rounded corners (rx=2)
7. Opacity: 0.7 (1.0 on hover)
```

### Zoom Behavior
```
Scale Extent: 1x - 24x
- 1x: Full 24-hour view
- 24x: ~1 hour in full view

On zoom:
1. Rescale X axis
2. Update interval positions and widths
3. Update current time indicator position
4. Save zoom level to localStorage
5. Call onZoomChange callback

User interactions:
- Scroll: zoom in/out
- Drag: pan left/right
- Buttons: zoomIn(), zoomOut(), resetZoom()
```

### Hover Tooltips
```
On hover:
- Show tooltip with:
  - "✓ Present" or "✗ Away"
  - Start time - End time (HH:MM:SS)
  - Duration (e.g., "1h 23m")
- Tooltip follows mouse
- Disappears on mouseout
```

### Zoom Persistence
```
localStorage key: 'aideskwatch_timeline_zoom'
Saved value: current zoom scale (1-24)
Restored on mount
```

## 6. External Dependencies

- `d3-selection` - DOM manipulation
- `d3-scale` - Time scale
- `d3-axis` - Axis generation
- `d3-zoom` - Zoom/pan behavior
- [[types/stats|stats]] - PresenceInterval type
- [[utils/presenceAnalyzer|presenceAnalyzer]] - formatDuration()

## 7. Integration Points

### Used By:
- [[components/TimelineChart|TimelineChart]] (src/components/TimelineChart.tsx:90)

### Data Source:
- [[hooks/useStatsTracking|useStatsTracking]] - Provides intervals from sessions

### Data Flow:
```
useStatsTracking (currentSession.presence)
    ↓
TimelineChart (wrapper component)
    ↓
useD3Timeline (visualization)
```

## 8. Edge Cases & Notable Behaviors

### Ongoing Intervals
```typescript
const end = d.end ?? Date.now();  // Use current time if interval ongoing
```

### Minimum Width
```typescript
width: Math.max(1, ...)  // Ensure intervals are at least 1px visible
```

### Current Time Indicator
- Only drawn if current time is today
- Blue dashed line (#3b82f6)
- Updates position on zoom

### Clipping Path
- Prevents intervals from rendering outside chart bounds
- Important for zoomed/panned states

### Zoom Extent Enforcement
```
translateExtent: [[0, 0], [innerWidth, innerHeight]]
→ Prevents panning outside timeline bounds
```

### Tooltip Cleanup
- Removed on component unmount
- Prevents memory leaks

### D3 Selection Pattern
```typescript
.join('rect')  // Enter/update/exit pattern (modern D3)
```

## 9. Tests

**Current:** No tests

**Suggested:**
- Mock D3 selections
- Test scale calculations
- Test interval rendering
- Test zoom persistence

## 10. Questions / TODOs

### Open Questions
1. **Performance:** How many intervals before slowdown?
2. **Mobile:** Touch gestures for zoom/pan?
3. **Accessibility:** Keyboard navigation?

### Potential Improvements
- Y-axis labels (Present/Away)
- Multiple sessions shown separately (vertical stacking)
- Export as image
- Time range selector (not just zoom)
- Dark mode colors
- Accessibility (ARIA labels)

### Known Limitations
- Only shows one day at a time
- Tooltip not accessible to keyboard users
- No responsive font sizes

## Related Documents

- [[INDEX|Documentation Index]]
- [[components/TimelineChart|TimelineChart]] - Wrapper component
- [[hooks/useStatsTracking|useStatsTracking]] - Data source
- [[types/stats|stats]] - PresenceInterval type
- [[features/VISUALIZATION|Data Visualization]]

## Quick Reference

### Basic Usage
```typescript
const { svgRef, resetZoom, zoomIn, zoomOut } = useD3Timeline({
  width: 800,
  height: 200,
  intervals: currentSession?.presence || []
});

<svg ref={svgRef} width={width} height={height} />
<button onClick={zoomIn}>Zoom In</button>
<button onClick={zoomOut}>Zoom Out</button>
<button onClick={resetZoom}>Reset</button>
```

### Zoom Levels
- **1x:** Full day (24 hours)
- **2x:** 12 hours
- **4x:** 6 hours
- **8x:** 3 hours
- **12x:** 2 hours
- **24x:** 1 hour

---

**Next:** [[components/TimelineChart|TimelineChart]] - See how this hook is used
