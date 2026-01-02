import type { OverlayMap, PromptPackKey, PromptPackMode } from './types.js';
import { sanitizeOverlayMap } from './sanitize.js';
import { buildZaiExcerpt, buildZaiOverlays } from './providers/zai.js';
import { buildMinimaxExcerpt, buildMinimaxOverlays } from './providers/minimax.js';

const mergeOverlays = (base: OverlayMap, extra: OverlayMap): OverlayMap => ({
  ...base,
  ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value && value.trim().length > 0)),
});

const buildProviderExcerpt = (provider: PromptPackKey): string =>
  provider === 'zai' ? buildZaiExcerpt() : buildMinimaxExcerpt();

const buildMaximalOverlays = (provider: PromptPackKey): OverlayMap => ({
  explore: `
<system_reminder>
- You are in Explore mode: go wide before deep.
- Use tools early to validate assumptions and reduce guesswork.
- Output: Findings (bullets), Risks/unknowns, Next steps.
</system_reminder>

${buildProviderExcerpt(provider)}
  `.trim(),
  planEnhanced: `
<system_reminder>
- Provide 2-3 viable options with tradeoffs.
- Include risks, unknowns, and a validation checklist.
- Output structure: Overview, Options, Recommendation, Steps, Verification, Risks.
</system_reminder>

${buildProviderExcerpt(provider)}
  `.trim(),
  planReminder: `
<system_reminder>
- In Plan Mode: surface options, tradeoffs, risks, and validation steps explicitly.
</system_reminder>
  `.trim(),
  planReminderSub: `
<system_reminder>
- In Plan Mode (subagents): surface options, tradeoffs, risks, and validation steps explicitly.
</system_reminder>
  `.trim(),
  taskTool: `
Maximal mode: use Task to parallelize independent research/debugging and to keep the main thread focused.
  `.trim(),
  enterPlan: `
Maximal mode: enter Plan Mode early for ambiguous, multi-step, or high-risk tasks.
  `.trim(),
  exitPlan: `
Maximal mode: return a crisp plan with options, checkpoints, verification, and rollback considerations.
  `.trim(),
  skill: `
Maximal mode: use Skills when they provide sharper domain knowledge or integrations; otherwise proceed normally.
  `.trim(),
  conversationSummary: `
<system_reminder>
- Capture decisions, constraints, open questions, and next steps.
- Preserve critical commands, configs, and file paths.
</system_reminder>
  `.trim(),
  conversationSummaryExtended: `
<system_reminder>
- Capture decisions, constraints, open questions, and next steps.
- Preserve critical commands, configs, and file paths.
</system_reminder>
  `.trim(),
  webfetchSummary: `
<system_reminder>
- Extract key facts, titles, and constraints.
- Preserve URLs and important context verbatim.
</system_reminder>
  `.trim(),
});

const buildProviderOverlays = (provider: PromptPackKey, mode: PromptPackMode): OverlayMap => {
  if (provider === 'zai') return buildZaiOverlays(mode);
  return buildMinimaxOverlays(mode);
};

export const resolveOverlays = (provider: PromptPackKey, mode: PromptPackMode): OverlayMap => {
  const base = buildProviderOverlays(provider, mode);
  const overlays = mode === 'maximal' ? mergeOverlays(base, buildMaximalOverlays(provider)) : base;
  return sanitizeOverlayMap(overlays);
};
