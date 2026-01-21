# useNotifications Hook

> **File:** `/src/hooks/useNotifications.ts`
> **Tags:** `#hooks` `#notifications` `#break-reminders`
> **Complexity:** Low-Medium
> **Lines:** 161

---

## 1. File/Module Name

`useNotifications.ts` - Break reminder notification system

## 2. Purpose & Role

Manages browser notifications for break reminders. Tracks continuous desk time and shows notifications at configured intervals (default: 120 minutes). Prevents notification spam with minimum 5-minute gaps.

## 3. Inputs

```typescript
{
  continuousDeskTime: number,  // Seconds from useStatsTracking
  enabled?: boolean            // Enable/disable (default: true)
}
```

## 4. Outputs

```typescript
{
  notificationPermission: NotificationPermission,  // 'granted'|'denied'|'default'
  requestPermission: () => Promise<void>,          // Request permission function
  lastNotificationTime: Date | null                // Last notification timestamp
}
```

## 5. Key Logic & Flow

### Permission Request
```
1. User clicks "Enable Notifications"
2. requestPermission() called
3. Notification.requestPermission()
4. Browser shows permission prompt
5. Update settings on grant/deny
```

### Break Reminder Logic
```
Check every 10 seconds:
1. Is permission granted?
2. Are break reminders enabled in settings?
3. Has continuousDeskTime reached threshold? (default: 120 min)
4. Has 5 minutes passed since last notification?
5. Is this a new reminder period?
→ If all yes: show notification
```

### Notification Display
```
Title: "Time for a break! 🧘"
Body: "You've been at your desk for 2h 15m. Take a 5-10 minute break..."
Auto-close: 10 seconds
Click: Focus window
```

## 6. External Dependencies

- Browser `Notification` API
- [[utils/statsStorage|statsStorage]] - Load settings
- React hooks: useEffect, useRef, useState

## 7. Integration Points

### Used By:
- [[components/VideoCapture|VideoCapture]] (src/components/VideoCapture.tsx:110)

### Depends On:
- [[hooks/useStatsTracking|useStatsTracking]] - Receives continuousDeskTime

## 8. Edge Cases & Notable Behaviors

### Period Tracking
```typescript
const currentPeriod = Math.floor(continuousDeskTime / (intervalMinutes * 60));
// Prevents multiple notifications in same period
```

### 5-Minute Minimum Gap
- Prevents spam if user stays at desk
- Independent of break reminder interval setting

### Auto-Close
- Notification closes after 10 seconds
- Click also closes and focuses window

### Browser Support
- Checks `typeof Notification !== 'undefined'`
- Gracefully handles unsupported browsers

## 9. Tests

**Current:** No tests

**Suggested:**
- Mock Notification API
- Test permission flow
- Test reminder logic
- Test spam prevention

## 10. Questions / TODOs

### Potential Improvements
- Customizable notification message
- Sound/vibration options
- Snooze functionality
- Break tracking (did user actually take a break?)

## Related Documents

- [[INDEX|Documentation Index]]
- [[hooks/useStatsTracking|useStatsTracking]] - Provides continuousDeskTime
- [[features/NOTIFICATIONS|Notification Feature]]

---

**Next:** [[hooks/useCanvasOverlay|useCanvasOverlay]] - Dev mode visualization
