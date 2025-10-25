# Task 1 – Manifest Update

**Dependencies:** None. Begin with this task to set accurate metadata before modifying code.

## Steps
1. Open `module.json`.
2. Review version, compatibility, author, and URL fields; update them to match the upcoming release requirements.
3. Confirm new script or style bundles created by later tasks are already referenced or add placeholder entries if needed.
4. Ensure any added translation or language files in `languages/` are listed.
5. Save the file and stage changes with `git add module.json`.

## Validation
- Run `npm run lint:manifest` if available; otherwise, validate `module.json` syntax with a JSON linter.
- Manually load the module manifest in Foundry's setup UI (if accessible) to ensure it parses without errors.
- Confirm `git status` shows only the expected `module.json` changes before passing the task to parallel efforts.
