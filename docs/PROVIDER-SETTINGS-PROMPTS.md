# Provider Settings + Prompt Packs + Skills (Methodical Plan)

This document explains how we will safely adjust Claude Code settings, prompts, and default Skills for custom providers (Z.ai and MiniMax). It is intentionally cautious and explicit about why each change is proposed.

## Sources of truth
- Claude Code settings docs (settings.json, permission rules, precedence, system prompt availability). (https://docs.claude.com/en/docs/claude-code/settings)
- Claude Code CLI docs (append system prompt flags). (https://docs.claude.com/en/docs/claude-code/cli-usage)
- Claude Code skills docs (skills discovery paths, loading behavior). (https://docs.claude.com/en/docs/claude-code/skills)
- tweakcc README (prompt fragment editing, system-prompts directory, apply flow). (https://github.com/Piebald-AI/tweakcc)

## Goals
1) Keep Claude Code safe and predictable for users.
2) Make provider-specific tools (MiniMax MCP vs Z.ai CLI) the *preferred* path.
3) Avoid breakage during Claude Code updates by making minimal, focused prompt changes.
4) Ensure every change is explicit and reversible.
5) Make defaults smart but *opt-out* for users who prefer stock behavior.

## What we can (and cannot) change
- **We can**: configure `settings.json`, permissions allow/ask/deny, environment variables, MCP approvals, and prompt fragments via tweakcc.
- **We cannot**: access Claude Code’s internal system prompt text directly (it’s not published). We can only *append* instructions using CLAUDE.md or `--append-system-prompt`, or override fragments via tweakcc.

## Settings adjustments to consider (by provider)

### Settings entry points and precedence
Settings are merged across scopes. Higher-precedence policies (managed settings) can override user/project settings. This matters because our variant-specific config should avoid conflicting with enterprise policies.

#### Settings file locations (for reference)
- User settings: `~/.claude/settings.json`
- Project settings: `.claude/settings.json` and `.claude/settings.local.json`
- Managed enterprise settings (if present) override user/project settings

### Permission rules (allow/ask/deny)
Claude Code’s permissions are configured using `permissions.allow`, `permissions.ask`, and `permissions.deny`. Deny rules take precedence; ask rules override allow rules when both match. Rules can target tools or tool+specifier patterns (e.g. `Bash(git diff:*)`, `Read(./.env)`). Default permission mode controls what happens when a tool is not matched by allow/ask/deny.

### Baseline (all providers)
- **permissions**
  - Use `ask` for destructive commands (e.g. `Bash(rm -rf:*)`).
  - Use `deny` to block sensitive files (`Read(./.env)`, `Read(./secrets/**)`).
  - Keep `defaultMode` conservative unless the user explicitly opts in to `acceptEdits`.
- **env**
  - Set provider base URL and API key in the variant’s `settings.json` so sessions are consistent.
- **MCP approvals**
  - Only auto-approve MCP servers if they are trusted and we can verify the server identity.

### MiniMax
- Seed the MiniMax MCP server in `~/.cc-mirror/<variant>/config/.claude.json` (already done).
- In `settings.json`, consider explicitly **approving** the MiniMax server once we know its MCP server name.
- Ensure permissions allow MCP tool use for web search and image understanding.

### Z.ai
- Block server-side MCP tools by name (currently: `mcp__4_5v_mcp__analyze_image`, `mcp__milk_tea_server__claim_milk_tea_coupon`, `mcp__web_reader__webReader`). Re-verify if names change. (Implemented via `settings.json` deny list on create/update.)
- Prefer using `zai-cli` via Bash for search/read/vision.
- cc-mirror also sets `Z_AI_API_KEY` to the same value as `ANTHROPIC_API_KEY` by default (can be overridden via extra env). Quick/TUI flows can also write it to the shell profile (opt out with `--no-shell-env`).
- cc-mirror prints a small startup splash by default (`CC_MIRROR_SPLASH=1`); disable with `--env CC_MIRROR_SPLASH=0`.

## Prompt packs (how they work)

### What is a prompt pack?
A prompt pack is a small, provider-specific overlay that cc-mirror injects into tweakcc prompt fragments. We avoid copying full prompt files; instead we append a minimal provider block.

### Implementation (overlay markers)
cc-mirror appends or replaces an overlay block in the following prompt fragment files:

- `system-prompt-main-system-prompt.md`
- `system-prompt-mcp-cli.md`
- `tool-description-bash.md`
- `tool-description-webfetch.md`
- `tool-description-websearch.md`

Each overlay is wrapped in:
```
<!-- cc-mirror:provider-overlay start -->
...provider-specific guidance...
<!-- cc-mirror:provider-overlay end -->
```

Implementation lives in `src/core/prompt-pack.ts`, invoked from `src/core/index.ts` on create/update.

### Application flow (implemented)
1) Run tweakcc once to materialize the prompt fragment files.
2) Inject the provider overlay into the files above.
3) Re-run tweakcc `--apply` so the patched binary includes the new prompt content.

For expanded “maximalist” overlays across subagents and plan mode, see `docs/PROMPT-PACK-MAXIMALIST.md`.

### Why this works
tweakcc writes one markdown file per prompt fragment (tools, agents, utilities, main prompt). We only touch a few fragments, so updates stay small and conflicts are easy to resolve.

### How the prompt files appear
tweakcc generates prompt fragment files by downloading a prompt index for the current Claude Code version and materializing a markdown file for each fragment in `system-prompts/`. We only edit the fragments we need, so updates stay small and conflicts are easy to resolve.

## Prompt adjustments (minimal and explicit)

### MiniMax overlay
Add a short “provider hint” to the **main system prompt**:
- Prefer MiniMax MCP tools for `web_search` and `understand_image`.

Add a short line to the **MCP CLI prompt**:
- The MiniMax MCP server is preconfigured and should be used when needing web search or image understanding.

### Z.ai overlay
Add a short “provider hint” to the **main system prompt**:
- Do not use server-side MCP tools injected by Z.ai (update the list if names change).
- Use `zai-cli` (via Bash) for web search, page reading, and image analysis.

Add a short line to **Bash tool description**:
- `zai-cli` is the preferred interface for web/vision; requires `Z_AI_API_KEY`.

### Ambitious engineer overlay (style-only)
Add a small style block to the **main system prompt** (2-4 lines max). Example:
- Be proactive: identify risks, suggest improvements, and propose next steps without waiting to be asked.
- Be surgical: prefer minimal, high-impact changes and explain tradeoffs.
- Be accountable: verify assumptions, run checks when safe, and report results clearly.
- Respect permissions: ask before destructive or high-risk actions.

This overlay is part of **maximal** prompt-pack mode.

## Safety guardrails for prompt edits
- Do not remove or weaken safety constraints.
- Do not change tool semantics.
- Keep the provider hints to 2-4 lines.
- Treat prompt pack updates like code changes: diff, review, and test.

## Validation checklist
1) Start a new session and confirm the prompt overlay text is present (inspect tweakcc prompt files).
2) MiniMax: ask for a web search and a vision task; confirm MCP tools are used.
3) Z.ai: ask for a web search and a vision task; confirm `zai-cli` is used, not MCP.
4) Add deny rules for unwanted MCP tools if any still appear.

## Implementation status
- Prompt packs are **enabled by default** for Z.ai and MiniMax variants.
- Default mode is **maximal** for Z.ai/MiniMax; use `--prompt-pack-mode minimal` to keep overlays smaller.
- Users can opt out with `--no-prompt-pack` or the TUI toggle.
- Overlays are injected directly into tweakcc prompt fragments.

## Skill defaults (dev-browser)

Claude Code automatically discovers Skills in three locations: personal skills (`~/.claude/skills/`), project skills (`.claude/skills/`), and plugin skills. For cc-mirror variants, `CLAUDE_CONFIG_DIR` points to `~/.cc-mirror/<variant>/config`, so cc-mirror installs the dev-browser Skill into `~/.cc-mirror/<variant>/config/skills/dev-browser` (opt out) so it stays isolated per provider.

### Default behavior
- On `create` or `update` for providers `zai` and `minimax`:
  - Pull the latest dev-browser skill from:
    `https://github.com/SawyerHood/dev-browser/tree/main/skills/dev-browser`
  - Install into `~/.cc-mirror/<variant>/config/skills/dev-browser`.
  - If a user already has a customized `dev-browser` skill, do not overwrite unless `--skill-update` is set.

### Opt-out flags
- `--no-skill-install` (CLI)
- TUI toggle: “Install dev-browser skill (recommended)” default **on**

### Implementation notes
- Prefer `git` for updates if available: shallow clone or `git fetch --depth 1`.
- Fallback to `curl` + `tar` if git is unavailable.
- Write a small marker file (e.g., `.cc-mirror-managed`) inside the skill folder so we only auto-update if we installed it.

## Open questions to resolve before further changes
- Confirm actual MCP tool names used by Z.ai in the current CC version.
- Confirm MiniMax MCP server name to allowlist/approve properly.
- Decide whether dev-browser installs should be per-variant only or global for all CC usage.
