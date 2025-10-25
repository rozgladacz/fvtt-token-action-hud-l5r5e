# Task 3 – Action Handler Improvements

**Dependencies:** Complete Task 1. Can run in parallel with Tasks 2 and 4.

## Steps
1. Open `scripts/action-handler.js` and inventory all exported handlers.
2. Refactor redundant logic into shared utilities (either inside this file or common helpers under `scripts/`).
3. Align action names and IDs with updates introduced in `scripts/init.js` and `scripts/defaults.js`.
4. Ensure any roll triggers delegate appropriately to `scripts/roll-handler.js` to avoid duplication.
5. Update references in `scripts/roll-handler.js` or other modules if function signatures change.
6. Stage modified files with `git add scripts/action-handler.js` (plus any shared helper modules affected).

## Validation
- Run unit or integration tests that exercise the action handler (`npm test`, or targeted suites if available).
- In Foundry, trigger representative HUD actions and confirm the correct rolls/actions execute without console errors.
- Verify linting (`npm run lint`) passes for the updated files.
