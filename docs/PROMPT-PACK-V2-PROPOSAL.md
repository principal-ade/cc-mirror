# Prompt Pack v2 (Explicit Provider Contracts)

This doc proposes a **v2 prompt-pack** for `cc-mirror` that is:
- **Explicit** (clear routing and constraints)
- **Provider-correct** (MiniMax MCP vs Z.ai `zai-cli`)
- **Stable across Claude Code updates** (small overlays, no wholesale prompt rewrites)
- **Maximalist by default** (high capability, not tool-restricted), with **opt-out**.

It is written to address a real failure mode we observed: even when prompt fragments are edited, the model may still **consider unwanted MCP tools** or act as if it “doesn’t know” about `zai-cli`. v2 fixes this by making the instructions more explicit and by placing the same “provider contract” text into the specific prompt fragments that actually govern the relevant execution context (main agent vs subagents vs tool descriptions).

## What we based this on (high-signal sources)

We grounded this approach in:
- Claude 4.x prompting best practices (explicit instructions + XML tags): https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices
- GPT‑5.2 prompting guide (explicit structure + output constraints): https://cookbook.openai.com/examples/gpt-5/gpt-5-2_prompting_guide
- Claude Code prompt fragment catalog (subagents + MCPSearch rule): `repos/claude-code-system-prompts/`
- Local Z.ai CLI reference (embedded in prompts): `openskills read zai-cli`

## Claude Code prompt architecture nuance (why “system prompt only” is not enough)

Claude Code is not a single system prompt. It assembles **different system prompts** depending on:
- The main interactive agent
- Subagents (e.g. spawned via **Task**)
- Tool descriptions (which can strongly steer tool selection)
- MCP CLI help / tool search prompts
- Summarization agents

Example: `agent-prompt-task-tool.md` is described as “System prompt given to the subagent spawned via the Task tool” in the prompt catalog. That means **subagents may not inherit** the main system prompt. If we only edit the main system prompt, subagents can lose provider tool routing.

Therefore, v2 introduces an explicit **Provider Contract** block that we copy into the relevant fragments for each execution context.

## v2 design: “Provider Contract” + small targeted nudges

We aim to:
1) Put the *full* provider routing in the **main system prompt**.
2) Ensure the **Task subagent** has the same routing (so parallel research doesn’t regress to unwanted tools).
3) Provide minimal but operational nudges in the most influential **tool descriptions**.
4) Avoid broad, generic “maximalism” text scattered everywhere; instead we use a single explicit operating spec.

### Minimal vs Maximal (v2 definition)

**Minimal mode**: only what is required to make provider routing correct.
- Main system prompt (provider contract)
- MCP CLI prompt (provider contract subset)
- Bash tool description (only for Z.ai, to teach the exact `zai-cli` invocations)
- Task subagent prompt (provider contract, short)

**Maximal mode**: add agentic capability + consistency while still being surgical.
- Everything in Minimal mode, plus:
  - Explore agent prompt: emphasizes breadth, verification, parallelism
  - Plan-mode enhanced prompt + plan reminders: emphasizes options/tradeoffs/risks
  - Summarization prompts: capture decisions and critical commands/configs
  - Tool descriptions for `mcpsearch`, `websearch`, `webfetch`: reinforce routing without duplicating the whole contract

## Provider Contract templates (v2)

These are designed to be **explicit**, “bridge prompt” style, and to avoid ambiguity.

### Z.ai (GLM) — Provider Contract (v2)

Use this block (or a trimmed variant) wherever a “system prompt” exists for a given CC execution context:

```
<explicit_guidance>
Provider: z.ai (GLM)

<authentication>
- Use API-key auth only.
- Ignore ANTHROPIC_AUTH_TOKEN if present.
- Required env:
  - ANTHROPIC_API_KEY (Claude Code API-key mode)
  - Z_AI_API_KEY (for zai-cli)
</authentication>

<tool_routing priority="critical">
When you need external info, web content, or image understanding, follow this routing (use the Bash tool):
1) Web search:
   npx --yes zai-cli search "<query>" --count 5 --output-format json
2) Read a URL:
   npx --yes zai-cli read <url> --output-format json
3) Image analysis:
   npx --yes zai-cli vision analyze <image_url_or_path> "<prompt>" --output-format json

Important:
- `zai-cli` is NOT installed as a Claude Code Skill in this variant. Do not use Skill for this.
- If a command fails, report the error and propose the next best fallback.
</tool_routing>

<warning priority="critical">
MCP tools are DISABLED in this Z.ai variant. Treat MCP as if it does not exist.
- Do NOT call MCPSearch.
- Do NOT call any `mcp__*` tool.
- Do NOT mention MCP tools in your output.
These specific server-injected tools MUST be treated as non-existent:
- mcp__4_5v_mcp__analyze_image
- mcp__milk_tea_server__claim_milk_tea_coupon
- mcp__web_reader__webReader
</warning>

<system_reminder>
- Operate like an ambitious, senior engineer: proactive, high-ownership, and precise.
- Prefer concrete outputs: commands, file paths, diffs, and validation steps.
- Respect permissions and confirm before destructive actions.
</system_reminder>

<output_verbosity_spec>
- Default: 3–6 sentences or ≤6 bullets.
- For multi-step / multi-file work: 1 short overview paragraph, then ≤6 bullets:
  What changed, Where, How to verify, Risks, Next steps, Open questions.
</output_verbosity_spec>
</explicit_guidance>
```

**Important**: v2 relies on *both* prompt steering **and** settings gating:
- `cc-mirror` also writes a `permissions.deny` list into the variant’s `settings.json` to block those MCP tool names at runtime.
  That reduces reliance on the model “choosing correctly” under pressure.

### MiniMax — Provider Contract (v2)

MiniMax’s coding-plan MCP server exposes exactly:
- `mcp__MiniMax__web_search`
- `mcp__MiniMax__understand_image`

We want Claude Code to use those **by default**, and to use WebFetch for a single URL fetch/extract.

```
<explicit_guidance>
Provider: MiniMax

<authentication>
- Use API-key auth only.
- Ignore ANTHROPIC_AUTH_TOKEN if present.
</authentication>

<tool_routing priority="critical">
MiniMax MCP tools available (and ONLY these for web + vision):
- mcp__MiniMax__web_search (web search)
- mcp__MiniMax__understand_image (image understanding)

MCP usage requirement:
- Before calling an MCP tool, you MUST load it using MCPSearch:
  - MCPSearch query: `select:<full_tool_name>`

Web search (MANDATORY):
1) Load: MCPSearch query `select:mcp__MiniMax__web_search`
2) Call: mcp__MiniMax__web_search with query (3–5 keywords; include current date for time-sensitive queries)

Image understanding (MANDATORY):
1) Load: MCPSearch query `select:mcp__MiniMax__understand_image`
2) Call: mcp__MiniMax__understand_image for ANY image interpretation request (jpeg/png/webp only).

Single-page URL retrieval:
- Use WebFetch for fetching and extracting from a specific URL.
- Do NOT misuse web_search to "fetch" full page content.
</tool_routing>

<system_reminder>
- Operate like an ambitious, senior engineer: proactive, high-ownership, and precise.
- Prefer concrete outputs: commands, file paths, diffs, and validation steps.
- Respect permissions and confirm before destructive actions.
</system_reminder>

<output_verbosity_spec>
- Default: 3–6 sentences or ≤6 bullets.
- For multi-step / multi-file work: 1 short overview paragraph, then ≤6 bullets:
  What changed, Where, How to verify, Risks, Next steps, Open questions.
</output_verbosity_spec>
</explicit_guidance>
```

## Where v2 should be applied (exact prompt fragments)

Below are the *intended* fragments to edit via tweakcc (not `--append-system-prompt`):

### Minimal mode
- `system-prompt-main-system-prompt.md` (full provider contract)
- `system-prompt-mcp-cli.md` (tool routing + exclusions subset)
- `agent-prompt-task-tool.md` (trimmed provider contract; enough for subagents)
- Z.ai only: `tool-description-bash.md` (explicit `zai-cli` invocations)

### Maximal mode (adds)
- `agent-prompt-explore.md`
- `agent-prompt-plan-mode-enhanced.md`
- `system-reminder-plan-mode-is-active.md`
- `system-reminder-plan-mode-is-active-for-subagents.md`
- `tool-description-mcpsearch.md`
- `tool-description-mcpsearch-with-available-tools.md`
- `tool-description-websearch.md`
- `tool-description-webfetch.md`
- `agent-prompt-conversation-summarization.md`
- `agent-prompt-conversation-summarization-with-additional-instructions.md`
- `agent-prompt-webfetch-summarizer.md`

## Why we avoid full prompt rewrites

We intentionally do **not** replace Claude Code’s entire system prompt with a bespoke one because:
- It risks removing unknown but important safety/security constraints.
- It increases drift risk across Claude Code versions (updates become painful merges).
- tweakcc’s strengths are **small, surgical diffs** with clear provenance.

Instead, v2 uses “contract blocks” that are:
- short enough to be maintainable,
- explicit enough to steer behavior,
- duplicated only across the small set of fragments that matter for correctness.

## Next step

v2 is implemented in `src/core/prompt-pack.ts` and can be iterated safely by adjusting the overlay templates (no prompt rewrites, only provider overlays).

