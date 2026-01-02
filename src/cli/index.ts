import { listProviders, getProvider } from '../providers/index.js';
import { listBrandPresets } from '../brands/index.js';
import * as core from '../core/index.js';
import type { VariantMeta } from '../core/types.js';
import { parseArgs } from './args.js';
import { printHelp } from './help.js';
import { printDoctor } from './doctor.js';
import { prompt } from './prompt.js';
import { runTui, shouldLaunchTui } from './tui.js';
import path from 'node:path';
import type { ModelOverrides } from '../providers/index.js';

const buildShareUrl = (providerLabel: string, variant: string, mode?: 'minimal' | 'maximal') => {
  const lines = [
    `Just set up ${providerLabel} with cc-mirror`,
    mode ? `Prompt pack: ${mode}` : 'Prompt pack: enabled',
    `CLI: ${variant}`,
    'Get yours: npx cc-mirror',
    '(Attach your TUI screenshot)',
  ];
  const url = new URL('https://x.com/intent/tweet');
  url.searchParams.set('text', lines.join('\n'));
  return url.toString();
};

const printSummary = (opts: {
  action: string;
  meta: VariantMeta;
  wrapperPath?: string;
  notes?: string[];
  shareUrl?: string;
}) => {
  const { action, meta, wrapperPath, notes, shareUrl } = opts;
  console.log(`\n${action}: ${meta.name}`);
  console.log(`Provider: ${meta.provider}`);
  if (meta.promptPack !== undefined) {
    const mode = meta.promptPackMode || 'maximal';
    console.log(`Prompt pack: ${meta.promptPack ? `on (${mode})` : 'off'}`);
  }
  if (meta.skillInstall !== undefined) {
    console.log(`dev-browser skill: ${meta.skillInstall ? 'on' : 'off'}`);
  }
  if (meta.shellEnv !== undefined && meta.provider === 'zai') {
    console.log(`Shell env: ${meta.shellEnv ? 'write Z_AI_API_KEY' : 'manual'}`);
  }
  if (wrapperPath) console.log(`Wrapper: ${wrapperPath}`);
  if (meta.configDir) console.log(`Config: ${meta.configDir}`);
  if (notes && notes.length > 0) {
    console.log('Notes:');
    for (const note of notes) console.log(`- ${note}`);
  }
  console.log('Next steps:');
  console.log(`- Run: ${meta.name}`);
  console.log(`- Update: cc-mirror update ${meta.name}`);
  console.log(`- Tweak: cc-mirror tweak ${meta.name}`);
  console.log('Help: cc-mirror help');
  if (shareUrl) {
    console.log('Share:');
    console.log(shareUrl);
  }
  console.log('');
};

const buildExtraEnv = (opts: ReturnType<typeof parseArgs>) => {
  const env = Array.isArray(opts.env) ? [...opts.env] : [];
  const timeout = opts['timeout-ms'];
  if (typeof timeout === 'string' && timeout.trim().length > 0) {
    env.push(`API_TIMEOUT_MS=${timeout}`);
  }
  return env;
};

const parsePromptPackMode = (value?: string): 'minimal' | 'maximal' | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'minimal' || normalized === 'maximal') return normalized;
  return undefined;
};

const getModelOverridesFromArgs = (opts: ReturnType<typeof parseArgs>): ModelOverrides => ({
  sonnet: typeof opts['model-sonnet'] === 'string' ? (opts['model-sonnet'] as string) : undefined,
  opus: typeof opts['model-opus'] === 'string' ? (opts['model-opus'] as string) : undefined,
  haiku: typeof opts['model-haiku'] === 'string' ? (opts['model-haiku'] as string) : undefined,
  smallFast: typeof opts['model-small-fast'] === 'string' ? (opts['model-small-fast'] as string) : undefined,
  defaultModel: typeof opts['model-default'] === 'string' ? (opts['model-default'] as string) : undefined,
  subagentModel: typeof opts['model-subagent'] === 'string' ? (opts['model-subagent'] as string) : undefined,
});

const requirePrompt = async (label: string, value?: string): Promise<string> => {
  let next = (value ?? '').trim();
  while (!next) {
    next = (await prompt(label, value)).trim();
    if (!next) {
      console.log('Value required.');
    }
  }
  return next;
};

const ensureModelMapping = async (
  providerKey: string,
  opts: ReturnType<typeof parseArgs>,
  overrides: ModelOverrides
): Promise<ModelOverrides> => {
  const provider = getProvider(providerKey);
  if (!provider?.requiresModelMapping) return overrides;
  const missing = {
    sonnet: (overrides.sonnet ?? '').trim().length === 0,
    opus: (overrides.opus ?? '').trim().length === 0,
    haiku: (overrides.haiku ?? '').trim().length === 0,
  };
  if (opts.yes && (missing.sonnet || missing.opus || missing.haiku)) {
    throw new Error('OpenRouter/Local LLMs require --model-sonnet/--model-opus/--model-haiku');
  }
  if (!opts.yes) {
    if (missing.sonnet) overrides.sonnet = await requirePrompt('Default Sonnet model', overrides.sonnet);
    if (missing.opus) overrides.opus = await requirePrompt('Default Opus model', overrides.opus);
    if (missing.haiku) overrides.haiku = await requirePrompt('Default Haiku model', overrides.haiku);
  }
  return overrides;
};

const formatModelNote = (overrides: ModelOverrides): string | null => {
  const entries = [
    ['sonnet', overrides.sonnet],
    ['opus', overrides.opus],
    ['haiku', overrides.haiku],
  ].filter(([, value]) => value && String(value).trim().length > 0) as Array<[string, string]>;
  if (entries.length === 0) return null;
  const text = entries.map(([key, value]) => `${key}=${value}`).join(', ');
  return `Model mapping: ${text}`;
};

const main = async () => {
  const argv = process.argv.slice(2);
  let cmd = argv.length > 0 && !argv[0].startsWith('-') ? (argv.shift() as string) : 'create';
  const opts = parseArgs(argv);
  const quickMode = cmd === 'quick' || Boolean(opts.quick || opts.simple);
  const promptPack = opts['no-prompt-pack'] ? false : undefined;
  const promptPackMode = parsePromptPackMode(opts['prompt-pack-mode'] as string | undefined);
  const skillInstall = opts['no-skill-install'] ? false : undefined;
  const skillUpdate = Boolean(opts['skill-update']);
  const shellEnv = opts['no-shell-env'] ? false : opts['shell-env'] ? true : undefined;
  const modelOverrides = getModelOverridesFromArgs(opts);
  if (cmd === 'quick') cmd = 'create';

  if (cmd === 'help' || cmd === '--help' || opts.help) {
    printHelp();
    return;
  }

  if (shouldLaunchTui(cmd, opts)) {
    await runTui();
    return;
  }

  if (cmd === 'list') {
    const variants = core.listVariants((opts.root as string) || core.DEFAULT_ROOT);
    if (variants.length === 0) {
      console.log(`No variants found in ${(opts.root as string) || core.DEFAULT_ROOT}`);
      return;
    }
    for (const entry of variants) console.log(entry.name);
    return;
  }

  if (cmd === 'doctor') {
    const report = core.doctor(
      (opts.root as string) || core.DEFAULT_ROOT,
      (opts['bin-dir'] as string) || core.DEFAULT_BIN_DIR
    );
    printDoctor(report);
    return;
  }

  if (cmd === 'update') {
    const target = opts._ && opts._[0];
    const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
    const names = target ? [target] : core.listVariants(rootDir).map(entry => entry.name);
    if (names.length === 0) {
      console.log(`No variants found in ${rootDir}`);
      return;
    }
    for (const name of names) {
      const result = core.updateVariant(rootDir, name, {
        binDir: opts['bin-dir'] as string | undefined,
        npmPackage: opts['npm-package'] as string | undefined,
        brand: opts.brand as string | undefined,
        noTweak: Boolean(opts.noTweak),
        promptPack,
        promptPackMode,
        skillInstall,
        shellEnv,
        skillUpdate,
      });
      const wrapperPath = path.join((opts['bin-dir'] as string) || core.DEFAULT_BIN_DIR, name);
      printSummary({ action: 'Updated', meta: result.meta, wrapperPath, notes: result.notes });
    }
    return;
  }

  if (cmd === 'remove') {
    const target = opts._ && opts._[0];
    if (!target) {
      console.error('remove requires a variant name');
      process.exit(1);
    }
    core.removeVariant((opts.root as string) || core.DEFAULT_ROOT, target);
    console.log(`Removed ${target}`);
    return;
  }

  if (cmd === 'tweak') {
    const target = opts._ && opts._[0];
    if (!target) {
      console.error('tweak requires a variant name');
      process.exit(1);
    }
    core.tweakVariant((opts.root as string) || core.DEFAULT_ROOT, target);
    return;
  }

  if (cmd === 'create') {
    let providerKey = opts.provider as string | undefined;
    if (!providerKey && !opts.yes) {
      const providers = listProviders().map(p => p.key).join(', ');
      providerKey = await prompt(`Provider (${providers})`, 'zai');
    }
    providerKey = providerKey || 'zai';
    const provider = getProvider(providerKey);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerKey}`);
    }

    const name = (opts.name as string) || providerKey;
    const baseUrl = (opts['base-url'] as string) || provider.baseUrl;
    const envZaiKey = providerKey === 'zai' ? process.env.Z_AI_API_KEY : undefined;
    const envAnthropicKey = providerKey === 'zai' ? process.env.ANTHROPIC_API_KEY : undefined;
    const hasApiKeyFlag = Boolean(opts['api-key']);
    const hasZaiEnv = Boolean(envZaiKey);
    const apiKeyDetected = !hasApiKeyFlag && hasZaiEnv;
    let apiKey =
      (opts['api-key'] as string) || (providerKey === 'zai' ? envZaiKey || envAnthropicKey || '' : '');
    if (apiKeyDetected && !opts.yes) {
      console.log('Detected Z_AI_API_KEY in environment. Using it by default.');
    }
    const brand = (opts.brand as string) || 'auto';
    const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
    const binDir = (opts['bin-dir'] as string) || core.DEFAULT_BIN_DIR;
    const npmPackage = (opts['npm-package'] as string) || core.DEFAULT_NPM_PACKAGE;
    const extraEnv = buildExtraEnv(opts);

    const requiresCredential = !provider.credentialOptional;
    const shouldPromptApiKey =
      !opts.yes && !hasApiKeyFlag && (providerKey === 'zai' ? !hasZaiEnv : !apiKey);

    if (quickMode) {
      if (shouldPromptApiKey) {
        apiKey = requiresCredential
          ? await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey)
          : await prompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey);
      }
      if (requiresCredential && !apiKey) {
        if (opts.yes) {
          throw new Error('Provider API key required (use --api-key)');
        }
        apiKey = await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey);
      }
      const resolvedModelOverrides = await ensureModelMapping(providerKey, opts, { ...modelOverrides });
      let nextShellEnv = shellEnv;
      if (providerKey === 'zai' && nextShellEnv === undefined && !opts.yes) {
        if (hasZaiEnv) {
          nextShellEnv = false;
        } else {
          const answer = await prompt('Write Z_AI_API_KEY to your shell profile? (yes/no)', 'yes');
          nextShellEnv = answer.trim().toLowerCase().startsWith('y');
        }
      }
      const result = core.createVariant({
        name,
        providerKey,
        baseUrl,
        apiKey,
        brand,
        extraEnv,
        rootDir,
        binDir,
        npmPackage,
        noTweak: Boolean(opts.noTweak),
        promptPack,
        promptPackMode,
        skillInstall,
        shellEnv: nextShellEnv,
        skillUpdate,
        modelOverrides: resolvedModelOverrides,
      });
      const shareUrl = buildShareUrl(provider.label || providerKey, name, result.meta.promptPackMode);
      const modelNote = formatModelNote(resolvedModelOverrides);
      const notes = [...(result.notes || []), ...(modelNote ? [modelNote] : [])];
      printSummary({
        action: 'Created',
        meta: result.meta,
        wrapperPath: result.wrapperPath,
        notes: notes.length > 0 ? notes : undefined,
        shareUrl,
      });
      return;
    }

    if (!opts.yes) {
      const nextName = await prompt('Variant name', name);
      const nextBase = await prompt('ANTHROPIC_BASE_URL', baseUrl);
      let nextKey = shouldPromptApiKey
        ? requiresCredential
          ? await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey)
          : await prompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey)
        : apiKey;
      if (requiresCredential && !nextKey) {
        nextKey = await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey);
      }
      const resolvedModelOverrides = await ensureModelMapping(providerKey, opts, { ...modelOverrides });
      const brandOptions = listBrandPresets().map(item => item.key).join(', ');
      const brandHint = brandOptions.length > 0 ? `auto, none, ${brandOptions}` : 'auto, none';
      const nextBrand = await prompt(`Brand preset (${brandHint})`, brand);
      const nextRoot = await prompt('Variants root directory', rootDir);
      const nextBin = await prompt('Wrapper install directory', binDir);
      let nextNpmPackage = npmPackage;
      nextNpmPackage = await prompt('NPM package', npmPackage);

      const envInput = await prompt('Extra env (KEY=VALUE, comma separated)', extraEnv.join(','));
      const parsedEnv = envInput
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean);
      let nextShellEnv = shellEnv;
      if (providerKey === 'zai' && nextShellEnv === undefined) {
        if (hasZaiEnv) {
          nextShellEnv = false;
        } else {
          const answer = await prompt('Write Z_AI_API_KEY to your shell profile? (yes/no)', 'yes');
          nextShellEnv = answer.trim().toLowerCase().startsWith('y');
        }
      }

      const result = core.createVariant({
        name: nextName,
        providerKey,
        baseUrl: nextBase,
        apiKey: nextKey,
        brand: nextBrand,
        extraEnv: parsedEnv,
        rootDir: nextRoot,
        binDir: nextBin,
        npmPackage: nextNpmPackage,
        noTweak: Boolean(opts.noTweak),
        promptPack,
        promptPackMode,
        skillInstall,
        shellEnv: nextShellEnv,
        skillUpdate,
        modelOverrides: resolvedModelOverrides,
      });
      const shareUrl = buildShareUrl(provider.label || providerKey, result.meta.name, result.meta.promptPackMode);
      const modelNote = formatModelNote(resolvedModelOverrides);
      const notes = [...(result.notes || []), ...(modelNote ? [modelNote] : [])];
      printSummary({
        action: 'Created',
        meta: result.meta,
        wrapperPath: result.wrapperPath,
        notes: notes.length > 0 ? notes : undefined,
        shareUrl,
      });
    } else {
      if (requiresCredential && !apiKey) {
        throw new Error('Provider API key required (use --api-key)');
      }
      const resolvedModelOverrides = await ensureModelMapping(providerKey, opts, { ...modelOverrides });
      const result = core.createVariant({
        name,
        providerKey,
        baseUrl,
        apiKey,
        brand,
        extraEnv,
        rootDir,
        binDir,
        npmPackage,
        noTweak: Boolean(opts.noTweak),
        promptPack,
        promptPackMode,
        skillInstall,
        shellEnv,
        skillUpdate,
        modelOverrides: resolvedModelOverrides,
      });
      const shareUrl = buildShareUrl(provider.label || providerKey, result.meta.name, result.meta.promptPackMode);
      const modelNote = formatModelNote(resolvedModelOverrides);
      const notes = [...(result.notes || []), ...(modelNote ? [modelNote] : [])];
      printSummary({
        action: 'Created',
        meta: result.meta,
        wrapperPath: result.wrapperPath,
        notes: notes.length > 0 ? notes : undefined,
        shareUrl,
      });
    }
    return;
  }

  printHelp();
};

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
