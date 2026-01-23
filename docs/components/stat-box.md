# 🔖 Code Review Note: StatBox.tsx

### 1. **File/Module Name**
- `src/components/StatBox.tsx`

### 2. **Purpose & Role (What does it do?)**
- A generic, reusable UI component for displaying individual statistics (e.g., Desk Time, Break Time, Sessions) in a consistent card format.

### 3. **Inputs**
- **Props**:
    - `title`: String label for the statistic.
    - `value`: String or Number representing the data value.
    - `className`: Optional additional Tailwind classes.

### 4. **Outputs / Returned Value**
- A card UI containing:
    - An uppercase, small-font title.
    - A prominent, bold-font value.

### 5. **Key Logic & Flow**
- Simple functional component that renders provided props into a styled container.

### 6. **External Dependencies**
- **React**: Functional component definition.

### 7. **Integration Points**
- Heavily used in `DailyStats.tsx` and `StatsModal.tsx`.

### 8. **Edge Cases & Notable Behaviors**
- **Responsive Sizing**: Adjusts padding and font sizes based on screen breakpoints.
- **Glassmorphism-lite**: Uses semi-transparent background colors (`bg-gray-50/80`) to blend with parent backgrounds.

### 9. **Tests (if any)**
- TODO: Check for `StatBox.test.tsx`.

### 10. **Questions / TODOs for Further Study**
- Could be enhanced with icons or trend indicators (e.g., up/down arrows) if needed in the future.
