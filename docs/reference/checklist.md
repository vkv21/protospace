# 📝 Documentation Reading Checklist

Welcome to the Commit Space doc system! Below is a checklist to help you work through the documentation at your own pace, with checkboxes, priority notes, and realistic time estimates for each learning goal and file group.

---

## ⏳ Quick Reference
| Path                  | Estimated Time | Description                                                      |
|-----------------------|---------------|------------------------------------------------------------------|
| Quick Orientation     | 30-45 min     | High-level overview, basics, team intros                         |
| Developer Onboarding  | 2-3 hours     | Core concepts, system flow, critical hooks/components            |
| Deep Dive / Mastery   | 6-8 hours     | Full architecture, deep docs, algorithms, all source cross-links |
| Maintenance Mode      | 30-50 min     | Only essentials for bugfixes/doc updates                         |

---

## 📍 Path 1: Quick Orientation *(30-45 min)*
- [ ] **`doc/readme.md`** — Start here! Overview, navigation tips, key documents _(10 min)_
- [ ] **`doc/INDEX.md`** — Navigation hub, quick links _(5 min)_
- [ ] **`doc/ARCHITECTURE-OVERVIEW.md`** ⭐ Core System Architecture _(20 min)_
- [ ] **`doc/COMPONENTS-OVERVIEW.md`** — Component hierarchy & summary _(5 min)_
- [ ] **`doc/HOOKS-OVERVIEW.md`** — Hook summary & dependency graph _(5 min)_

---

## 🚀 Path 2: Developer Onboarding *(2–3 hours)*
- [ ] All items from Quick Orientation _(above)_
- [ ] **`doc/hooks/useStatsTracking.md`** ⭐ The most complex logic: tracking, multi-tab sync _(30 min)_
- [ ] **`doc/components/VideoCapture.md`** ⭐ Main logic orchestrator _(20 min)_
- [ ] **`doc/features/SESSION-TRACKING.md`** — Session features & details _(10 min)_
- [ ] **`doc/features/MULTI-TAB-SYNC.md`** — Leader election, multi-tab design _(10 min)_
- [ ] **`doc/UTILITIES-OVERVIEW.md`** — Utility/helper overview _(5 min)_
- [ ] **`doc/TYPES-REFERENCE.md`** — Core types & structures used throughout _(10 min)_

---

## 🏆 Path 3: Deep Dive / Mastery *(6–8 hours)*
- [ ] All above (Quick Orientation & Onboarding)
- [ ] **Features**
    - [ ] `doc/features/SESSION-TRACKING.md` _(repeat, 10 min review)_
    - [ ] `doc/features/MULTI-TAB-SYNC.md` _(repeat, 10 min review)_
- [ ] **Algorithms**
    - [ ] `doc/algorithms/PRESENCE-DETECTION.md` _(20 min)_
    - [ ] `doc/algorithms/HYSTERESIS-FILTER.md` _(20 min)_
    - [ ] `doc/algorithms/LEADER-ELECTION.md` _(20 min)_
    - [ ] `doc/algorithms/DATA-AGGREGATION.md` _(20 min)_
- [ ] **Hooks**
    - [ ] `doc/hooks/useWebcam.md` _(10 min)_
    - [ ] `doc/hooks/usePoseDetection.md` _(10 min)_
    - [ ] `doc/hooks/usePresenceTracking.md` _(10 min)_
    - [ ] `doc/hooks/useCanvasOverlay.md` _(10 min)_
    - [ ] `doc/hooks/useNotifications.md` _(10 min)_
    - [ ] `doc/hooks/useD3Timeline.md` _(10 min)_
- [ ] **Components** (Main ones only; see COMPONENTS-OVERVIEW for list)
    - [ ] `doc/components/DailyStats.md` _(10 min)_
    - [ ] `doc/components/StatsModal.md` _(10 min)_
    - [ ] `doc/components/SettingsModal.md` _(10 min)_
    - [ ] `doc/components/App.md` _(5 min)_
    - [ ] `doc/components/GoalProgressBox.md` _(5 min)_
    - [ ] `doc/components/TimelineChart.md` _(5 min)_
    - [ ] `doc/components/WeeklyBarChart.md` _(5 min)_
- [ ] **Utilities**
    - [ ] `doc/UTILITIES-OVERVIEW.md` _(repeat, 5 min review)_
    - [ ] `doc/utils/poseDetector.md` _(10 min)_
    - [ ] `doc/utils/presenceAnalyzer.md` _(10 min)_
    - [ ] `doc/utils/statsStorage.md` _(10 min)_
    - [ ] `doc/utils/landmarkDrawer.md` _(5 min)_

---

## 🔄 Path 4: Maintenance Mode *(30-50 min)*
Geared for contributors fixing bugs or updating docs:
- [ ] Check `doc/INDEX.md` for navigation _(2 min)_
- [ ] Review `doc/ARCHITECTURE-OVERVIEW.md` for overall system _(15 min)_
- [ ] Read relevant topic:
    - [ ] Hook? See `doc/HOOKS-OVERVIEW.md`
    - [ ] Component? See `doc/COMPONENTS-OVERVIEW.md`
    - [ ] Utility/Algorithm? See `doc/UTILITIES-OVERVIEW.md` and topic-matching doc
- [ ] If updating guides: `doc/readme.md` / `doc/TYPES-REFERENCE.md` _(10 min)_
- [ ] If fixing deeper bugs: consult feature/algorithm or individual file docs as needed

---

## 📊 Progress Tracking
Copy this checklist elsewhere and tick off as you go. Each checkbox = 1 doc. Most docs take 5–20 min; starred (⭐) ones are critical for overall understanding.

---

Happy learning — work at your own pace!
