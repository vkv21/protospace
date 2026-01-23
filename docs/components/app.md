# App Component

> **File:** `/src/App.tsx`
> **Tags:** `#components` `#root` `#layout`
> **Complexity:** Low
> **Lines:** 102

---

## 1. File/Module Name

`App.tsx` - Root application component with dark mode and layout

## 2. Purpose & Role

Top-level React component that provides global layout structure, dark mode toggle, and header. Renders VideoCapture as main content. Entry point for the entire application.

## 3. Inputs

**Props:** None

**State:**
- `darkMode: boolean` - Dark mode preference (persisted to localStorage)

## 4. Outputs / Rendered Value

```tsx
<div> (full-screen container with gradient background)
  <header> (sticky header with logo and dark mode toggle)
  <main> (content area)
    <VideoCapture />
  </main>
</div>
```

## 5. Key Logic & Flow

### Dark Mode Management
```typescript
// Load from localStorage on mount
const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem('commitspace_dark_mode') === 'true';
});

useEffect(() => {
  localStorage.setItem('commitspace_dark_mode', darkMode.toString());
  if (darkMode) {
    document.documentElement.classList.add('dark');  // Tailwind dark mode
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [darkMode]);
```

### Header Structure
- **Logo:** Gradient blue-to-purple eye icon
- **Title:** "Commit Space" with gradient text
- **Toggle:** Sun/moon icon button

### Layout
- Responsive padding: `px-4 sm:px-6 lg:px-8`
- Sticky header with blur backdrop
- Full-height gradient background

## 6. External Dependencies

- [[components/VideoCapture|VideoCapture]] - Main content
- `./App.css` - Global styles
- Tailwind CSS - Styling
- React - useState, useEffect

## 7. Integration Points

### Used By:
- `main.tsx` - Renders App in React root

### Uses:
- [[components/VideoCapture|VideoCapture]] - Only child component

### Data Flow:
```
main.tsx
  ↓
App (dark mode, layout)
  ↓
VideoCapture (all features)
```

## 8. Edge Cases & Notable Behaviors

### SSR Safety
```typescript
if (typeof window !== 'undefined') {
  // Check before accessing localStorage
}
```

### Dark Mode Toggle Animation
- Smooth 300ms transition on background
- Scale animation on button click (hover:scale-105, active:scale-95)
- Icon changes: Sun (yellow) for light mode, Moon (gray) for dark mode

### Gradient Background
```
Light: gray-300 → gray-200 → gray-100
Dark: gray-950 → gray-900 → gray-950
```

### Sticky Header
- `sticky top-0 z-50` - Stays at top when scrolling
- Backdrop blur effect
- Semi-transparent background

## 9. Tests

**Current:** No tests

**Suggested:**
- Dark mode toggle functionality
- localStorage persistence
- Component rendering

## 10. Questions / TODOs

### Potential Improvements
- System theme preference detection (`prefers-color-scheme`)
- More theme options (high contrast, custom colors)
- Additional header buttons (help, about)
- Footer with version/links

## Related Documents

- [[INDEX|Documentation Index]]
- [[ARCHITECTURE-OVERVIEW|Architecture Overview]]
- [[components/VideoCapture|VideoCapture]]

## Quick Reference

**localStorage Key:** `commitspace_dark_mode`

**Tailwind Dark Mode:** Applied via `.dark` class on `<html>` element

---

**Next:** [[components/DailyStats|DailyStats]]
