# Maximalist Prompt Overlay Plan (Z.ai + MiniMax)

Note: This plan is now implemented as the **v2 Provider Contract** overlays in `src/core/prompt-pack.ts`. See `docs/PROMPT-PACK-V2-PROPOSAL.md` for the rationale and exact contract shape.

This doc uses the local prompt catalog at `repos/claude-code-system-prompts/` to identify where we can safely add provider-specific guidance and a “maximalist” operating style without restricting tools or agents.

## Principles
- **Maximal capability**: do not restrict tools or subagents; keep `allowedTools: '*'`.
- **Minimal edits**: append short overlays, do not rewrite base prompt fragments.
- **Safety-preserving**: do not remove or weaken any safety/security rules.
- **Provider-aware**: only alter tool preference logic (MCP vs `zai-cli` vs builtin web).

## Source map (local repo)
Prompt fragments are in `repos/claude-code-system-prompts/system-prompts/`.
Key groups we can target:

### Main system prompts
- `system-prompt-main-system-prompt.md`
- `system-prompt-mcp-cli.md`

### Subagents (maximalist behavior)
- `agent-prompt-explore.md`
- `agent-prompt-plan-mode-enhanced.md`
- `agent-prompt-task-tool.md`
 - `agent-prompt-conversation-summarization.md`
 - `agent-prompt-conversation-summarization-with-additional-instructions.md`
 - `agent-prompt-webfetch-summarizer.md`

### System reminders (plan mode)
- `system-reminder-plan-mode-is-active.md`
- `system-reminder-plan-mode-is-active-for-subagents.md`

### Tool descriptions (behavioral nudges)
- `tool-description-task.md`
- `tool-description-enterplanmode.md`
- `tool-description-exitplanmode-v2.md`
- `tool-description-mcpsearch.md`
- `tool-description-websearch.md`
- `tool-description-webfetch.md`
- `tool-description-bash.md`
- `tool-description-skill.md`

### Do not touch (safety‑sensitive)
- `agent-prompt-security-review-slash.md`
- `tool-description-bash-sandbox-note.md`
- `tool-description-bash-git-commit-and-pr-creation-instructions.md`

## Maximalist overlay content (proposed)
Keep overlays short and surgical. These are *guidance* blocks, not rewrites.

### Global “ambitious engineer” block (main prompt)
Add to `system-prompt-main-system-prompt.md`:
- be proactive and propose next steps
- use the full tool surface and subagents when useful
- verify assumptions with safe checks
- respect permission boundaries

### Subagent elevation
Add to:
- `agent-prompt-explore.md` (encourage deep context discovery, proactive hypothesis testing)
- `agent-prompt-plan-mode-enhanced.md` (encourage exhaustive plan options + tradeoffs)
- `agent-prompt-task-tool.md` (encourage delegating specialized tasks to subagents)

### Plan mode reminders
Add a short line to:
- `system-reminder-plan-mode-is-active.md`
- `system-reminder-plan-mode-is-active-for-subagents.md`
to emphasize multi‑track exploration and explicit tradeoffs.

### Tool usage hints
Add short lines to:
- `tool-description-task.md`: encourage Task for complex, parallelizable work
- `tool-description-enterplanmode.md`: encourage early plan mode for complex tasks
- `tool-description-exitplanmode-v2.md`: encourage crisp plan summaries with options
- `tool-description-skill.md`: prefer installed skills when they provide sharper domain expertise

## Provider-specific overlays

### Z.ai
Targets:
- `system-prompt-main-system-prompt.md`
- `system-prompt-mcp-cli.md`
- `tool-description-bash.md`
- `tool-description-websearch.md`
- `tool-description-webfetch.md`
- `tool-description-mcpsearch.md`

Guidance:
- Avoid server-side MCP tools (e.g., `mcp__4_5v_mcp__analyze_image`, `mcp__milk_tea_server__claim_milk_tea_coupon`, `mcp__web_reader__webReader`).
- Prefer `zai-cli` via Bash for search/read/vision, and repeat this preference in tool descriptions so it is operationally explicit.
- Require `Z_AI_API_KEY` (auto-set to the Z.ai API key by default; allow override).

### MiniMax
Targets:
- `system-prompt-main-system-prompt.md`
- `system-prompt-mcp-cli.md`
- `tool-description-websearch.md`
- `tool-description-webfetch.md`
- `tool-description-mcpsearch.md`

Guidance:
- Prefer MiniMax MCP tools for web search + image understanding.
- Fall back to builtin `WebSearch`/`WebFetch` only if MCP is unavailable.

## Implementation path (cc-mirror)
Current implementation already injects overlays into:
- `system-prompt-main-system-prompt.md`
- `system-prompt-mcp-cli.md`
- `tool-description-bash.md`
- `tool-description-webfetch.md`
- `tool-description-websearch.md`

To go “maximalist”, extend `src/core/prompt-pack.ts` to support:
- subagent prompts and system reminders above
- `tool-description-task.md`, `tool-description-enterplanmode.md`, `tool-description-exitplanmode-v2.md`, `tool-description-mcpsearch.md`, `tool-description-skill.md`

Suggested flag:
- `--prompt-pack-mode minimal|maximal` (default: **maximal** for Z.ai/MiniMax; minimal for other providers).

## Validation checklist
1) Confirm overlays exist in the tweakcc `system-prompts/` directory for the variant.
2) Verify `Task` and `Plan` are encouraged (but not forced) in complex requests.
3) Z.ai: confirm `zai-cli` is preferred; MCP tools are avoided unless requested.
4) MiniMax: confirm MCP tools are preferred for web/vision; builtin tools used only as fallback.
5) Ensure no toolsets are restricting tools (keep `allowedTools: '*'`).
