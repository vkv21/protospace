### 1. **File/Module Name**
- `src/hooks/useD3Timeline.ts`

### 2. **Purpose & Role (What does it do?)**
- A specialized hook for rendering a zoomable, interactive 24-hour timeline of user presence using the D3.js library. It visualizes sessions as color-coded blocks (green for present, red for away) and provides detailed tooltips on hover.

### 3. **Inputs**
- `options: UseD3TimelineOptions`:
    - `width`, `height`: Pixel dimensions for the SVG.
    - `intervals`: Array of `PresenceInterval` objects to render.
    - `margins`: (Optional) SVG padding.
    - `onZoomChange`: (Optional) Callback for tracking zoom level changes.

### 4. **Outputs / Returned Value**
- `UseD3TimelineReturn`:
    - `svgRef`: Ref to be attached to the target `<svg>` element.
    - `resetZoom`, `zoomIn`, `zoomOut`: Control functions for external UI buttons.

### 5. **Key Logic & Flow**
- **D3 Initialization**: Sets up scales (`scaleTime`), axes (`axisBottom`), and clipping paths within an `useEffect` triggered by resize or data changes.
- **24-Hour Domain**: Always shows the full day (00:00 to 23:59) by default.
- **Interactivity**:
    - **Zoom/Pan**: Uses `d3-zoom` to allow horizontal scaling (1x to 24x). Rescale values are persisted to `localStorage` to maintain user preference across reloads.
    - **Tooltips**: Dynamically injects a tooltip `<div>` into the body on hover, calculating localized time strings and durations.
- **Rendering**: Maps interval start/end times to the X-axis and renders rectangles with specific colors (`#22c55e` for present, `#ef4444` for away).

### 6. **External Dependencies**
- `d3-selection`, `d3-scale`, `d3-axis`, `d3-zoom`: Core D3 modules.
- `../utils/presenceAnalyzer`: For `formatDuration` utility.

### 7. **Integration Points**
- Used by the `TimelineChart.tsx` component.

### 8. **Edge Cases & Notable Behaviors**
- **Ongoing Intervals**: Automatically uses `Date.now()` as the end time for intervals where `end` is null.
- **Clipping**: Uses SVG `<clipPath>` to ensure that bars don't overflow the axis boundaries during panning.
- **Persistence**: Remembers the zoom scale via `commitspace_timeline_zoom` in `localStorage`.
- **D3 Selection Pattern**: Uses the modern `.join('rect')` pattern to efficiently handle enter/update/exit cycles of the data.

### 9. **Tests (if any)**
- Not found.

### 10. **Questions / TODOs for Further Study**
- Should we support vertical scrolling if there are many sessions/days to show?
- Can we add indicators for specific activities (typing, phone call) as sub-marks on the bars?
- The tooltip creation/removal logic might be better handled by a React component for better state management.
