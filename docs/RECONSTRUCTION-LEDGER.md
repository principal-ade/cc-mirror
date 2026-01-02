# cc-mirror Reconstruction Ledger

Last updated: 2026-01-02

This is a living, ground-truth notes doc for restoring cc-mirror after the repo was accidentally deleted and reconstructed from session history. The goal is to (1) understand the current state precisely, (2) identify gaps and unused/miswired code, and (3) define a concrete, safe repair plan.

---

## What cc-mirror is (project intent)

cc-mirror creates **multiple isolated Claude Code variants**, each with its own:
- `CLAUDE_CONFIG_DIR` (global/session storage + `.claude.json` approvals)
- `settings.json` env overrides (provider base URL, API key, model mapping, etc.)
- optional tweakcc “brand preset” skin and prompt-pack overlays
- wrapper script installed into a bin dir (usually `~/.local/bin/<variant>`)

Design source: `DESIGN.md`.

---

## Current observed repo state (high-level)

### Entrypoints / build output
- CLI entrypoint: `src/cli/index.ts`
- TUI entrypoint: `src/tui/index.tsx` → `src/tui/app.tsx`
- Bundled outputs: `dist/cc-mirror.mjs` and `dist/tui.mjs` via `scripts/bundle.ts`
- `dist/cc-mirror.mjs` currently includes the same runtime bugs as `src/` (it’s not a clean “known-good” baseline).

### Tests / typecheck (current)
- `npm test` currently fails (3 failing tests).
- `npm run typecheck` currently fails due to a corrupted test file.

Details are in “Breakages found” below.

---

## Decisions confirmed (2026-01-02)

These are product decisions confirmed by the maintainer during reconstruction:

1) **TUI**: keep the current “clean” TUI (`src/tui/screens/*` + `src/tui/components/ui/*`). The older cyberpunk/splash implementation can be removed once we’re confident nothing depends on it.
2) **Default theme**: default to `dark` when no brand preset is applied.
3) **Z.ai shell env**: only write `Z_AI_API_KEY` into shell profiles if the user does not already have it set there.
   - We still need to clarify/update behavior for “cc-mirror-managed block already exists” vs “user-defined export already exists”.
4) **OpenRouter + Local LLMs**: first-class providers (not experimental), using `ANTHROPIC_AUTH_TOKEN`.
5) **Model mapping**: OpenRouter/Local LLMs require explicit model alias mapping (`ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`) in quick/advanced flows.
6) **Local auth placeholder**: Local LLMs may run without real auth; cc-mirror injects a placeholder token (`local-llm`) so Claude Code starts without throwing.

---

## Current observed local variant state (outside repo)

I inspected `~/.cc-mirror/` to understand what the reconstructed tool has produced on disk.

### `~/.cc-mirror/minimax` looks complete
- Has `variant.json`, `config/`, `tweakcc/`, `npm/`, etc.
- `~/.cc-mirror/minimax/config/.claude.json` includes:
  - `customApiKeyResponses.approved` (API key tail approval)
  - `hasCompletedOnboarding: true`
  - `theme: "minimax-pulse"`
  - `lastOnboardingVersion: "2.0.76"`

### `~/.cc-mirror/zai` is inconsistent / partially created
- Missing `variant.json` entirely (so it does not show up in `cc-mirror list`).
- Has `config/settings.json` + `config/.claude.json` + `npm/…` but no `tweakcc/` directory.
- `~/.cc-mirror/zai/config/.claude.json` currently contains ONLY `customApiKeyResponses`, and **does not** include `theme` or `hasCompletedOnboarding`.

This “partial variant” outcome is explained by a runtime error in `createVariant()` (see below).

---

## Breakages found (grounded, concrete)

### Opus second-pass (critical list)

Opus independently flagged the following (all verified):

| # | Issue | Status | Location |
|---|-------|--------|----------|
| 1 | `brandKey` used before declaration | Verified | `src/core/index.ts` |
| 2 | `notes` used before declaration | Verified | `src/core/index.ts` |
| 3 | Placeholder `<API_KEY>` can be written to shell profile | Verified | `src/core/shell-env.ts` |
| 4 | `test/core.test.ts` corrupted (lines 1–2 junk) | Verified | `test/core.test.ts` |
| 5 | Non‑atomic variant creation (`variant.json` written mid‑flow) | Verified | `src/core/index.ts` |

Notes:
- (1), (2), and (4) were already captured in this ledger.
- (3) is now captured under shell‑env risk below.
- (5) is expanded below as its own issue.

### 1) Critical runtime bug in variant creation
File: `src/core/index.ts`

In `createVariant()`, `brandKey` and `notes` are referenced before initialization:
- `const brandThemeId = brandKey ? …` occurs before `const brandKey = resolveBrandKey(…)` (`src/core/index.ts:130` vs `src/core/index.ts:142`)
- `notes.push(…)` occurs before `const notes: string[] = []` (`src/core/index.ts:134` vs `src/core/index.ts:167`)

This will throw a `ReferenceError` at runtime and can leave partially-created variants on disk (exactly what `~/.cc-mirror/zai` looks like).

The same bug exists in the shipped bundle: `dist/cc-mirror.mjs` around the `createVariant()` logic.

### 1b) Non‑atomic variant creation (`variant.json` written mid‑flow)
File: `src/core/index.ts`

`variant.json` is written before the rest of the create flow finishes. If tweakcc/prompt‑pack/shell‑env/skills fail (or the `brandKey`/`notes` crash), a variant can be left half‑created but still appear in `cc-mirror list`. This should be moved to the end of `createVariant()` so only successful creations are listed.

### 2) Onboarding/theme skipping is not guaranteed
File: `src/core/claude-config.ts`

`ensureOnboardingState(configDir, opts)`:
- always sets `hasCompletedOnboarding = true`
- only sets `theme` when `opts.themeId` is provided

Call sites:
- `createVariant()` currently only calls `ensureOnboardingState()` when a brand theme exists **and** tweakcc is enabled (`!noTweak && brandThemeId`).
- `updateVariant()` does the same.

Impact:
- Non-branded variants (or `--no-tweak`) will not get a theme value written into `.claude.json`, so Claude Code can still show theme/onboarding UI.
- In the current on-disk Z.ai config, `.claude.json` has neither theme nor onboarding-complete, so it will definitely prompt.

### 3) TUI flow mismatch: “shell env” step exists but is unreachable
File: `src/tui/app.tsx`

There is a `create-shell-env` screen, but no code path sets `screen` to `'create-shell-env'`.

Instead:
- In `create-skill-install`, Z.ai forces `shellEnv=true` and jumps directly to `create-env-confirm`.

Impact:
- Advanced flow can’t opt out of writing shell env (contradicts text in docs/UI screenshot and tests).
- This is one of the reasons `test/tui.test.ts` is currently out of sync.

### 4) Shell env behavior doesn’t match README and can do the wrong thing
Files: `src/core/shell-env.ts`, `README.md`

README claims:
- “if `Z_AI_API_KEY` is already set, cc-mirror will detect it and skip writing.”

Current code:
- `ensureZaiShellEnv()` never checks `process.env.Z_AI_API_KEY`.
- It reads from variant `settings.json` (or passed-in apiKey) and writes a `cc-mirror` block into `~/.zshrc` or `~/.bashrc`.

Risk:
- `createVariant()` forces `ANTHROPIC_API_KEY` to `'<API_KEY>'` when missing (`src/core/index.ts:123-125`).
- `ensureZaiShellEnv()` currently does not filter out the `'<API_KEY>'` placeholder when an explicit `apiKey` is passed (it uses `(opts.apiKey && opts.apiKey.trim()) || …`, `src/core/shell-env.ts:65`).
- That means non-interactive flows can accidentally write a placeholder key into the user’s shell rc file.

### 5) Tests are currently broken (reconstruction artifacts)
- `test/core.test.ts` is corrupted: first two lines are junk “ls output” and break parsing.
- Some TUI tests assume no `Z_AI_API_KEY` in the environment; on machines where it *is* set, quick setup legitimately skips the API-key screen and the test fails. This indicates tests are not hermetic and need to stub env.
- `test/tui.test.ts` expects a “write Z_AI_API_KEY?” step in the advanced flow, but current TUI never reaches that screen.

---

## Used vs unused code (what’s actually reachable)

I built a simple import graph from the real entrypoints:
- `src/cli/index.ts`
- `src/tui/index.tsx`

Result:
- Total TS/TSX under `src/`: 69
- Reachable: 50
- Unused/unreachable files: 19

### Removed cyberpunk TUI files (cleanup complete)
These files were unused and have now been removed (2026‑01‑02). The list is kept for audit history:
- `src/tui/components/SplashScreen.tsx`
- `src/tui/components/screens-clean.tsx`
- `src/tui/components/screens-new.tsx`
- `src/tui/components/shared/AnimatedFrame.tsx`
- `src/tui/components/shared/BigHeader.tsx`
- `src/tui/components/shared/GradientText.tsx`
- `src/tui/components/shared/ProgressBar.tsx`
- `src/tui/components/shared/ProviderIcon.tsx`
- `src/tui/components/shared/SelectBox.tsx`
- `src/tui/components/shared/StepList.tsx`
- `src/tui/components/shared/index.ts`
- `src/tui/components/ui/index.ts`
- `src/tui/constants/asciiArt.ts`
- `src/tui/constants/gradients.ts`
- `src/tui/constants/icons.ts`
- `src/tui/hooks/useAnimation.ts`
- `src/tui/hooks/useBrailleSpinner.ts`
- `src/tui/hooks/useGradient.ts`
- `src/tui/hooks/usePulse.ts`

### Are these incorrectly unused?
Not random: these files match the “cyberpunk TUI overhaul” plan doc:
- `docs/UI-UX-OVERHAUL-PLAN.md` explicitly lists `SplashScreen.tsx`, `constants/*`, `hooks/*`, and `components/shared/*` as the intended new TUI structure.

So they’re “unused” because the repo currently ships a **different TUI implementation**:
- The current active UI is `src/tui/screens/*` + `src/tui/components/ui/*` + some legacy components in `src/tui/components/screens.tsx`.

Clarification (Opus disagreement):
- `src/tui/constants/icons.ts` was imported **only** by the cyberpunk files above (SplashScreen/screens-new/shared/hooks). It was not imported by the live TUI.

### Additional “soft dead code” (reachable file but largely unused exports)
File: `src/tui/components/screens.tsx`

`src/tui/app.tsx` imports only:
- `InstallTypeSelect`
- `YesNoSelect`
- `EnvEditor`

But `src/tui/components/screens.tsx` also exports many other screen components (Home, ProviderSelect, Summary, etc.) that are no longer used by the current TUI.

This is not “unreachable”, but it increases confusion and makes reconstruction harder.

### Vendor/reference data (not used by runtime)
Folder: `repos/`

`repos/` contains upstream mirrors (e.g., tweakcc) used as reference material for docs/prompt-pack work. The runtime code under `src/` does not import from `repos/` (no references found), so treat `repos/` as vendor data unless we intentionally re-wire tooling to depend on it.

---

## Documentation mismatches / drift

### README vs code: shell env “skip when already set”
- README says skip writing when `Z_AI_API_KEY` already exists.
- Code always writes when the feature is enabled and the key is present in `settings.json`.

### UI-UX-OVERHAUL-PLAN vs shipped TUI
- The overhaul plan described a splash + shared cyberpunk component library.
- We’ve chosen the clean UI as source of truth and removed the cyberpunk files + `docs/UI-UX-OVERHAUL-PLAN.md`.

---

## Configuration flow audit (source → effect)

This is a quick mapping of how inputs propagate; use it as a checklist during fixes.

### CLI inputs (`src/cli/index.ts`)
- `--provider` / prompt → `providerKey` → `getProvider()` → `buildEnv()` → `settings.json`
- `--base-url` → `baseUrl` → `buildEnv()` → `settings.json`
- `--api-key` (or env) → `apiKey` → `buildEnv()` → `settings.json` + `.claude.json` approval token
- `--brand` → `brand` → `resolveBrandKey()` → tweakcc config (`tweakcc/config.json`)
- `--env` / `--timeout-ms` → `extraEnv` → `buildEnv()` → `settings.json`
- `--root` / `--bin-dir` → `rootDir` / `binDir` → directory creation + wrapper path + `variant.json`
- `--npm-package` → npm install path + `variant.json` (version pinned to 2.0.76)
- `--no-tweak` → `noTweak` → skip tweakcc + skip prompt-pack application
- `--no-prompt-pack` / `--prompt-pack-mode` → prompt-pack overlay in tweakcc prompt fragments
- `--no-skill-install` / `--skill-update` → dev-browser skill install behavior
- `--shell-env` / `--no-shell-env` → Z.ai shell profile write decision

### TUI inputs (`src/tui/app.tsx`)
- Provider selection → `providerKey`, `baseUrl`, defaults (prompt pack, skill install, shell env)
- API key screen (or env auto-detect) → `apiKey` (and `apiKeyDetectedFrom`)
- Brand preset → `brandKey`
- NPM package (version pinned) → install flow
- tweakcc / prompt-pack / skill / shell-env toggles → `createVariant()` options
- Summary → create run; completion screen should surface `result.notes`

### Core processing (`src/core/index.ts`)
- `buildEnv()` creates `settings.json` env map
- `ensureApiKeyApproval()` writes `.claude.json` approval token
- `ensureOnboardingState()` should write `hasCompletedOnboarding` + default theme
- `ensureTweakccConfig()` writes brand theme + default themes into `tweakcc/config.json`
- `runTweakcc()` applies config + prompt-pack overlays
- `ensureZaiMcpDeny()` writes deny list for Z.ai MCP tools
- `ensureZaiShellEnv()` writes shell rc block (Z.ai only, policy-dependent)
- `ensureDevBrowserSkill()` installs `dev-browser` under `config/skills`
- `writeWrapper()` emits the wrapper that sets `CLAUDE_CONFIG_DIR` and loads `settings.json`

---

## UX / behavior gaps to verify (reported by maintainer)

These are not fully root-caused yet, but are likely tied to the breakages above:

1) **TUI completion summary missing details**: the create/update flows should show “everything it changed” (notes). The TUI already attempts to display `result.notes` (see `src/tui/app.tsx`), but `createVariant()` currently throws before notes are safely built and returned.
2) **Provider ASCII art splash not showing**: the per-provider ASCII splash is implemented in the wrapper (`src/core/wrapper.ts`) and only prints when:
   - stdout is a TTY (`-t 1`)
   - `CC_MIRROR_SPLASH != 0`
   - args do not include `--output-format`
   If any of those are false (e.g., launched from a non-TTY integration), it won’t show.
3) **Configurator confidence**: we need to re-audit the create/update pipeline end-to-end once `createVariant()` is fixed:
   - settings.json env (`src/providers/index.ts`)
   - `.claude.json` API-key approvals + onboarding state (`src/core/claude-config.ts`)
   - tweakcc config creation/merge (`src/core/tweakcc.ts`)
   - prompt-pack overlays (`src/core/prompt-pack.ts`)
   - skill install (`src/core/skills.ts`)
   - Z.ai MCP deny list (`src/core/claude-config.ts`)
   - shell env writing policy (`src/core/shell-env.ts`)

4) **“Z_AI_API_KEY detected” messaging missing**: the detection banner only appears on the API-key screen (`src/tui/screens/ApiKeyScreen.tsx`). When Z.ai auto-detects `Z_AI_API_KEY`, the flow skips that screen, so the user never sees the notice. We should surface it elsewhere (summary and/or provider step).

---

## Repair plan (proposed sequence)

### Phase 0 — prune old TUI (completed)
- Kept the current clean TUI.
- Removed the cyberpunk/splash prototype files and deleted `docs/UI-UX-OVERHAUL-PLAN.md` after tests passed.

### Phase 1 — restore correctness (must-do)
- Fix the `createVariant()` runtime bug so variants are created atomically and `variant.json` always exists.
- Rebuild `dist/cc-mirror.mjs` after code fixes (`npm run bundle`).

### Phase 2 — make onboarding skip deterministic
- Ensure every created/updated variant writes a consistent `.claude.json` onboarding state:
  - Always set `hasCompletedOnboarding: true`
  - Always set a `theme`:
    - Use the brand’s theme id when a brand is active
    - Otherwise use `dark` (decision: 2026-01-02)

### Phase 3 — reconcile Z.ai shell env policy + safety
- Implement desired policy:
  - Only write to shell profiles if `Z_AI_API_KEY` is not already present in the user’s shell profile.
- Ensure we never write placeholder values (e.g. `'<API_KEY>'`) into shell rc files.
- Align CLI + TUI prompts and README text with the chosen policy.

### Phase 4 — repair tests to become trustworthy again
- Remove the junk lines in `test/core.test.ts`.
- Make tests hermetic with respect to real env vars (don’t depend on `Z_AI_API_KEY`).
- Update TUI tests to match the final chosen wizard flow (especially shell env step).

### Phase 5 — cleanup unused code (completed)
- Cyberpunk files removed and docs updated.

---

## Verification checklist (manual + automated)

Automated:
- `npm run typecheck`
- `npm test`

Manual smoke tests (safe, no secrets in shell history):
- Create a temp variant with a dummy key and confirm it writes `variant.json` and wrapper.
- Confirm `cc-mirror list` shows the created variant (i.e., it has `variant.json`).
- Confirm Claude Code no longer asks for:
  - API-key approval (OAuth/login screen)
  - theme selection

Z.ai-specific:
- Verify `Z_AI_API_KEY` handling matches the chosen policy.
- Verify the wrapper’s env loading includes both `ANTHROPIC_API_KEY` and `Z_AI_API_KEY` (when intended).

---

## Open questions (remaining)

None currently. Shell profile policy resolved: treat any non-placeholder `Z_AI_API_KEY` in environment or shell profile as valid and skip writing.
