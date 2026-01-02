# Claude Code Features Audit (cc-mirror)

Purpose: track how upstream Claude Code features work, where they are configured, and whether cc-mirror/tweakcc alters them.

## Prompt Suggestions (LLM auto-suggest for next user input)

**What it is**
- Claude Code can generate a short suggested next prompt in the input area using an LLM.

**Upstream implementation (claude-code cli.js)**
- Entry gate: prompt suggestions are enabled by `qX1()` which checks, in order:
  - `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false` disables; `=1` forces enable.
  - Statsig gate `tengu_prompt_suggestion` must be true.
  - Disabled for non-interactive sessions and in `mcp-cli` mode.
  - Settings flag `promptSuggestionEnabled` must not be false (absent defaults to enabled).
- Runtime conditions before generating a suggestion:
  - No pending permission prompts (`pendingWorkerRequest` / `pendingSandboxRequest`).
  - No active elicitation flow.
  - Not in plan mode (`toolPermissionContext.mode === "plan"`).
  - Rate limiter must be `allowed`.
  - At least 2 assistant messages in the conversation.
  - Last assistant message must not be an API error.
- Generation path:
  - Uses a dedicated prompt (`suggestion_generator` variant), query source `prompt_suggestion`.
  - Output is filtered and discarded if it fails heuristics (empty, "done", too few/many words, multiple sentences, formatting, evaluative language, "Claude voice", etc.).

**Where the prompt lives in this repo/variant**
- Upstream prompt source: `repos/claude-code-system-prompts/system-prompts/agent-prompt-prompt-suggestion-generator-v2.md`.
- Applied prompt in variant: `~/.cc-mirror/<variant>/tweakcc/system-prompts/agent-prompt-prompt-suggestion-generator-v2.md`.
- Prompt cache used by tweakcc: `~/.cc-mirror/<variant>/tweakcc/prompt-data-cache/prompts-2.0.76.json`.

**Settings / toggles to verify**
- Env override: `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`.
- Settings flag: `promptSuggestionEnabled` (Claude Code settings schema).
- Statsig gate cached in `~/.cc-mirror/<variant>/config/.claude.json` under `cachedStatsigGates.tengu_prompt_suggestion`.

**cc-mirror default**
- We set `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=1` in variant `settings.json` env to bypass Statsig gating and force-enable suggestions.

**Known reasons it may appear “not working”**
- Conversation too new (needs 2 assistant replies).
- Plan mode or pending permission dialogs suppress it.
- Rate limiter not `allowed`.
- LLM output gets filtered by heuristics (e.g., "done", formatting, multi-sentence output).
- Non-interactive or `mcp-cli` mode.

**cc-mirror integration**
- cc-mirror does not currently override this feature; it relies on upstream prompt + config.
- We do not set `promptSuggestionEnabled` today; default should be enabled unless changed via `/config`.

**Next debugging steps**
- Confirm env flag: `echo $CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` in the same shell.
- Ensure `promptSuggestionEnabled` isn’t set false in any settings scope.
- Verify gate: `cachedStatsigGates.tengu_prompt_suggestion` is true in `config/.claude.json`.
- Repro after 2+ assistant replies and outside plan mode.
- If still missing: capture suggestion output by temporarily logging `KS(reason)` in cli.js to see the filtered reason, then decide whether to tune the prompt for Z.ai.

---

## Release Notes → Feature Map (as of 2026-01-02)

### Piebald-AI system-prompts releases (v2.0.75 → v2.0.72)
Source: https://github.com/Piebald-AI/claude-code-system-prompts/releases

- **v2.0.75 (Dec 20)**: removed Task tool “extra notes” prompt and removed “no colons before tool calls” instruction in main prompt. cc-mirror: no re-additions; overlays remain compatible.
- **v2.0.74 (Dec 20)**: added Session Search Assistant prompt; removed swarm/plan-exit, delegate/team coordination prompts; removed TaskList/TaskUpdate/TeammateTool operation descriptions; simplified Git commit/PR guidance in Bash prompt. cc-mirror: inherits upstream prompts via tweakcc; no custom re-additions.
- **v2.0.73 (Dec 19)**: added Prompt Suggestion Generator v2; removed SlashCommand tool description; Skill tool updated with slash-syntax guidance; LSP tool adds call hierarchy ops; TeammateTool ops expanded; “slash commands” → “skills” terminology. cc-mirror: suggestion prompt is applied via tweakcc; overlays avoid backticks.
- **v2.0.72 (Dec 18)**: Task tool requires 3–5 word short description; TaskUpdate adds staleness rule (read latest via TaskGet). cc-mirror: no overrides.

### Anthropic Claude Code changelog (2.0.74 → 2.0.67 highlights)
Source: https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md

- **2.0.74**: LSP tool added; `/terminal-setup` expanded; theme picker enhancements and related UI fixes.
- **2.0.71**: `/config` toggle for prompt suggestions (cc-mirror forces enable via env).
- **2.0.70**: Enter accepts prompt suggestions; wildcard MCP permissions `mcp__server__*`.
- **2.0.68**: fixed disallowed MCP tools being visible to the model (reinforces our Z.ai deny list).
- **2.0.67**: `/doctor` shows reason for autoupdater disabled (we set `DISABLE_AUTOUPDATER=1`).

---

## Backlog: Other Features to Review

- Status line enhancements (context window %, current usage) — upstream only
- Prompt coaching tips (input assist) — upstream only
- Hooks system (pre/post tool hooks) — upstream only
- MCP tool permission rules and wildcards — upstream only + cc-mirror deny list for Z.ai
- Auto-update disable (`DISABLE_AUTOUPDATER=1`) — cc-mirror custom
- Splash/banner override — cc-mirror custom
