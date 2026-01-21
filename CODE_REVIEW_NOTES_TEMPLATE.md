# 🔖 Code Review Note Template & Instructions

## How to Use This Template
Copy the template below and fill it out for each hook, component, utility, or other major code module you review in your codebase. This structure will help you quickly understand, summarize, and reference every important piece of logic or UI you encounter.

---

## Code Review Note Template

### 1. **File/Module Name**
- (e.g., `useStatsTracking.tsx`, `PresenceWidget.tsx`, `statsStorage.ts`)

### 2. **Purpose & Role (What does it do?)**
- (A short summary in your own words)

### 3. **Inputs**
- (Props, parameters, context, hooks, or API calls consumed)

### 4. **Outputs / Returned Value**
- (Return value, exposed state or data, events fired, or UI rendered)

### 5. **Key Logic & Flow**
- (How does it work? List/diagram main steps, important conditionals, and state transitions.)

### 6. **External Dependencies**
- (What modules/functions/types does it import or depend on? Any external APIs?)

### 7. **Integration Points**
- (Where and how is this used by the rest of the app? Which components consume it, or which hooks use it?)

### 8. **Edge Cases & Notable Behaviors**
- (Anything special: error handling, corner cases, performance tricks, multi-tab, persistence?)

### 9. **Tests (if any)**
- (Does it have dedicated tests? Where? How thorough are they?)

### 10. **Questions / TODOs for Further Study**
- (Anything unclear? Design choices to revisit? Add your open questions here.)

---

## Example: usePresenceDetection.ts

**File:** `src/hooks/usePresenceDetection.ts`  
**Purpose:** Polls backend to determine if user is present at desk; exposes presence status to rest of app.  
**Inputs:** None directly; uses API endpoint `/api/presence/status`  
**Outputs:** `{ isPresent, lastSeen, confidence, detectionMethod }`  
**Key Logic:** Uses polling interval; updates state based on response.  
**Dependencies:** Depends on `api.ts`, possibly custom types.  
**Integration:** Used by top-level MainLayout and stats tracking hook.  
**Edge Cases:** Handles API failures by fallback to last known state.  
**Tests:** TODO—Check test directory for relevant tests.  
**Open Questions:** Are there rate limits or error backoff on failed API calls?  

---

### Self-Guided Study Pro Tips
- For each feature/module, jot down your own high-level notes and try to draw diagrams showing data or control flow.
- Identify entry points (where a feature is first invoked in the UI or logic).
- Note main processing logic and special complexities (like persistence or multi-tab sync).
- Experiment with local runs or UI state changes if possible—poke/prototype to solidify your understanding.
