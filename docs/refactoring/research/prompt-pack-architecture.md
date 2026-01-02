# Prompt Pack Architecture Research

## Current Architecture Analysis

### Overview

The current prompt pack system has two main components:
1. **Provider-specific overlays** (zai.ts, minimax.ts) - Tool routing, MCP configuration
2. **Shared maximal overlays** (overlays.ts) - Enhanced thinking, planning, summarization

### Current Flow

```
applyPromptPack(tweakDir, providerKey, mode)
    ↓
isPromptPackKey(providerKey) → only 'zai' | 'minimax' return true
    ↓
resolveOverlays(provider, mode)
    ↓
buildProviderOverlays() → provider-specific tool routing
    ↓
if mode === 'maximal':
    mergeOverlays(base, buildMaximalOverlays())
    ↓
sanitizeOverlayMap() → strip backticks for tweakcc safety
    ↓
applyOverlays() → inject into system-prompts/*.md files
```

### Current Structure

```
src/core/prompt-pack/
├── prompt-pack.ts          # Main entry point
├── types.ts                # Type definitions
├── targets.ts              # File targets for overlays
├── overlays.ts             # Maximal mode overlays + provider resolution
├── shared.ts               # Shared prompt fragments
├── sanitize.ts             # Backtick stripping
└── providers/
    ├── zai.ts              # Z.ai tool routing + zai-cli docs
    └── minimax.ts          # MiniMax MCP tool routing
```

### Current Prompt Pack Modes

| Mode | Provider Overlays | Maximal Overlays |
|------|-------------------|------------------|
| `minimal` | Yes | No |
| `maximal` | Yes | Yes |

### What Each Mode Contains

#### Minimal Mode (Provider-Specific Only)

**Z.ai (`zai.ts`):**
- `main`: Full contract with auth, tool routing, zai-cli docs, blocked MCP tools
- `mcpCli`: MCP policy warning
- `taskAgent`: Subagent guidance + tool routing excerpt
- `bash`: zai-cli command reference
- `webfetch`: Prefer zai-cli read
- `websearch`: Prefer zai-cli search
- `mcpsearch`: Block Z.ai MCP tools warning

**MiniMax (`minimax.ts`):**
- `main`: Full contract with auth, MCP tool routing
- `mcpCli`: MiniMax MCP server info
- `taskAgent`: Subagent guidance
- `webfetch`: Use for single-page only
- `websearch`: Redirect to MiniMax MCP
- `mcpsearch`: MiniMax tool loading instructions

#### Maximal Mode (Adds These)

From `overlays.ts`:
- `explore`: Wide-before-deep mode guidance
- `planEnhanced`: Options/tradeoffs/risks structure
- `planReminder`: Plan mode behavior reminders
- `planReminderSub`: Same for subagents
- `taskTool`: Parallelize with Task tool
- `enterPlan`: Enter plan mode early guidance
- `exitPlan`: Crisp plan output structure
- `skill`: Use skills for domain knowledge
- `conversationSummary`: Capture decisions/constraints
- `conversationSummaryExtended`: Same
- `webfetchSummary`: Extract key facts

From `shared.ts` (used by both):
- `verbositySpec`: Output length guidelines
- `operatingSpec`: Senior engineer behavior
- `subjectiveWorkSpec`: Ask before creative work

---

## Problem Analysis

### Issue 1: Maximal Overlays Only Available for Zai/MiniMax

The maximal overlays contain **provider-agnostic** improvements:
- Better planning structure
- Enhanced exploration mode
- Task parallelization hints
- Summary quality improvements
- Subjective work guardrails

These would benefit ALL providers, but currently gated behind `isPromptPackKey()` which only returns `true` for `zai` and `minimax`.

### Issue 2: Mode Names Are Confusing

- `minimal` implies "less good" when it really means "tool routing only"
- `maximal` conflates two concerns: provider tools + enhanced behavior

### Issue 3: No Option for "Just the Good Stuff"

Users of OpenRouter/LiteLLM who want the enhanced thinking/planning prompts have no way to get them.

---

## Proposed Architecture

### New Prompt Pack Structure

```
src/core/prompt-pack/
├── prompt-pack.ts          # Main entry point (updated)
├── types.ts                # Type definitions (updated)
├── targets.ts              # File targets (unchanged)
├── sanitize.ts             # Backtick stripping (unchanged)
├── core/                   # NEW: Provider-agnostic enhancements
│   ├── index.ts            # Core overlay builder
│   ├── planning.ts         # Enhanced planning prompts
│   ├── exploration.ts      # Explore mode improvements
│   ├── quality.ts          # Code quality, summaries
│   └── behavior.ts         # Operating specs, subjective work
└── providers/
    ├── index.ts            # Provider overlay resolution
    ├── zai.ts              # Z.ai tool routing (unchanged)
    ├── minimax.ts          # MiniMax tool routing (unchanged)
    └── generic.ts          # NEW: Generic provider hints
```

### New Prompt Pack Modes

| Mode | Core Enhancements | Provider Tools | Available For |
|------|-------------------|----------------|---------------|
| `off` | No | No | All |
| `core` | Yes | No | All |
| `standard` | Yes | Generic hints | All |
| `full` | Yes | Full routing | zai, minimax |

### Type Changes

```typescript
// Current
export type PromptPackKey = 'zai' | 'minimax';
export type PromptPackMode = 'minimal' | 'maximal';

// Proposed
export type PromptPackProvider = 'zai' | 'minimax' | 'openrouter' | 'litellm' | 'generic';
export type PromptPackMode = 'off' | 'core' | 'standard' | 'full';
```

### Core Enhancements (Provider-Agnostic)

These would be extracted from current `overlays.ts` and `shared.ts`:

**planning.ts:**
```typescript
export const planEnhancedOverlay = `
<system_reminder>
- Provide 2-3 viable options with tradeoffs.
- Include risks, unknowns, and a validation checklist.
- Output structure: Overview, Options, Recommendation, Steps, Verification, Risks.
</system_reminder>
`.trim();

export const planReminderOverlay = `...`;
export const enterPlanOverlay = `...`;
export const exitPlanOverlay = `...`;
```

**exploration.ts:**
```typescript
export const exploreOverlay = `
<system_reminder>
- You are in Explore mode: go wide before deep.
- Use tools early to validate assumptions and reduce guesswork.
- Output: Findings (bullets), Risks/unknowns, Next steps.
</system_reminder>
`.trim();
```

**quality.ts:**
```typescript
export const conversationSummaryOverlay = `...`;
export const webfetchSummaryOverlay = `...`;
```

**behavior.ts:**
```typescript
export const verbositySpec = `...`;
export const operatingSpec = (mode: string) => `...`;
export const subjectiveWorkSpec = `...`;
```

### Generic Provider Hints

For OpenRouter/LiteLLM users who want some guidance without full tool routing:

**generic.ts:**
```typescript
export const buildGenericOverlays = (): OverlayMap => ({
  main: `
<explicit_guidance>
Provider: Custom/Local

<tool_routing>
- Use standard Claude Code tools (WebSearch, WebFetch, Bash, etc.)
- No provider-specific MCP tools configured
- For web search: Use WebSearch tool
- For URL reading: Use WebFetch tool
- For images: Read tool supports common formats
</tool_routing>

${operatingSpec('core')}
${subjectiveWorkSpec}
${verbositySpec}
</explicit_guidance>
  `.trim(),
  taskAgent: `
<explicit_guidance>
You are a Task subagent. Stay within requested scope, but be proactive about missing prerequisites.
Verify key claims with tools when possible; cite file paths and command outputs.
</explicit_guidance>

${verbositySpec}
  `.trim(),
});
```

### New Resolution Logic

```typescript
export const applyPromptPack = (
  tweakDir: string,
  providerKey: string,
  mode: PromptPackMode = 'off'
): PromptPackResult => {
  if (mode === 'off') {
    return { changed: false, updated: [], mode };
  }

  let overlays: OverlayMap = {};

  // Always apply core enhancements for non-off modes
  if (mode !== 'off') {
    overlays = buildCoreOverlays();
  }

  // Add provider-specific overlays
  if (mode === 'standard' || mode === 'full') {
    const providerOverlays = resolveProviderOverlays(providerKey, mode);
    overlays = mergeOverlays(overlays, providerOverlays);
  }

  // Apply to files
  const systemPromptsDir = path.join(tweakDir, 'system-prompts');
  const updated = applyOverlays(systemPromptsDir, overlays);

  return { changed: updated.length > 0, updated, mode };
};

const resolveProviderOverlays = (
  providerKey: string,
  mode: PromptPackMode
): OverlayMap => {
  switch (providerKey) {
    case 'zai':
      return buildZaiOverlays(mode === 'full' ? 'full' : 'standard');
    case 'minimax':
      return buildMinimaxOverlays(mode === 'full' ? 'full' : 'standard');
    default:
      return buildGenericOverlays();
  }
};
```

---

## Migration Strategy

### Phase 1: Add Core Without Breaking Changes

1. Create `core/` folder with extracted overlays
2. Add `buildCoreOverlays()` function
3. Keep existing modes working as-is
4. Add internal alias: `minimal` → `standard`, `maximal` → `full`

### Phase 2: Extend to All Providers

1. Update `isPromptPackKey()` to always return true (or remove)
2. Add `generic.ts` provider
3. Enable core overlays for openrouter/litellm

### Phase 3: Update UI/CLI

1. Add new mode options to TUI
2. Update CLI flags
3. Update help text and documentation
4. Deprecate old mode names with warnings

### Phase 4: Full Migration

1. Remove deprecated mode aliases
2. Update all documentation
3. Add migration notes to CHANGELOG

---

## UI Changes Required

### TUI Prompt Pack Screen

**Current:**
```
Prompt pack mode
├── Minimal
└── Maximal (recommended)
```

**Proposed:**
```
Prompt pack mode
├── Off - No modifications
├── Core - Enhanced thinking & planning (all providers)
├── Standard - Core + provider hints (all providers)
└── Full - Core + full tool routing (Z.ai/MiniMax only)
```

### Provider-Specific Availability

| Provider | Off | Core | Standard | Full |
|----------|-----|------|----------|------|
| Z.ai | Yes | Yes | Yes | Yes (recommended) |
| MiniMax | Yes | Yes | Yes | Yes (recommended) |
| OpenRouter | Yes | Yes | Yes (recommended) | No |
| LiteLLM | Yes | Yes | Yes (recommended) | No |

---

## Implementation Checklist

### Code Changes

- [ ] Create `src/core/prompt-pack/core/` folder
- [ ] Extract planning overlays to `core/planning.ts`
- [ ] Extract exploration overlays to `core/exploration.ts`
- [ ] Extract quality overlays to `core/quality.ts`
- [ ] Extract behavior specs to `core/behavior.ts`
- [ ] Create `core/index.ts` with `buildCoreOverlays()`
- [ ] Create `providers/generic.ts`
- [ ] Update `types.ts` with new types
- [ ] Update `prompt-pack.ts` main logic
- [ ] Add backward compatibility aliases
- [ ] Update provider overlay builders

### UI/CLI Changes

- [ ] Update TUI prompt pack screen
- [ ] Update CLI `--prompt-pack-mode` options
- [ ] Update help text
- [ ] Add deprecation warnings for old modes

### Documentation

- [ ] Update README prompt pack section
- [ ] Add migration guide
- [ ] Update DESIGN.md
- [ ] Add inline code comments

### Testing

- [ ] Test all mode combinations
- [ ] Test each provider with each mode
- [ ] Test backward compatibility
- [ ] Test file application

---

## Open Questions

1. **Mode naming**: Are `off`/`core`/`standard`/`full` the right names?
   - Alternatives: `none`/`basic`/`enhanced`/`complete`
   - Or: `disabled`/`thinking`/`routing`/`maximal`

2. **Default mode per provider**:
   - Z.ai/MiniMax: `full` (current behavior)
   - OpenRouter/LiteLLM: `standard` or `core`?

3. **Backward compatibility period**:
   - How long to support `minimal`/`maximal` aliases?
   - Show deprecation warning immediately or silently map?

4. **Generic provider content**:
   - How much guidance should generic overlays include?
   - Should we detect capabilities (WebSearch available?) and adjust?

---

*Research completed: 2026-01-02*
