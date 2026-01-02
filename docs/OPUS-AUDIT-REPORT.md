# Opus Independent Audit Report

**Date:** 2026-01-02
**Auditor:** Claude Opus 4.5
**Scope:** Full codebase audit after reconstruction from session logs

---

## Executive Summary

This audit was conducted independently of the Codex first-pass (`RECONSTRUCTION-LEDGER.md`). I deployed 6 parallel investigation agents to thoroughly examine the codebase. **The Codex findings are largely accurate**, but I've identified additional issues and some corrections.

### Critical Issues Found: 5
### High-Severity Issues: 4
### Medium-Severity Issues: 6
### Low-Severity Issues: 3

---

## Critical Issues (Must Fix Before Use)

### CRITICAL-1: ReferenceError in createVariant() - Variables Used Before Declaration

**File:** `src/core/index.ts`
**Severity:** CRITICAL - Runtime crash, causes partial variant creation

**Problem:**
```
Line 130: const brandThemeId = brandKey ? getBrandThemeId(brandKey) : null;
Line 134: notes.push(`Default theme set to ${brandThemeId}.`);
...
Line 142: const brandKey = resolveBrandKey(providerKey, brand);  // DEFINED HERE
...
Line 167: const notes: string[] = [];  // DEFINED HERE
```

`brandKey` is used 12 lines before it's declared. `notes` is used 33 lines before it's declared.

**Impact:**
- `createVariant()` crashes with `ReferenceError` immediately
- Partial variants are left on disk (e.g., `settings.json` written but no `variant.json`)
- This explains the `~/.cc-mirror/zai` partial state observed in the ledger

**Fix:** Move variable declarations before their first use. Declare `brandKey` and `notes` at the start of the function.

---

### CRITICAL-2: Placeholder API Key Written to Shell Profile

**File:** `src/core/index.ts` (line 199), `src/core/shell-env.ts` (line 65)
**Severity:** CRITICAL - Corrupts user's shell environment

**Problem:**
When `createVariant()` is called without an API key:
1. Line 124 sets `env.ANTHROPIC_API_KEY = '<API_KEY>'` (placeholder)
2. Line 199 passes this placeholder to `ensureZaiShellEnv()`
3. `ensureZaiShellEnv()` line 65 checks `opts.apiKey && opts.apiKey.trim()` - `'<API_KEY>'.trim()` is truthy
4. The placeholder is written to `~/.zshrc` or `~/.bashrc`:
   ```bash
   # cc-mirror: Z.ai env start
   export Z_AI_API_KEY="<API_KEY>"
   # cc-mirror: Z.ai env end
   ```

**Impact:** User's shell profile is corrupted with a literal placeholder string.

**Fix:** Add validation in `ensureZaiShellEnv()`:
```typescript
if (!apiKey || apiKey === '<API_KEY>') {
  return { status: 'skipped', message: 'No valid API key' };
}
```

---

### CRITICAL-3: README Claims Don't Match Code (Shell Env Detection)

**File:** `README.md` (line 144)
**Severity:** CRITICAL - Documentation misleads users

**README Claims:**
> "if `Z_AI_API_KEY` is already set, cc-mirror will detect it and skip writing"

**Actual Code Behavior:**
- Does NOT check `process.env.Z_AI_API_KEY`
- Does NOT search shell profile for existing `export Z_AI_API_KEY=...`
- ONLY checks if the cc-mirror sentinel block already exists in the file

**Impact:** Users expect their existing `Z_AI_API_KEY` to be detected, but it's not.

**Fix:** Either implement the detection logic or update README to reflect actual behavior.

---

### CRITICAL-4: Test File Corruption

**File:** `test/core.test.ts`
**Severity:** CRITICAL - Tests won't parse

**Problem:** Lines 1-2 contain directory listing artifacts:
```
core.test.ts		tui.test.ts
screens.test.ts		tweakcc-error.test.ts
```

This is tab-separated text from an `ls` command that got pasted into the file during reconstruction.

**Impact:** TypeScript parser fails, `npm run typecheck` fails.

**Fix:** Delete lines 1-2 from the file.

---

### CRITICAL-5: Non-Atomic Variant Creation

**File:** `src/core/index.ts`
**Severity:** CRITICAL - Leaves partial state on failure

**Problem:** File writes happen in this order:
1. Line 127: `settings.json` written
2. Line 165: `variant.json` written
3. Lines 176-223: tweakcc, prompt-pack, shell-env, skill-install

If any step after line 165 fails, `variant.json` exists (variant appears in `cc-mirror list`) but the variant is incomplete.

**Comparison:** `updateVariant()` writes `variant.json` LAST (line 364), which is safer.

**Fix:** Move `variant.json` write to the end of the function, after all other operations complete successfully.

---

## High-Severity Issues

### HIGH-1: Onboarding State Not Set for Non-Branded Variants

**File:** `src/core/index.ts` (lines 130-136), `src/core/claude-config.ts`
**Severity:** HIGH - Claude Code shows onboarding UI

**Problem:**
```typescript
if (!noTweak && brandThemeId) {
  ensureOnboardingState(configDir, { themeId: brandThemeId, forceTheme: true });
}
```

`ensureOnboardingState()` is ONLY called when:
1. `noTweak` is false (tweakcc enabled), AND
2. `brandThemeId` exists (variant has a brand with a theme)

Non-branded variants (or `--no-tweak` variants) never get:
- `hasCompletedOnboarding: true`
- Any theme set

**Impact:** Claude Code shows theme selection and onboarding UI for these variants.

**Fix:** Always call `ensureOnboardingState()` with fallback theme `'dark'`:
```typescript
ensureOnboardingState(configDir, {
  themeId: brandThemeId ?? 'dark',
  forceTheme: !!brandThemeId
});
```

---

### HIGH-2: create-shell-env Screen is Unreachable (Dead Code)

**File:** `src/tui/app.tsx` (lines 844-859)
**Severity:** HIGH - Dead code, user has no control

**Problem:** The `create-shell-env` screen exists but no code path ever sets `screen='create-shell-env'`.

In `create-skill-install` handler (line 821-837):
```typescript
if (providerKey === 'zai') {
  setShellEnv(true);              // FORCES TRUE
  setScreen('create-env-confirm'); // SKIPS create-shell-env
}
```

**Impact:**
- Z.ai users cannot opt out of shell env writing via TUI
- 15 lines of dead code in the codebase

**Fix:** Either:
1. Remove the dead screen code, OR
2. Wire it up: `setScreen('create-shell-env')` instead of forcing `shellEnv=true`

---

### HIGH-3: 18 Unused Files in src/tui/

**Severity:** HIGH - Confusion, maintenance burden

**Verified Unused Files (18):**
```
src/tui/components/SplashScreen.tsx
src/tui/components/screens-clean.tsx
src/tui/components/screens-new.tsx
src/tui/components/shared/AnimatedFrame.tsx
src/tui/components/shared/BigHeader.tsx
src/tui/components/shared/GradientText.tsx
src/tui/components/shared/ProgressBar.tsx
src/tui/components/shared/ProviderIcon.tsx
src/tui/components/shared/SelectBox.tsx
src/tui/components/shared/StepList.tsx
src/tui/components/shared/index.ts
src/tui/components/ui/index.ts
src/tui/constants/asciiArt.ts
src/tui/constants/gradients.ts
src/tui/hooks/useAnimation.ts
src/tui/hooks/useBrailleSpinner.ts
src/tui/hooks/useGradient.ts
src/tui/hooks/usePulse.ts
```

**Note:** The ledger listed `src/tui/constants/icons.ts` as unused, but it is actually **heavily used** (18+ imports). This is a ledger error.

**Impact:** Confusion during reconstruction, misleading contributors.

**Fix:** Delete all 18 files after confirming tests pass. Update `docs/UI-UX-OVERHAUL-PLAN.md` or archive it.

---

### HIGH-4: forceTheme Inconsistency Between create and update

**File:** `src/core/index.ts`
**Severity:** HIGH - Unexpected behavior

**Problem:**
- `createVariant()` line 133: `forceTheme: true` (always overrides theme)
- `updateVariant()` line 327: `forceTheme` not set (defaults to false)

**Impact:** If user creates variant with brand A, then updates with brand B, the original theme is kept (not updated to brand B's theme). This is likely unintentional.

**Fix:** Either both should use `forceTheme: true`, or document the intentional difference.

---

## Medium-Severity Issues

### MEDIUM-1: Soft Dead Code in screens.tsx

**File:** `src/tui/components/screens.tsx`
**Severity:** MEDIUM

Only 3 exports are used from this file:
- `InstallTypeSelect`
- `YesNoSelect`
- `EnvEditor`

Many other screen components (Home, ProviderSelect, Summary, etc.) are exported but never imported.

**Fix:** Remove unused exports or split into separate files.

---

### MEDIUM-2: Tests Not Fully Hermetic

**File:** `test/tui.test.ts`, `test/core.test.ts`
**Severity:** MEDIUM

While tests use mock objects and temp directories, there's no explicit stubbing of `process.env.Z_AI_API_KEY`. On machines where it's set, quick setup may behave differently.

**Fix:** Explicitly stub/clear relevant env vars in test setup.

---

### MEDIUM-3: TUI Test Expects Shell Env Step That Doesn't Exist

**File:** `test/tui.test.ts` (line 128)
**Severity:** MEDIUM

Comment mentions "write Z_AI_API_KEY? default Yes" step, but this screen is unreachable in the actual TUI.

**Fix:** Update test comments/expectations to match actual flow.

---

### MEDIUM-4: updateVariant Doesn't Pass apiKey to ensureZaiShellEnv

**File:** `src/core/index.ts` (line 333)
**Severity:** MEDIUM

```typescript
const shellResult = ensureZaiShellEnv({ configDir: meta.configDir });
// Note: No apiKey parameter!
```

This actually WORKS correctly (it reads from settings.json and correctly filters placeholders), but is inconsistent with createVariant's approach.

**Fix:** Consider unifying the approach for consistency.

---

### MEDIUM-5: No Default Theme Fallback

**File:** `src/core/claude-config.ts`
**Severity:** MEDIUM

When `ensureOnboardingState()` is called without a `themeId`, no theme is set at all. There's no fallback to `'dark'` as mentioned in the confirmed product decisions.

**Fix:** Add fallback: `config.theme = opts.themeId ?? 'dark';`

---

### MEDIUM-6: dist/ Contains Same Bugs as src/

**File:** `dist/cc-mirror.mjs`
**Severity:** MEDIUM

The bundled output mirrors all source bugs. It's not a reliable baseline for testing.

**Fix:** Rebuild after fixes: `npm run bundle`

---

## Low-Severity Issues

### LOW-1: UI-UX-OVERHAUL-PLAN.md Describes Unused TUI

**File:** `docs/UI-UX-OVERHAUL-PLAN.md`
**Severity:** LOW

This doc describes the cyberpunk/splash TUI that was never wired in.

**Fix:** Archive or delete after removing unused files.

---

### LOW-2: repos/ Folder Not Used by Runtime

**Folder:** `repos/`
**Severity:** LOW

Contains upstream mirrors used as reference. Not imported by src/.

**Fix:** Document its purpose or move to a separate location.

---

### LOW-3: Inconsistent Error Message Formatting

**File:** Various
**Severity:** LOW

Some errors return objects, some throw exceptions, some return strings.

**Fix:** Standardize error handling pattern.

---

## Verification Checklist

### Automated (run after fixes)
```bash
npm run typecheck   # Should pass
npm test            # Should pass (36 tests)
npm run bundle      # Rebuild dist/
```

### Manual Smoke Tests
1. Create temp variant: `npm run dev -- quick --provider zai --api-key test123 --name test-zai`
2. Verify `~/.cc-mirror/test-zai/variant.json` exists
3. Verify `cc-mirror list` shows the variant
4. Verify `~/.cc-mirror/test-zai/config/.claude.json` has:
   - `hasCompletedOnboarding: true`
   - `theme: "zai-carbon"` (or appropriate brand theme)
5. Clean up: `npm run dev -- remove test-zai`

### Z.ai Shell Env Specific
1. Create variant WITHOUT setting `Z_AI_API_KEY` env var first
2. Verify `~/.zshrc` or `~/.bashrc` does NOT contain `<API_KEY>` placeholder
3. Create variant WITH valid API key
4. Verify shell profile has correct export

---

## Recommended Fix Sequence

### Phase 1: Critical Fixes (Must Do First)
1. Fix `test/core.test.ts` corruption (delete lines 1-2)
2. Fix `createVariant()` variable declaration order
3. Fix placeholder API key validation in `ensureZaiShellEnv()`
4. Move `variant.json` write to end of `createVariant()`

### Phase 2: Onboarding Fixes
5. Always call `ensureOnboardingState()` with fallback theme
6. Ensure non-branded variants get `hasCompletedOnboarding: true`

### Phase 3: Shell Env Policy
7. Decide: detect existing `Z_AI_API_KEY` or not?
8. Update README to match actual behavior
9. Wire up `create-shell-env` screen OR remove it

### Phase 4: Cleanup
10. Delete 18 unused TUI files
11. Remove unused exports from `screens.tsx`
12. Archive or update `UI-UX-OVERHAUL-PLAN.md`

### Phase 5: Verification
13. Run `npm run typecheck`
14. Run `npm test`
15. Run `npm run bundle`
16. Manual smoke test

---

## Differences from Codex Ledger

| Item | Ledger Says | Opus Audit Finds |
|------|-------------|------------------|
| icons.ts unused | Listed as unused | **FALSE** - Heavily used (18+ imports) |
| Unused file count | 19 files | 18 files (icons.ts is used) |
| create-shell-env | "unreachable" | Confirmed unreachable + analyzed WHY |
| Placeholder risk | Not mentioned | **CRITICAL** - Can write `<API_KEY>` to shell profile |
| Test corruption | "junk lines" | Confirmed - directory listing artifacts |

---

## Appendix: Complete Screen State Machine

```
home
├── quick-provider → quick-api-key → quick-name → create-running → create-done
├── create-provider → create-brand → create-name → create-base-url → create-api-key
│   → create-root → create-bin → create-npm-package
│   → create-tweak → [create-prompt-pack → create-prompt-pack-mode]
│   → create-skill-install → [create-shell-env: DEAD] → create-env-confirm
│   → [create-env-add] → create-summary → create-running → create-done
├── manage → manage-actions → [manage-update|manage-tweak|manage-remove] → *-done
├── settings-root → settings-bin
├── updateAll → updateAll-done
├── doctor
└── exit
```

ESC key handling: All 36 reachable screens have proper ESC navigation.

---

*End of Opus Independent Audit Report*
