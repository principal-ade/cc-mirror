# Claude Code Prompt Strategy for Custom Providers

This doc captures what Claude Code's default prompt system looks like, how tweakcc edits it, and how cc-mirror adapts prompts for Z.ai and MiniMax providers (including MCP tool enable/disable strategy).
For a maximalist overlay expansion plan (subagents + plan mode), see `docs/PROMPT-PACK-MAXIMALIST.md`.

## Why this matters
Claude Code's "system prompt" is not a single string. It is a composition of many prompt fragments: main system prompt, tool descriptions, sub-agent prompts (Plan/Explore/Task), and utility prompts (compact, WebFetch summarizer, etc.). The upstream prompt structure is cataloged in the claude-code-system-prompts repo and changes regularly as Claude Code versions change. We must keep our modifications minimal and version-aware.

## What the default prompt structure looks like
Based on the claude-code-system-prompts catalog:
- There are 40+ prompt fragments across main system prompt, tool descriptions, sub-agent prompts, and utility prompts.
- There are explicit tool descriptions for built-ins like Read, Bash, TodoWrite, etc.
- There are separate prompts for sub-agents (Plan/Explore/Task) and utilities (compact, WebFetch summary, statusline, etc.).
- There is a dedicated "System Prompt: MCP CLI" entry that controls how the MCP CLI is described to the model.

Sources:
- https://github.com/Piebald-AI/claude-code-system-prompts
- Local mirror: `repos/claude-code-system-prompts/`

## How tweakcc modifies prompts
tweakcc patches the same prompt fragments that Claude Code uses internally, and stores them as separate markdown files. This makes it possible to adjust specific prompts without touching everything.

Key points (from tweakcc README):
- The system prompt is a collection of many strings, not a single string.
- tweakcc writes one markdown file per prompt fragment (tools, agents, utilities, main prompt).
- On update, tweakcc can diff conflicts and preserve your changes.

Source:
- https://github.com/Piebald-AI/tweakcc

## Goals for provider-specific prompt adjustments
1) Make the model prefer the right toolchain for each provider.
2) Disable unwanted MCP tools (Z.ai server-side MCP tools).
3) Keep changes minimal so updates are easy.
4) Avoid changing safety or security policies.

## Provider strategy

### MiniMax (preferred tools: MCP web_search + understand_image)
MiniMax ships an MCP server that exposes specialized tools like `web_search` and `understand_image` (per MiniMax MCP docs). We want Claude Code to use those tools when it needs web or vision.

Plan:
- In the main system prompt, add a short provider overlay:
  - "When web search or image understanding is needed, prefer MCP tools from the MiniMax MCP server."
- In the MCP CLI prompt fragment, add a note that the MiniMax MCP server is preconfigured and should be used for web search + image understanding.
- In tool descriptions for WebFetch/Read, add a pointer to MCP-first behavior when the provider is MiniMax.

### Z.ai (disable server-side MCP tools, prefer zai-cli)
Z.ai appears to expose MCP tools server-side (examples observed: `mcp__4_5v_mcp__analyze_image`, `mcp__milk_tea_server__claim_milk_tea_coupon`, `mcp__web_reader__webReader`). We want these disabled, and instead use `zai-cli` for search/read/vision via Bash.

Plan:
- System prompt overlay for Z.ai:
  - "Do NOT use server-side MCP tools `mcp__4_5v_mcp__analyze_image`, `mcp__milk_tea_server__claim_milk_tea_coupon`, `mcp__web_reader__webReader`."
  - "Use `zai-cli` via Bash for web search, page reading, and image analysis." (and specify that `Z_AI_API_KEY` must be present in env)
- Tool description edits for Bash / Read / WebFetch:
  - Add a short block telling the model to prefer `zai-cli` for web/vision.
- MCP CLI prompt fragment:
  - Insert a rule that MCP tools from Z.ai server-side should be ignored unless explicitly requested.

## Tool gating: disable unwanted MCP tools
Claude Code supports tool permission controls (allowlist/denylist). MCP tool names are of the form `mcp__server__tool` (naming convention used in tool permissions).

Recommended options:
1) **Allowlist** only the tools you want (strongest). This will exclude server-side MCP tools by default.
2) **Disallow** the specific MCP tools by name (lighter-touch).

Current implementation:
- cc-mirror writes a deny list for the known Z.ai MCP tools into `~/.cc-mirror/<variant>/config/settings.json` on create/update.

References:
- Tool permission model and patterns: https://deepwiki.com/zebbern/claude-code-guide/6.1-permission-modes
- Allowed tools config locations (community doc): https://claudelog.com/configuration

Note: we should verify the exact config path for each scope on the user’s machine, since this can change across versions. The safest path is to write into the variant’s config directory (`~/.cc-mirror/<variant>/config/.claude.json`) and prefer project-scoped rules if possible.

## How this is implemented (cc-mirror)

### Prompt overlay concept
Instead of copying full prompt packs, cc-mirror appends a minimal provider overlay into existing tweakcc prompt fragments. This keeps diffs small and reduces conflict risk during CC updates.

### Application flow
1) Run tweakcc once to generate the prompt fragment files.
2) Insert a provider overlay (wrapped in `<!-- cc-mirror:provider-overlay start/end -->`) into:
   - `system-prompt-main-system-prompt.md`
   - `system-prompt-mcp-cli.md`
   - `tool-description-bash.md`
   - `tool-description-webfetch.md`
   - `tool-description-websearch.md`
3) Re-run tweakcc `--apply` so the patched binary includes the overlay.

Prompt packs can run in **minimal** or **maximal** mode. Minimal only adds provider routing hints. Maximal also adds subagent/plan-mode and tool-usage overlays (see `docs/PROMPT-PACK-MAXIMALIST.md`).
Default is **maximal** for Z.ai and MiniMax variants unless overridden.

### Provider overlays (minimal, safe edits)
Add small, explicit sections to the main system prompt:
- MiniMax overlay: prefer MCP `web_search` and `understand_image` tools.
- Z.ai overlay: ignore the listed MCP tools; use `zai-cli` via Bash instead.

### Z.ai CLI instructions
The `zai-cli` tool supports search, read, repo, and vision analysis. We can instruct the model to use it through Bash (e.g., `npx zai-cli search ...`, `npx zai-cli vision analyze ...`). It requires `Z_AI_API_KEY` in the environment.

## Validation plan
1) Start a clean session and confirm the system prompt overlay is present (check prompt file in tweakcc).
2) For Z.ai:
   - Ask for a web search; verify it chooses `zai-cli` rather than MCP tools.
   - Ask for an image analysis; verify it uses `zai-cli vision analyze`.
3) For MiniMax:
   - Ask for web search and image understanding; verify it calls MCP tools from MiniMax server.
4) If MCP tools still appear, add allowlist/denylist rules and re-test.

## Open questions (to resolve next)
- Confirm the exact MCP tool names exposed by MiniMax MCP server after install.
- Confirm the best config scope for tool allowlist rules in current Claude Code version.
- Confirm whether we should add allow/deny tool rules for unwanted MCP tools by default, or leave as manual guidance.

