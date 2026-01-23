# Leader Election Protocol

**Tags:** #algorithm #distributed-systems #multi-tab #coordination #broadcast-channel  
**Related:** [[useStatsTracking]], [[MULTI-TAB-SYNC]], [[SESSION-TRACKING]]  
**Complexity:** High  
**Last Updated:** 2026-01-21

---

## Overview

The **Leader Election Protocol** is a distributed coordination mechanism that ensures only ONE browser tab tracks presence and writes statistics at any time, even when multiple tabs of Commit Space are open simultaneously. This prevents race conditions, duplicate session creation, and localStorage conflicts.

**Purpose:** Designate a single "leader" tab responsible for tracking, while other "follower" tabs remain passive.

**Key Innovation:** BroadcastChannel-based consensus with timeout-based election and periodic heartbeats.

---

## Problem Statement

### Multi-Tab Conflicts Without Coordination

**Scenario:** User opens Commit Space in 3 browser tabs

**Without leader election:**
1. **All 3 tabs** run presence detection simultaneously
2. **All 3 tabs** create separate sessions for the same time period
3. **All 3 tabs** write to localStorage every 5 seconds
4. **Result:** Data corruption, 3x unnecessary computation, localStorage thrashing

```
Tab A: Creates Session_001 (00:00 - 00:30)
Tab B: Creates Session_002 (00:00 - 00:30)  ← Duplicate!
Tab C: Creates Session_003 (00:00 - 00:30)  ← Duplicate!

localStorage after 30 seconds:
{
  sessions: [Session_001, Session_002, Session_003]  ← Wrong!
}
```

### With Leader Election

```
Tab A: LEADER   → Tracks presence, writes stats
Tab B: FOLLOWER → Idle (reads stats for display)
Tab C: FOLLOWER → Idle (reads stats for display)

localStorage after 30 seconds:
{
  sessions: [Session_001]  ← Correct! Single source of truth
}
```

---

## Protocol Design

### Roles

**Leader:**
- Runs presence tracking logic (`useStatsTracking` active)
- Creates and updates sessions
- Writes to localStorage every 5 seconds
- Announces leadership every 5 seconds via BroadcastChannel
- **Only ONE leader exists at any time**

**Follower:**
- Does NOT track presence (logic disabled)
- Reads from localStorage to display stats
- Listens for leader announcements
- Can become leader if current leader dies

---

## Algorithm Phases

### Phase 1: Initialization (New Tab Opens)

```typescript
// Every new tab gets a unique ID
const tabIdRef = useRef(Date.now());  // Timestamp = unique ID

// Every tab starts as a FOLLOWER
const [isLeader, setIsLeader] = useState(false);
isLeaderRef.current = false;
```

*File: `src/hooks/useStatsTracking.ts:43-50`*

### Phase 2: Leader Discovery

```typescript
// Create BroadcastChannel for inter-tab communication
const channel = new BroadcastChannel('commitspace_tracking');

// 1. Announce arrival to existing tabs
channel.postMessage({ 
  type: 'HELLO', 
  tabId: tabIdRef.current 
});

// 2. Wait for existing leader to respond (500ms timeout)
leaderTimeoutRef.current = setTimeout(() => {
  // No leader responded → Become leader
  isLeaderRef.current = true;
  setIsLeader(true);
  console.log('Became leader tab');
  
  channel.postMessage({
    type: 'I_AM_LEADER',
    tabId: tabIdRef.current,
  });
}, 500);
```

**Election Rule:**
- If ANY tab responds with `I_AM_LEADER` within 500ms → Remain follower
- If NO response after 500ms → Become leader

*File: `src/hooks/useStatsTracking.ts:242-257`*

### Phase 3: Message Handling

```typescript
channel.onmessage = (event) => {
  if (event.data.type === 'I_AM_LEADER') {
    // Another tab is leader, stay as follower
    if (leaderTimeoutRef.current) {
      clearTimeout(leaderTimeoutRef.current);  // Cancel election
      leaderTimeoutRef.current = null;
    }
    isLeaderRef.current = false;
    setIsLeader(false);
  }

  if (event.data.type === 'HELLO' && isLeaderRef.current) {
    // I'm leader, announce to newcomer
    channel.postMessage({
      type: 'I_AM_LEADER',
      tabId: tabIdRef.current,
    });
  }
};
```

**Message Types:**
- `HELLO`: New tab announces its presence
- `I_AM_LEADER`: Leader announces its authority

*File: `src/hooks/useStatsTracking.ts:222-240`*

### Phase 4: Heartbeat (Leader Maintenance)

```typescript
// Leader sends periodic heartbeats
const announceInterval = setInterval(() => {
  if (isLeaderRef.current) {
    channel.postMessage({
      type: 'I_AM_LEADER',
      tabId: tabIdRef.current,
    });
  }
}, 5000);  // Every 5 seconds
```

**Purpose:**
- Informs all tabs that leader is still alive
- Prevents follower tabs from timing out and electing new leader
- Also serves as "keepalive" for BroadcastChannel

*File: `src/hooks/useStatsTracking.ts:259-267`*

---

## State Diagram

```
┌────────────────────────────────────────────────────────┐
│                    NEW TAB OPENS                       │
│              (isLeader = false initially)              │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
         ┌──────────────────────────────┐
         │  Send "HELLO" to all tabs    │
         │  Start 500ms election timer  │
         └──────────────┬───────────────┘
                        │
           ┌────────────┴─────────────┐
           │                          │
           ▼                          ▼
  ┌──────────────────┐      ┌──────────────────┐
  │ Receive          │      │ 500ms timeout    │
  │ "I_AM_LEADER"    │      │ (no response)    │
  │ within 500ms     │      │                  │
  └────────┬─────────┘      └────────┬─────────┘
           │                         │
           ▼                         ▼
  ┌──────────────────┐      ┌──────────────────┐
  │   FOLLOWER       │      │     LEADER       │
  │ (isLeader=false) │      │ (isLeader=true)  │
  │                  │      │                  │
  │ - Tracking OFF   │      │ - Tracking ON    │
  │ - Read stats     │      │ - Write stats    │
  │ - Listen for     │      │ - Send heartbeat │
  │   leader msgs    │      │   every 5s       │
  └────────┬─────────┘      └────────┬─────────┘
           │                         │
           │  ┌──────────────────┐   │
           │  │ Leader tab dies  │   │
           │  │ (closed/crashed) │   │
           │  └────────┬─────────┘   │
           │           │             │
           │           ▼             │
           │  No heartbeat received  │
           │  for >5 seconds         │
           │           │             │
           └───────────┴─────────────┘
                       │
                       ▼
              New election triggered
              (any follower can become leader)
```

---

## Timing Analysis

### New Tab Opening (Typical Case)

```
T=0ms:    Tab opens, sends "HELLO"
T=50ms:   Existing leader receives "HELLO"
T=60ms:   Leader responds with "I_AM_LEADER"
T=70ms:   New tab receives response → Remains follower
T=500ms:  Timeout fires but already follower (no-op)
```

**Result:** New tab becomes follower in ~70ms

### New Tab Opening (First Tab)

```
T=0ms:    Tab opens, sends "HELLO"
T=500ms:  Timeout fires, no response received
T=500ms:  Tab becomes LEADER
T=500ms:  Sends "I_AM_LEADER" announcement
```

**Result:** First tab becomes leader after 500ms

### Leader Tab Closes

```
T=0s:     Leader tab closes (no goodbye message)
T=5s:     Follower tabs notice no heartbeat for 5s
T=5s:     ❌ PROBLEM: No automatic re-election!
```

**Current Issue:** Followers don't detect leader death automatically
**Mitigation:** User must manually close/reopen tab, or leader dies gracefully

---

## Edge Cases & Robustness

### 1. Split Brain (Multiple Leaders)

**Can this happen?**
- **Theoretically:** No, protocol prevents it
- **Race condition:** Two tabs open simultaneously, both send "HELLO" before either becomes leader
- **Result:** Both wait 500ms, BOTH become leader (split brain)

**Likelihood:** Very low (requires precise timing within ~50ms)

**Mitigation:**
```typescript
// Possible enhancement: Use tabId as tiebreaker
if (otherTabId < myTabId && bothLeaders) {
  // Defer to lower tabId
  isLeaderRef.current = false;
}
```

**Current Status:** Not implemented (deemed acceptable risk)

### 2. BroadcastChannel Unsupported

```typescript
try {
  const channel = new BroadcastChannel('commitspace_tracking');
  // ...
} catch (error) {
  // Fallback: All tabs become leaders (Safari < 15.4)
  console.warn('BroadcastChannel not supported');
  isLeaderRef.current = true;
  setIsLeader(true);
}
```

**Browsers Affected:** Safari < 15.4, IE11 (not supported anyway)

**Fallback Behavior:** Every tab acts as leader (data duplication, but not corrupt)

*File: `src/hooks/useStatsTracking.ts:276-281`*

### 3. Leader Dies Ungracefully

**Scenario:** Leader tab crashes, freezes, or user force-closes it

**Problem:** Followers don't detect leader death (no explicit "I'm dead" message)

**Current Mitigation:** None (must reopen tab)

**Proposed Solution:** Leader timeout detection
```typescript
// In follower tabs
const lastHeartbeatRef = useRef(Date.now());

channel.onmessage = (event) => {
  if (event.data.type === 'I_AM_LEADER') {
    lastHeartbeatRef.current = Date.now();
  }
};

// Check for stale leader
setInterval(() => {
  if (Date.now() - lastHeartbeatRef.current > 10000) {
    // No heartbeat for 10s, leader probably dead
    // Trigger new election
  }
}, 5000);
```

**Status:** Not implemented (TODO)

### 4. Tab Backgrounding (Browser Throttling)

**Scenario:** Browser throttles background tabs (Chrome/Firefox)

**Problem:** Follower tabs might miss heartbeat messages

**Solution:** Heartbeat interval (5s) is long enough to survive throttling

**Evidence:** Chrome throttles to 1 task/second minimum, which is sufficient for 5s interval

---

## Performance Characteristics

### Message Frequency

**Leader tab:**
- Sends 1 message every 5 seconds (heartbeat)
- Responds to HELLO messages (on-demand)
- **Total:** ~0.2 messages/second average

**Follower tab:**
- Sends 1 message on startup (HELLO)
- Receives 1 message every 5 seconds (heartbeat)
- **Total:** ~0.2 messages/second average

### Bandwidth Usage

**Per message:** ~50 bytes (JSON overhead)
```json
{
  "type": "I_AM_LEADER",
  "tabId": 1737492864321
}
```

**Bandwidth:** ~10 bytes/second per tab (negligible)

### CPU Usage

- **Election:** 1 timeout (500ms), 1 interval (5s)
- **Message handling:** Event-driven (no polling)
- **Overhead:** <0.1% CPU

---

## Testing Strategy

### Unit Tests

**Status:** Not implemented (difficult to test BroadcastChannel in Jest)

**Test Cases:**
```typescript
describe('Leader election', () => {
  it('should elect first tab as leader', () => {
    // Mock BroadcastChannel, verify leader election after 500ms
  });
  
  it('should make subsequent tabs followers', () => {
    // Simulate existing leader, verify new tab becomes follower
  });
  
  it('should handle split brain by comparing tabIds', () => {
    // Simulate race condition, verify tiebreaker
  });
  
  it('should fallback to leader if BroadcastChannel unsupported', () => {
    // Mock BroadcastChannel constructor throwing error
  });
});
```

### Manual Testing

**Test 1: Single Tab**
1. Open Commit Space
2. Check console: "Became leader tab" after 500ms
3. Verify tracking is active (session created)

**Test 2: Multiple Tabs**
1. Open Commit Space in Tab A
2. Wait 1 second (A becomes leader)
3. Open Tab B
4. Check Tab B console: No "Became leader" message
5. Verify only Tab A creates sessions

**Test 3: Leader Closes**
1. Open Tab A (leader)
2. Open Tab B (follower)
3. Close Tab A
4. **Expected:** Tab B should become leader (currently doesn't work)
5. Workaround: Reload Tab B

---

## Comparison with Alternative Approaches

### 1. Shared Web Worker

**Concept:** Use SharedWorker as single tracking instance

**Pros:**
- True single instance (no leader election needed)
- More robust (worker persists across tab closes)

**Cons:**
- Complex setup (separate worker file)
- Debugging difficulty (worker runs in separate context)
- Limited browser support (Safari added in 2022)

**Why not used:** BroadcastChannel is simpler and widely supported

### 2. localStorage Locking

**Concept:** Use localStorage key as mutex lock

```typescript
// Attempt to acquire lock
const lock = localStorage.getItem('tracking_lock');
if (!lock || Date.now() - lock > 10000) {
  localStorage.setItem('tracking_lock', Date.now());
  becomeLeader();
}
```

**Pros:**
- No need for BroadcastChannel
- Works in all browsers

**Cons:**
- Race conditions (localStorage is not atomic)
- Polling required (inefficient)
- Stale locks if tab crashes

**Why not used:** BroadcastChannel is more reliable and event-driven

### 3. IndexedDB Transaction Locking

**Concept:** Use IndexedDB transaction as distributed lock

**Pros:**
- Atomic operations (no race conditions)
- True mutex

**Cons:**
- Overkill for simple coordination
- Async complexity
- Slower than BroadcastChannel

**Why not used:** Too complex for the benefit

---

## Integration with Tracking Logic

### Leader-Only Tracking

```typescript
// Session tracking only runs if leader
useEffect(() => {
  if (!isLeaderRef.current || !todayStats || !currentSession) {
    return;  // ← Followers skip this effect
  }
  
  // Leader-only logic: Update session, save to localStorage
  const saveInterval = setInterval(() => {
    // ... save logic
  }, 5000);
  
  return () => clearInterval(saveInterval);
}, [currentSession, todayStats]);
```

*File: `src/hooks/useStatsTracking.ts:404-477`*

### Follower Behavior

Followers still:
- Read `todayStats` from state (which reads from localStorage)
- Display stats in UI
- Show current session (read from localStorage by other tabs)

Followers do NOT:
- Create sessions
- Write to localStorage
- Run tracking intervals

---

## Future Enhancements

### 1. Leader Death Detection

```typescript
// In followers: Detect stale leader and trigger re-election
const HEARTBEAT_TIMEOUT = 10000;  // 10 seconds

if (Date.now() - lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
  console.warn('Leader appears dead, triggering election');
  triggerElection();
}
```

### 2. Explicit Leader Resignation

```typescript
// In leader: Send goodbye message before closing
window.addEventListener('beforeunload', () => {
  if (isLeaderRef.current) {
    channel.postMessage({ type: 'LEADER_RESIGNED' });
  }
});
```

**Problem:** `beforeunload` is unreliable (not guaranteed to fire)

### 3. Leader Priority System

```typescript
// Prefer older tabs as leader (more stable)
const tabAge = Date.now() - tabIdRef.current;

if (tabAge > 60000 && !isLeader) {
  // This tab has been open for 1+ minute, try to become leader
  challengeCurrentLeader();
}
```

### 4. Visual Leader Indicator

```typescript
// Show leader status in UI
{isLeader && (
  <div className="bg-green-500 text-white px-2 py-1 rounded">
    Leader Tab (Tracking Active)
  </div>
)}
```

---

## Related Documentation

- [[MULTI-TAB-SYNC]] - Feature documentation for multi-tab coordination
- [[SESSION-TRACKING]] - How leader tab creates and manages sessions
- [[useStatsTracking]] - Hook that implements this protocol
- [[VideoCapture]] - Component that uses leader status to enable/disable tracking

---

## References

- **BroadcastChannel API:** https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
- **Leader Election (Distributed Systems):** https://en.wikipedia.org/wiki/Leader_election
- **Implementation:** `src/hooks/useStatsTracking.ts:216-282`

---

## Questions / TODOs

1. **HIGH PRIORITY:** Implement leader death detection (followers don't re-elect)
2. Should we add visual indicator showing which tab is leader?
3. Can we eliminate split-brain possibility with tabId tiebreaker?
4. Should we use SharedWorker instead for cleaner architecture?
5. How do we test BroadcastChannel in Jest environment?
6. Should leader resign explicitly on beforeunload (if reliable)?
