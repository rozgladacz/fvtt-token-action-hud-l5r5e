# Task 5 – Documentation & Defaults Sync

**Dependencies:** Complete Tasks 2–4 before updating documentation.

## Steps
1. Review finalized behaviors in `scripts/init.js`, `scripts/action-handler.js`, `scripts/roll-handler.js`, and `scripts/defaults.js`.
2. Open `README.md` (root `readme.md`) and update feature descriptions, configuration instructions, and usage examples to reflect new workflows.
3. Document any new configuration keys introduced in `scripts/defaults.js` and how users can customize them.
4. Add upgrade notes for existing users, referencing changed action IDs or manifest updates.
5. If supplementary docs exist (e.g., `languages/` or wiki references), update links accordingly.
6. Stage modified documentation with `git add readme.md` (and any other doc files touched).

## Validation
- Spell-check key sections or run `npm run lint:docs` if a documentation linter is configured.
- Render the README locally (Markdown preview) to ensure formatting and code blocks look correct.
- Confirm all referenced scripts and configuration keys exist and match the repository.
