# 🔖 Code Review Note: SettingsModal.tsx

### 1. **File/Module Name**
- `src/components/SettingsModal.tsx`

### 2. **Purpose & Role (What does it do?)**
- Provides a user interface for configuring application behavior, specifically daily and weekly goals, notification permissions, and break reminder intervals. It includes safe-guards for unsaved changes and feedback for successful updates.

### 3. **Inputs**
- **Props**:
    - `isOpen`: Boolean controlling visibility.
    - `onClose`: Callback to close the modal.
    - `settings`: Current `UserSettings` object.
    - `onSave`: Callback receiving updated `UserSettings`.
    - `notificationPermission`: Current browser status.
    - `onRequestNotifications`: Callback to trigger browser permission request.

### 4. **Outputs / Returned Value**
- A modal UI containing:
    - **Goals**: Range sliders for Daily (0.5h to 24h) and Weekly (1h to 168h) targets.
    - **Notifications**: System permission status and toggle for "Break Reminders" with a configurable interval (30min to 4h).
    - **Data Management**: Privacy notice and "Reset to Defaults" button.
    - **Feedback UI**: Unsaved changes warning and success toast.

### 5. **Key Logic & Flow**
- **Drafting State**: Uses `localSettings` to track changes before they are committed via `onSave`. 
- **Change Detection**: `hasUnsavedChanges` boolean is toggled whenever a local setting is modified.
- **Guard Rails**: `handleClose` intercepts close attempts if unsaved changes exist, showing a warning instead of closing immediately.
- **Persistence Synchronization**: `useEffect` updates `localSettings` when the parent `settings` prop changes (e.g., if updated from another component or on initial load).
- **Reset Logic**: Reverts `localSettings` to the hardcoded `DEFAULT_SETTINGS` object.

### 6. **External Dependencies**
- **Constants**: `DEFAULT_SETTINGS`.
- **Types**: `UserSettings`.
- **React**: `useState`, `useEffect`, `useCallback`.

### 7. **Integration Points**
- Consumed by `App.tsx`.
- Interfaces with the browser's Notification API status via parent props.

### 8. **Edge Cases & Notable Behaviors**
- **Accessibility**: Listens for the `Escape` key to trigger the close logic (including the unsaved changes check).
- **User Experience**: "Save Changes" button is disabled if no modifications have been made.
- **Scroll Lock**: Disables body scroll when active.

### 9. **Tests (if any)**
- TODO: Check for `SettingsModal.test.tsx`.

### 10. **Questions / TODOs for Further Study**
- The success toast and unsaved warnings are localized inside the modal; should they be global notifications to handle scenarios where the modal closes but feedback is still needed?
- Should we add a confirmation dialog before "Reset to Defaults" since it's a destructive change to user preferences?
