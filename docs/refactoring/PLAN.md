# CC-Mirror Refactoring Plan

> Comprehensive improvement plan for cc-mirror UX, provider support, and architecture.

## Table of Contents

1. [Provider Improvements](#1-provider-improvements)
2. [Prompt Pack Architecture Refactor](#2-prompt-pack-architecture-refactor)
3. [UX Improvements](#3-ux-improvements)
4. [Documentation](#4-documentation)
5. [Code Quality](#5-code-quality)
6. [Implementation Phases](#6-implementation-phases)

---

## 1. Provider Improvements

### 1.1 Rename "Local LLMs" to "LiteLLM"

**Status:** Planned

**Rationale:** The current "Local LLMs" name is misleading. The default configuration (`http://localhost:4000/anthropic`) is specifically designed for LiteLLM's Anthropic proxy mode. Most local inference servers (Ollama, vLLM, LM Studio) use OpenAI-compatible APIs, not Anthropic.

**Changes Required:**
- [ ] Rename provider key from `local` to `litellm` in `src/providers/index.ts`
- [ ] Update label from "Local LLMs" to "LiteLLM"
- [ ] Update description to explain LiteLLM's role
- [ ] Update ASCII art in `src/core/wrapper.ts`
- [ ] Update brand preset in `src/brands/local.ts` → `litellm.ts`
- [ ] Add documentation links to API key screen
- [ ] Update README.md
- [ ] Update help text

**Documentation Links to Add:**
- LiteLLM GitHub: https://github.com/BerriAI/litellm
- LiteLLM Anthropic Proxy Docs: https://docs.litellm.ai/docs/providers/anthropic
- LiteLLM Quick Start: https://docs.litellm.ai/docs/

**Research File:** `research/litellm.md`

---

### 1.2 Add LM Studio Provider

**Status:** Research Required

**Rationale:** LM Studio is extremely popular for local LLM inference on desktop. If it has Anthropic API compatibility (or can be proxied), we should support it.

**Research Questions:**
- Does LM Studio have native Anthropic API compatibility?
- What is the default server endpoint?
- Can it be used with LiteLLM as a proxy?
- What models are commonly used?

**Research File:** `research/lm-studio.md`

---

### 1.3 Add Ollama Provider (via LiteLLM)

**Status:** Research Required

**Rationale:** Ollama is the most popular local LLM runner. It only has OpenAI API compatibility, so users need LiteLLM as a proxy. We should document this setup clearly.

**Research Questions:**
- Standard Ollama + LiteLLM configuration
- Default ports and endpoints
- Common model mappings
- Step-by-step setup guide

**Research File:** `research/ollama.md`

---

### 1.4 OpenRouter Model Presets

**Status:** Research Required

**Rationale:** Instead of caching user model mappings, provide preset configurations for popular models. Consider free tier models especially.

**Approach Options:**
1. **Static presets** - Hardcode popular model combinations
2. **API integration** - Fetch models from OpenRouter API (if available)
3. **Periodic updates** - Pull model list into repo periodically

**Research Questions:**
- Does OpenRouter have a models API?
- What are the most popular free models?
- What are the best Claude-compatible models?
- Standard model ID formats

**Research File:** `research/openrouter-models.md`

---

## 2. Prompt Pack Architecture Refactor

### 2.1 Current Architecture

**Current State:**
- Prompt packs only apply to `zai` and `minimax` providers
- Two modes: `minimal` and `maximal`
- `minimal` = Tool calling maps (provider-specific)
- `maximal` = Advanced thinking prompts + tool calling maps

**Problem:**
- `maximal` prompts could benefit ALL providers, not just zai/minimax
- The provider-specific tool calling is conflated with general enhancements
- Users of OpenRouter/LiteLLM miss out on the "advanced thinking" benefits

### 2.2 Proposed Architecture

**New Structure:**
```
prompt-packs/
├── core/                    # Provider-agnostic enhancements
│   ├── advanced-thinking.md # Better reasoning prompts
│   ├── code-quality.md      # Code quality improvements
│   └── tool-usage.md        # Better tool utilization
├── providers/               # Provider-specific requirements
│   ├── zai/
│   │   └── tool-calling.md  # Z.ai tool calling maps
│   └── minimax/
│       └── tool-calling.md  # MiniMax tool calling maps
└── presets/
    ├── minimal.json         # Core only
    ├── standard.json        # Core + basic provider hints
    └── maximal.json         # Core + full provider integration
```

**New Prompt Pack Modes:**
| Mode | Content | Available For |
|------|---------|---------------|
| `off` | No modifications | All |
| `core` | Advanced thinking, code quality | All |
| `standard` | Core + provider tool hints | All |
| `maximal` | Standard + full provider integration | zai, minimax |

### 2.3 Implementation Plan

- [ ] Audit existing prompt pack content
- [ ] Separate provider-specific vs generic content
- [ ] Create new folder structure
- [ ] Update `src/core/prompt-pack.ts` to support new modes
- [ ] Update TUI to offer appropriate modes per provider
- [ ] Update CLI flags and help text
- [ ] Test with each provider

**Research File:** `research/prompt-pack-architecture.md`

---

## 3. UX Improvements

### 3.1 Shell Profile Update Message (Zai)

**Status:** Planned

**Change:** When `Z_AI_API_KEY` is detected in environment, show explicit message:
> "Shell profile update skipped (Z_AI_API_KEY already set)"

**Files:**
- `src/tui/app.tsx` - Add message in Quick Setup flow
- `src/cli/index.ts` - Add message in CLI flow

---

### 3.2 API Key Placeholder Validation

**Status:** Planned

**Problem:** If user skips API key for non-optional provider, `<API_KEY>` placeholder is written to settings.json.

**Solution:**
- Validate API key is not empty or placeholder before creating variant
- Show error message with clear instructions
- For optional providers (LiteLLM), use empty string instead of placeholder

**Files:**
- `src/core/index.ts` - Add validation in `createVariant()`
- `src/tui/app.tsx` - Add validation before screen transition
- `src/cli/index.ts` - Validation already exists but could be stronger

---

### 3.3 CLI/TUI Default Matching

**Status:** Planned

**Current Inconsistency:**
- TUI create mode enables prompt pack by default
- CLI create mode requires explicit `--prompt-pack` flag

**Solution:**
- Match CLI defaults to TUI defaults
- Document defaults clearly in help text

**Files:**
- `src/cli/index.ts` - Update default values
- `src/cli/help.ts` - Update help text

---

### 3.4 Doctor Command Enhancements (Optional)

**Status:** Consider

**Potential Improvements:**
- Check file permissions (executable wrapper)
- Validate JSON syntax in config files
- Check if Claude Code binary exists and is valid
- Network connectivity test (optional, behind flag)

**Complexity:** Medium-High - May add significant code for edge cases

**Decision:** Defer unless users report issues

---

### 3.5 Dry Run Mode (Optional)

**Status:** Consider

**Feature:** `cc-mirror create --dry-run` would show:
- What directories would be created
- What files would be written
- What environment variables would be set
- What commands would be run

**Complexity:** Medium - Requires refactoring `createVariant()` to separate planning from execution

**Decision:** Add to backlog, implement if requested

---

## 4. Documentation

### 4.1 README Updates

- [ ] Add LiteLLM section explaining the proxy requirement
- [ ] Add troubleshooting section for common errors
- [ ] Add migration guide from legacy script
- [ ] Update provider descriptions
- [ ] Add model mapping examples for OpenRouter

### 4.2 In-App Help Text

- [ ] Model mapping screen - explain format (e.g., `anthropic/claude-3.5-sonnet`)
- [ ] Base URL screen - explain when to override
- [ ] Brand preset screen - add preview descriptions
- [ ] LiteLLM API key screen - add setup links

### 4.3 New Documentation Files

- [ ] `docs/LITELLM-SETUP.md` - Complete LiteLLM setup guide
- [ ] `docs/OLLAMA-SETUP.md` - Ollama + LiteLLM guide
- [ ] `docs/OPENROUTER-MODELS.md` - Popular model configurations
- [ ] `docs/TROUBLESHOOTING.md` - Common issues and solutions

---

## 5. Code Quality

### 5.1 Type Assertions

**Status:** Planned

**Areas to Improve:**
- `src/cli/index.ts` - Many `as string` casts
- `src/tui/app.tsx` - Some loose typing in effects
- `src/providers/index.ts` - Provider template typing

### 5.2 Error Messages

**Status:** Planned

Make error messages more user-friendly:
- Include suggested fixes
- Link to documentation
- Avoid technical jargon

### 5.3 Test Coverage

**Status:** Backlog

Current tests are basic. Consider adding:
- Provider configuration tests
- Prompt pack application tests
- CLI argument parsing tests
- TUI screen flow tests

---

## 6. Implementation Phases

### Phase 1: Provider Rename & Documentation (Priority: High)

**Scope:**
1. Rename "Local LLMs" to "LiteLLM"
2. Add documentation links to API key screens
3. Update README with LiteLLM explanation
4. Add shell profile skip message for Zai
5. Add API key placeholder validation

**Estimated Effort:** 1-2 days

### Phase 2: OpenRouter Presets (Priority: Medium)

**Scope:**
1. Research OpenRouter models API
2. Add popular model presets
3. Update model mapping UI with presets
4. Document model configurations

**Estimated Effort:** 1 day

### Phase 3: Prompt Pack Refactor (Priority: Medium)

**Scope:**
1. Audit existing prompt content
2. Design new architecture
3. Implement separated prompt packs
4. Enable core prompts for all providers
5. Update UI to reflect new modes

**Estimated Effort:** 2-3 days

### Phase 4: Additional Providers (Priority: Low)

**Scope:**
1. Add LM Studio provider (if compatible)
2. Add Ollama preset with LiteLLM config
3. Document each setup path

**Estimated Effort:** 1-2 days

### Phase 5: Code Quality & Polish (Priority: Low)

**Scope:**
1. Strengthen type assertions
2. Improve error messages
3. Add more tests
4. Optional features (dry run, doctor enhancements)

**Estimated Effort:** 2-3 days

---

## Research Files

All research will be documented in separate files to avoid conflicts:

| File | Purpose |
|------|---------|
| `research/litellm.md` | LiteLLM setup, configuration, documentation |
| `research/lm-studio.md` | LM Studio compatibility research |
| `research/ollama.md` | Ollama + LiteLLM proxy setup |
| `research/openrouter-models.md` | Popular models, API, free tier |
| `research/prompt-pack-architecture.md` | Detailed prompt pack refactor design |

---

## Progress Tracking

### Completed
- [x] Initial review and analysis
- [x] Create refactoring plan document

### In Progress
- [ ] Research tasks (spawned to sub-agents)

### Pending
- [ ] Phase 1 implementation
- [ ] Phase 2 implementation
- [ ] Phase 3 implementation
- [ ] Phase 4 implementation
- [ ] Phase 5 implementation

---

*Last Updated: 2026-01-02*
