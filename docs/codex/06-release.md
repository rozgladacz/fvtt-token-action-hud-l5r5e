# Task 6 – Testing & Release

**Dependencies:** Complete Tasks 1–5. Runs last.

## Steps
1. Merge or rebase the work from Tasks 1–5 onto the release branch; resolve any conflicts.
2. Run the full automated suite: `npm install` (if dependencies changed), `npm run lint`, and `npm test`.
3. Package the module by building distributions referenced in `module.json` (e.g., `npm run build` to update bundled assets in `dist/`).
4. Update version tags in `module.json` if they changed during integration and create a matching git tag (e.g., `git tag vX.Y.Z`).
5. Prepare release notes summarizing changes from Tasks 1–5, referencing key updates in `readme.md` and scripts.
6. Publish the module archive and manifest to the appropriate distribution channels (Foundry package repository, GitHub release, etc.).

## Validation
- Confirm all automated commands complete successfully with zero errors.
- Install the packaged module into a clean Foundry world and perform a smoke test: initialization, triggering HUD actions, running rolls, and verifying defaults load.
- Verify the published manifest URL downloads and installs the same artifact that was tested locally.
