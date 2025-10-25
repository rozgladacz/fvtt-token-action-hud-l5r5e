# Task 2 – Init Refactor

**Dependencies:** Complete Task 1. Can run in parallel with Tasks 3 and 4.

## Steps
1. Open `scripts/init.js` and review the initialization hooks and exported functions.
2. Identify opportunities to modularize startup logic (e.g., separate configuration loading into helper functions within `scripts/init.js` or new modules under `scripts/`).
3. Update imports to use the new helpers, ensuring any shared utilities remain compatible with `scripts/action-handler.js` and `scripts/roll-handler.js`.
4. If initialization requires defaults, coordinate with the structures defined in `scripts/defaults.js` so both files agree on data shapes.
5. Adjust any references in `module.json` or other scripts that consume init exports.
6. Save changes and stage them with `git add scripts/init.js` (and any new helper modules created).

## Validation
- Run `npm test` or the Foundry-compatible unit tests to ensure no initialization regressions.
- Start Foundry, enable the module, and verify the console reports successful initialization without warnings.
- Confirm any automation triggered via `Hooks.once('ready')` executes as expected.
