# Codex Workflow Plan

This plan outlines the six Codex tasks and highlights their dependencies to help coordinate work.

- **Task 1 – Manifest Update (`module.json`)**
  - Must run **first** to ensure metadata is current before any code changes.
- **Task 2 – Init Refactor (`scripts/init.js`)**
  - Can run **in parallel** with Tasks 3 and 4 once Task 1 completes.
- **Task 3 – Action Handler Improvements (`scripts/action-handler.js`)**
  - Runs **in parallel** with Tasks 2 and 4 after Task 1.
- **Task 4 – Roll/Cleanup Alignment (`scripts/roll-handler.js`, `scripts/defaults.js`)**
  - Runs **in parallel** with Tasks 2 and 3 after Task 1.
- **Task 5 – Documentation & Defaults Sync (`README`, `scripts/defaults.js`)**
  - Starts after Tasks 2–4 conclude so documentation reflects the final implementation.
- **Task 6 – Testing & Release (automated and manual validation)**
  - Runs **last**, after all prior tasks are complete.

Visualized order: **Task 1 → {Task 2, Task 3, Task 4 in parallel} → Task 5 → Task 6**.
