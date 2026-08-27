## Context & Purpose
<!-- Why does this change exist? What problem or user need does it address? -->

## Proposed Changes
<!-- High-level bullet points describing what changed and key design decisions made -->
-

## Verification & Test Receipts
<!-- Commands executed and verified output. -->
- [ ] Automated tests pass: `node tests/engine.sweep.mjs`, `node tests/output-quality.sweep.mjs`, `node tests/combination-matrix.sweep.mjs`, and `node --test tests/gateHead.test.mjs`
- [ ] Verified on clean environment / worktree

## Security & Leak Prevention Checklist
- [ ] No hardcoded local machine paths (`/Users/*`, `/home/*`)
- [ ] No live API keys, tokens, or credentials in diff
- [ ] `.env` and local caches remain ignored
