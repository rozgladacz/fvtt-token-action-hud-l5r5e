# Task 4 – Roll & Cleanup Alignment

**Dependencies:** Complete Task 1. Can run in parallel with Tasks 2 and 3.

## Steps
1. Open `scripts/roll-handler.js` to review roll orchestration logic.
2. Audit `scripts/defaults.js` for default HUD groups and action configurations; update structures to match roll handler expectations.
3. Remove obsolete roll pathways or cleanup routines that duplicate logic covered by Tasks 2 or 3.
4. Ensure any helper utilities remain shared—consider moving common cleanup functions into a dedicated helper under `scripts/` if multiple modules use them.
5. When adjusting defaults, confirm `scripts/init.js` consumes the updated structures correctly.
6. Stage changes with `git add scripts/roll-handler.js scripts/defaults.js` (plus any helpers touched).

## Validation
- Execute automated tests covering roll execution (`npm test` or equivalent suites).
- Within Foundry, trigger sample rolls and confirm dice results and chat cards match expectations.
- Review console output to verify cleanup steps run without errors after actions complete.
