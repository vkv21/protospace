# 🔖 Code Review Note: ConfirmDialog.tsx

### 1. **File/Module Name**
- `src/components/ConfirmDialog.tsx`

### 2. **Purpose & Role (What does it do?)**
- A high-level modal component for obtaining user confirmation before critical or destructive actions (e.g., deleting data, resetting settings). It features smooth animations and accessible keyboard interactions.

### 3. **Inputs**
- **Props**:
    - `isOpen`: Boolean controlling visibility.
    - `onConfirm`: Callback when "Confirm" is clicked.
    - `onCancel`: Callback when "Cancel" or backdrop is clicked.
    - `title`: Header text for the dialog.
    - `message`: Detailed description of the action.
    - `confirmText`: (Optional) Text for the primary button.
    - `cancelText`: (Optional) Text for the secondary button.
    - `variant`: (Optional) Style preset ('danger', 'warning', 'info').

### 4. **Outputs / Returned Value**
- An animated overlay (via `framer-motion`) containing:
    - A backdrop with blur effect.
    - A centered dialog card with an status icon.
    - Clear "Confirm" and "Cancel" buttons styled according to the `variant`.

### 5. **Key Logic & Flow**
- **Animations**: Uses `AnimatePresence` and `motion` for entry/exit transitions (fade-in backdrop, spring-scale dialog).
- **Keyboard Handling**: 
    - `Escape` key triggers `onCancel`.
    - `Enter` key triggers `onConfirm`.
- **Styling Map**: `getVariantColors` dynamically selects Tailwind classes for icons and buttons based on the `variant` prop (e.g., Red for 'danger', Blue for 'info').
- **Scroll Lock**: Disables body scrolling when active.

### 6. **External Dependencies**
- **Libraries**: `framer-motion` (animations).
- **React**: `useEffect`.

### 7. **Integration Points**
- Used by any parent component requiring confirmation (e.g., `App.tsx` for reset actions).

### 8. **Edge Cases & Notable Behaviors**
- **Accessibility**: Includes `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` for screen reader support.
- **Backdrop Interaction**: Clicking the blurred area correctly invokes the cancel callback.
- **Auto-Cleanup**: Re-enables scroll and removes listeners on unmount.

### 9. **Tests (if any)**
- TODO: Check for `ConfirmDialog.test.tsx`.

### 10. **Questions / TODOs for Further Study**
- Should we add a `loading` prop to disable buttons while `onConfirm` (if async) is executing?
- Verify if the `Enter` key listener conflicts with inputs inside other modals if both are open (unlikely due to z-index and conditional rendering).
