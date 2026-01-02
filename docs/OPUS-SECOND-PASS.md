# Opus Second Pass Request (cc-mirror reconstruction)

Date: 2026-01-02

This repo (`cc-mirror`) was accidentally deleted and reconstructed from session history. We need an independent, methodical “second pass” review to catch missing wiring, unintended regressions, and cleanup risks.

Primary ledger (ground truth): `docs/RECONSTRUCTION-LEDGER.md`

## Confirmed product decisions
- Keep the **current clean TUI** (`src/tui/screens/*` + `src/tui/components/ui/*`). The old cyberpunk/splash work should be removed once safe.
- Default Claude Code theme should be set to `dark` when no brand preset is applied.
- For Z.ai only: write `Z_AI_API_KEY` into shell rc files **only if it is not already present** in the user’s shell profile.

## Known breakages (must validate)
1) **createVariant runtime crash**: `src/core/index.ts` references `brandKey` and `notes` before initialization (see ledger). This can leave partial variants on disk (e.g. missing `variant.json`).
2) **Onboarding/theme skip not deterministic**: `.claude.json` onboarding state is only seeded when a brand theme exists; default theme missing causes Claude Code to still show theme onboarding.
3) **TUI flow mismatch**: the `create-shell-env` screen exists but is unreachable; advanced flow can’t opt out, and tests drifted.
4) **Shell env mismatch vs README**: code currently writes a `cc-mirror` block regardless of whether `Z_AI_API_KEY` already exists in shell profile.
5) **Tests corrupted / non-hermetic**: `test/core.test.ts` has junk lines; some tests depend on real `process.env.Z_AI_API_KEY`.

## Cleanup candidates (validate they’re truly removable)
There are 19 unused/unreachable files under `src/tui/` (cyberpunk/splash prototype + hooks/constants). They are listed in the ledger under “Unused/unreachable files (19)”.

Please confirm:
- nothing in `src/` imports them
- nothing in `scripts/` or test harness imports them
- `dist/tui.mjs` does not include them (after rebuild)

## What I want you (Opus) to do
1) Read `DESIGN.md`, `README.md`, and `docs/RECONSTRUCTION-LEDGER.md` and sanity-check that current code matches the intended architecture.
2) Audit the create/update pipeline end-to-end for missing or misordered steps:
   - settings.json env building
   - API-key approval token in `.claude.json`
   - onboarding state + default theme in `.claude.json`
   - tweakcc config writing/merging
   - prompt-pack injection + re-apply
   - skill installation
   - Z.ai MCP deny list
   - Z.ai shell env policy (“only if not already present in profile”)
3) Identify any other “reconstruction artifacts” (e.g., junk lines in code, dead screens, orphaned docs).
4) Produce a written report + recommended patch plan:
   - concrete issues (file + symptom)
   - minimal fix sequence
   - how to verify (tests + manual steps)
   - any deletion plan (safe removals + required doc updates)

## Notes / nuances
- Wrapper splash ASCII art is implemented in `src/core/wrapper.ts` and only prints when stdout is a TTY and `CC_MIRROR_SPLASH != 0`. If you evaluate splash behavior, account for that.
- The bundle output in `dist/` currently mirrors source bugs; it is not a reliable baseline.

