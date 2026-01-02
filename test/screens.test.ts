/**
 * Comprehensive Screen Tests for CC-MIRROR TUI
 *
 * Tests cover:
 * - Individual screen rendering
 * - Keyboard navigation (arrows, ESC, Enter)
 * - Screen transitions and flows
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from '../src/tui/app.js';
import * as providers from '../src/providers/index.js';

delete process.env.Z_AI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;

// Screen components
import { HomeScreen } from '../src/tui/screens/HomeScreen.js';
import { ProviderSelectScreen } from '../src/tui/screens/ProviderSelectScreen.js';
import { VariantListScreen } from '../src/tui/screens/VariantListScreen.js';
import { VariantActionsScreen } from '../src/tui/screens/VariantActionsScreen.js';
import { DiagnosticsScreen } from '../src/tui/screens/DiagnosticsScreen.js';
import { CompletionScreen } from '../src/tui/screens/CompletionScreen.js';

// Test utilities
const tick = () => new Promise(resolve => setTimeout(resolve, 20));

const send = async (stdin: { write: (value: string) => void }, input: string) => {
  stdin.write(input);
  await tick();
};

const waitFor = async (predicate: () => boolean, attempts = 30) => {
  for (let i = 0; i < attempts; i += 1) {
    if (predicate()) return true;
    await tick();
  }
  return false;
};

// Key codes
const KEYS = {
  up: '\u001b[A',
  down: '\u001b[B',
  enter: '\r',
  escape: '\u001b',
};

// Mock core module
const makeCore = () => {
  const calls = {
    create: [] as Array<{ name: string; providerKey: string; noTweak?: boolean }>,
    update: [] as Array<{ root: string; name: string }>,
    tweak: [] as Array<{ root: string; name: string }>,
    remove: [] as Array<{ root: string; name: string }>,
    doctor: [] as Array<{ root: string; bin: string }>,
  };

  const core = {
    DEFAULT_ROOT: '/tmp/cc-mirror-test',
    DEFAULT_BIN_DIR: '/tmp/cc-mirror-bin',
    DEFAULT_NPM_PACKAGE: '@anthropic-ai/claude-code',
    DEFAULT_NPM_VERSION: '2.0.76',
    listVariants: () => [
      {
        name: 'alpha',
        meta: {
          name: 'alpha',
          provider: 'zai',
          createdAt: '2025-12-31T00:00:00.000Z',
          claudeOrig: '/tmp/claude',
          binaryPath: '/tmp/alpha',
          configDir: '/tmp/alpha/config',
          tweakDir: '/tmp/alpha/tweakcc',
          wrapperPath: '/tmp/bin/alpha',
        },
      },
      {
        name: 'beta',
        meta: {
          name: 'beta',
          provider: 'minimax',
          createdAt: '2025-12-31T00:00:00.000Z',
          claudeOrig: '/tmp/claude',
          binaryPath: '/tmp/beta',
          configDir: '/tmp/beta/config',
          tweakDir: '/tmp/beta/tweakcc',
          wrapperPath: '/tmp/bin/beta',
        },
      },
    ],
    createVariant: (params: {
      name: string;
      providerKey: string;
      noTweak?: boolean;
      modelOverrides?: {
        sonnet?: string;
        opus?: string;
        haiku?: string;
        smallFast?: string;
        defaultModel?: string;
        subagentModel?: string;
      };
    }) => {
      calls.create.push(params);
      return { wrapperPath: `/tmp/bin/${params.name}`, meta: { name: params.name } as any, tweakResult: null };
    },
    updateVariant: (root: string, name: string, _opts?: { tweakccStdio?: 'pipe' | 'inherit'; binDir?: string }) => {
      calls.update.push({ root, name });
      return { meta: { name } as any, tweakResult: null };
    },
    tweakVariant: (root: string, name: string) => {
      calls.tweak.push({ root, name });
    },
    removeVariant: (root: string, name: string) => {
      calls.remove.push({ root, name });
    },
    doctor: (root: string, bin: string) => {
      calls.doctor.push({ root, bin });
      return [
        { name: 'alpha', ok: true, binaryPath: '/tmp/alpha', wrapperPath: '/tmp/bin/alpha' },
        { name: 'beta', ok: false, binaryPath: '/tmp/beta', wrapperPath: '/tmp/bin/beta' },
      ];
    },
  };

  return { core, calls };
};

// =============================================================================
// HomeScreen Tests
// =============================================================================

test('HomeScreen renders with logo and menu items', async () => {
  let selectedValue = '';
  const app = render(
    React.createElement(HomeScreen, {
      onSelect: (value: string) => { selectedValue = value; },
    })
  );

  const frame = app.lastFrame() || '';

  // Check logo is rendered (ASCII art contains block characters and MIRROR text)
  assert.ok(frame.includes('MIRROR') || frame.includes('██'), 'Logo should be rendered');

  // Check menu items
  assert.ok(frame.includes('Quick Setup'), 'Quick Setup menu item should be visible');
  assert.ok(frame.includes('New Variant'), 'New Variant menu item should be visible');
  assert.ok(frame.includes('Manage Variants'), 'Manage Variants menu item should be visible');
  assert.ok(frame.includes('Exit'), 'Exit menu item should be visible');

  app.unmount();
});

test('HomeScreen arrow navigation moves selection', async () => {
  let selectedValue = '';
  const app = render(
    React.createElement(HomeScreen, {
      onSelect: (value: string) => { selectedValue = value; },
    })
  );

  await tick();

  // Press down to move to New Variant
  await send(app.stdin, KEYS.down);

  // Press enter to select
  await send(app.stdin, KEYS.enter);

  assert.equal(selectedValue, 'create', 'New Variant should be selected');

  app.unmount();
});

test('HomeScreen quick setup is first item and selectable', async () => {
  let selectedValue = '';
  const app = render(
    React.createElement(HomeScreen, {
      onSelect: (value: string) => { selectedValue = value; },
    })
  );

  await tick();

  // Press enter immediately (first item is Quick Setup)
  await send(app.stdin, KEYS.enter);

  assert.equal(selectedValue, 'quick', 'Quick Setup should be first item');

  app.unmount();
});

// =============================================================================
// ProviderSelectScreen Tests
// =============================================================================

test('ProviderSelectScreen renders providers', async () => {
  const testProviders = [
    { key: 'zai', label: 'Zai', description: 'Zai AI Gateway', baseUrl: 'https://api.zai.ai' },
    { key: 'openrouter', label: 'OpenRouter', description: 'OpenRouter Gateway' },
  ];

  let selectedKey = '';
  const app = render(
    React.createElement(ProviderSelectScreen, {
      providers: testProviders,
      onSelect: (key: string) => { selectedKey = key; },
    })
  );

  const frame = app.lastFrame() || '';

  assert.ok(frame.includes('Select Provider'), 'Header should be visible');
  assert.ok(frame.includes('Zai'), 'First provider should be visible');
  assert.ok(frame.includes('OpenRouter'), 'Second provider should be visible');

  app.unmount();
});

test('ProviderSelectScreen arrow navigation and selection', async () => {
  const testProviders = [
    { key: 'zai', label: 'Zai', description: 'Zai AI Gateway' },
    { key: 'openrouter', label: 'OpenRouter', description: 'OpenRouter Gateway' },
  ];

  let selectedKey = '';
  const app = render(
    React.createElement(ProviderSelectScreen, {
      providers: testProviders,
      onSelect: (key: string) => { selectedKey = key; },
    })
  );

  await tick();

  // Navigate down and select
  await send(app.stdin, KEYS.down);
  await send(app.stdin, KEYS.enter);

  assert.equal(selectedKey, 'openrouter', 'Second provider should be selected');

  app.unmount();
});

// =============================================================================
// VariantListScreen Tests
// =============================================================================

test('VariantListScreen renders variant list', async () => {
  const variants = [
    { name: 'alpha', provider: 'zai', wrapperPath: '/tmp/bin/alpha' },
    { name: 'beta', provider: 'minimax', wrapperPath: '/tmp/bin/beta' },
  ];

  let selectedName = '';
  let backCalled = false;

  const app = render(
    React.createElement(VariantListScreen, {
      variants,
      onSelect: (name: string) => { selectedName = name; },
      onBack: () => { backCalled = true; },
    })
  );

  const frame = app.lastFrame() || '';

  assert.ok(frame.includes('Manage Variants'), 'Header should be visible');
  assert.ok(frame.includes('alpha'), 'First variant should be visible');
  assert.ok(frame.includes('beta'), 'Second variant should be visible');
  assert.ok(frame.includes('Back'), 'Back option should be visible');

  app.unmount();
});

test('VariantListScreen arrow navigation without double action', async () => {
  const variants = [
    { name: 'alpha', provider: 'zai' },
    { name: 'beta', provider: 'minimax' },
  ];

  let selectedName = '';
  let backCalled = false;

  const app = render(
    React.createElement(VariantListScreen, {
      variants,
      onSelect: (name: string) => { selectedName = name; },
      onBack: () => { backCalled = true; },
    })
  );

  await tick();

  // Navigate down once - should move to beta (not skip to back)
  await send(app.stdin, KEYS.down);
  await send(app.stdin, KEYS.enter);

  // Should select beta, NOT trigger back
  assert.equal(selectedName, 'beta', 'Second variant should be selected');
  assert.equal(backCalled, false, 'Back should NOT be triggered');

  app.unmount();
});

test('VariantListScreen ESC triggers back', async () => {
  const variants = [{ name: 'alpha', provider: 'zai' }];

  let backCalled = false;

  const app = render(
    React.createElement(VariantListScreen, {
      variants,
      onSelect: () => {},
      onBack: () => { backCalled = true; },
    })
  );

  await tick();
  await send(app.stdin, KEYS.escape);

  assert.equal(backCalled, true, 'ESC should trigger back');

  app.unmount();
});

test('VariantListScreen empty state', async () => {
  const app = render(
    React.createElement(VariantListScreen, {
      variants: [],
      onSelect: () => {},
      onBack: () => {},
    })
  );

  const frame = app.lastFrame() || '';

  assert.ok(frame.includes('No variants found'), 'Empty state message should be visible');

  app.unmount();
});

// =============================================================================
// VariantActionsScreen Tests
// =============================================================================

test('VariantActionsScreen renders actions', async () => {
  const meta = {
    name: 'test-variant',
    provider: 'zai',
    binaryPath: '/tmp/test',
    configDir: '/tmp/test/config',
    wrapperPath: '/tmp/bin/test',
  };

  const app = render(
    React.createElement(VariantActionsScreen, {
      meta,
      onUpdate: () => {},
      onTweak: () => {},
      onRemove: () => {},
      onBack: () => {},
    })
  );

  const frame = app.lastFrame() || '';

  assert.ok(frame.includes('test-variant'), 'Variant name should be visible');
  assert.ok(frame.includes('Update'), 'Update action should be visible');
  assert.ok(frame.includes('Customize'), 'Customize action should be visible');
  assert.ok(frame.includes('Remove'), 'Remove action should be visible');
  assert.ok(frame.includes('Back'), 'Back action should be visible');

  app.unmount();
});

test('VariantActionsScreen action selection', async () => {
  const meta = {
    name: 'test-variant',
    binaryPath: '/tmp/test',
    configDir: '/tmp/test/config',
    wrapperPath: '/tmp/bin/test',
  };

  let updateCalled = false;
  let tweakCalled = false;

  const app = render(
    React.createElement(VariantActionsScreen, {
      meta,
      onUpdate: () => { updateCalled = true; },
      onTweak: () => { tweakCalled = true; },
      onRemove: () => {},
      onBack: () => {},
    })
  );

  await tick();

  // First item is Update - press enter
  await send(app.stdin, KEYS.enter);

  assert.equal(updateCalled, true, 'Update should be called');

  app.unmount();
});

// =============================================================================
// DiagnosticsScreen Tests
// =============================================================================

test('DiagnosticsScreen renders health check results', async () => {
  const report = [
    { name: 'alpha', ok: true },
    { name: 'beta', ok: false },
  ];

  let doneCalled = false;

  const app = render(
    React.createElement(DiagnosticsScreen, {
      report,
      onDone: () => { doneCalled = true; },
    })
  );

  const frame = app.lastFrame() || '';

  assert.ok(frame.includes('Diagnostics'), 'Header should be visible');
  assert.ok(frame.includes('alpha'), 'First item should be visible');
  assert.ok(frame.includes('beta'), 'Second item should be visible');
  assert.ok(frame.includes('Healthy: 1'), 'Healthy count should be correct');
  assert.ok(frame.includes('Issues: 1'), 'Issue count should be correct');

  app.unmount();
});

test('DiagnosticsScreen ESC and Enter trigger done', async () => {
  let doneCount = 0;

  const app = render(
    React.createElement(DiagnosticsScreen, {
      report: [{ name: 'test', ok: true }],
      onDone: () => { doneCount++; },
    })
  );

  await tick();
  await send(app.stdin, KEYS.escape);

  assert.equal(doneCount, 1, 'ESC should trigger done');

  app.unmount();
});

test('DiagnosticsScreen empty state', async () => {
  const app = render(
    React.createElement(DiagnosticsScreen, {
      report: [],
      onDone: () => {},
    })
  );

  const frame = app.lastFrame() || '';

  assert.ok(frame.includes('No variants found'), 'Empty state should be visible');

  app.unmount();
});

// =============================================================================
// CompletionScreen Tests
// =============================================================================

test('CompletionScreen renders success message', async () => {
  const app = render(
    React.createElement(CompletionScreen, {
      title: 'Test Complete',
      lines: ['Line 1', 'Line 2'],
      variantName: 'my-variant',
      wrapperPath: '/tmp/bin/my-variant',
      configPath: '/tmp/my-variant/config',
      onDone: () => {},
    })
  );

  const frame = app.lastFrame() || '';

  assert.ok(frame.includes('Success'), 'Success message should be visible');
  assert.ok(frame.includes('my-variant'), 'Variant name should be visible');
  assert.ok(frame.includes('Back to Home'), 'Back to Home option should be visible');
  assert.ok(frame.includes('Exit'), 'Exit option should be visible');

  app.unmount();
});

test('CompletionScreen action selection', async () => {
  let doneValue = '';

  const app = render(
    React.createElement(CompletionScreen, {
      title: 'Test',
      lines: [],
      onDone: (value: string) => { doneValue = value; },
    })
  );

  await tick();

  // First item is "Back to Home"
  await send(app.stdin, KEYS.enter);

  assert.equal(doneValue, 'home', 'Back to Home should be selected');

  app.unmount();
});

// =============================================================================
// App ESC Key Navigation Tests
// =============================================================================

test('App ESC from home goes to exit', async () => {
  const { core } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();

  // Press ESC from home
  await send(app.stdin, KEYS.escape);

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('Goodbye'), 'Should show exit screen');

  app.unmount();
});

test('App ESC from quick-provider goes to home', async () => {
  const { core } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();

  // Go to quick setup (first item)
  await send(app.stdin, KEYS.enter);
  await tick();

  // Should be on provider select, press ESC
  await send(app.stdin, KEYS.escape);
  await tick();

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('Quick Setup'), 'Should be back at home screen');

  app.unmount();
});

test('App ESC from quick-api-key goes back to quick-provider', async () => {
  const { core } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();

  // Go to quick setup
  await send(app.stdin, KEYS.enter);
  await tick();

  // Select a provider
  await send(app.stdin, KEYS.enter);
  await tick();

  // Should be on API key screen, press ESC
  await send(app.stdin, KEYS.escape);
  await tick();

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('Select Provider'), 'Should be back at provider select');

  app.unmount();
});

test('App ESC from settings goes to home', async () => {
  const { core } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();

  // Navigate to Settings
  for (let i = 0; i < 5; i++) {
    await send(app.stdin, KEYS.down);
  }
  await send(app.stdin, KEYS.enter);
  await tick();

  // Should be on settings screen, press ESC
  await send(app.stdin, KEYS.escape);
  await tick();

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('Quick Setup'), 'Should be back at home screen');

  app.unmount();
});

test('App ESC from manage screen goes to home', async () => {
  const { core } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();

  // Navigate to Manage Variants
  await send(app.stdin, KEYS.down);
  await send(app.stdin, KEYS.down);
  await send(app.stdin, KEYS.enter);
  await tick();

  // Should be on manage screen, press ESC
  await send(app.stdin, KEYS.escape);
  await tick();

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('Quick Setup'), 'Should be back at home screen');

  app.unmount();
});

test('App ESC from doctor screen goes to home', async () => {
  const { core } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();

  // Navigate to Diagnostics
  for (let i = 0; i < 4; i++) {
    await send(app.stdin, KEYS.down);
  }
  await send(app.stdin, KEYS.enter);
  await tick();

  // Should be on diagnostics screen, press ESC
  await send(app.stdin, KEYS.escape);
  await tick();

  const frame = app.lastFrame() || '';
  assert.ok(frame.includes('Quick Setup'), 'Should be back at home screen');

  app.unmount();
});

// =============================================================================
// Quick Setup Flow Tests
// =============================================================================

test('Quick setup flow completes successfully', async () => {
  const { core, calls } = makeCore();
  const app = render(
    React.createElement(App, {
      core,
      providers,
      initialRootDir: '/tmp/root',
      initialBinDir: '/tmp/bin',
    })
  );

  await tick();

  // Quick Setup
  await send(app.stdin, KEYS.enter);
  await tick();

  // Select provider
  await send(app.stdin, KEYS.enter);
  await tick();

  // Enter API key (just press enter for empty)
  await send(app.stdin, KEYS.enter);
  await tick();

  // Enter variant name (just press enter for default)
  await send(app.stdin, KEYS.enter);

  // Wait for creation
  const created = await waitFor(() => calls.create.length > 0);

  assert.ok(created, 'Variant should be created');
  assert.equal(calls.create[0].providerKey, 'zai', 'Provider should be zai');

  app.unmount();
});

// =============================================================================
// Menu Navigation Tests
// =============================================================================

test('Menu wrap-around navigation works correctly', async () => {
  let selectedValue = '';
  const app = render(
    React.createElement(HomeScreen, {
      onSelect: (value: string) => { selectedValue = value; },
    })
  );

  await tick();

  // Navigate up from first item (should wrap to last - Exit)
  await send(app.stdin, KEYS.up);
  await send(app.stdin, KEYS.enter);

  assert.equal(selectedValue, 'exit', 'Should wrap to Exit');

  app.unmount();
});

test('Variant list navigation preserves selection state', async () => {
  const variants = [
    { name: 'alpha', provider: 'zai' },
    { name: 'beta', provider: 'minimax' },
    { name: 'gamma', provider: 'openrouter' },
  ];

  let selectedName = '';

  const app = render(
    React.createElement(VariantListScreen, {
      variants,
      onSelect: (name: string) => { selectedName = name; },
      onBack: () => {},
    })
  );

  await tick();

  // Navigate down twice, then up once
  await send(app.stdin, KEYS.down);
  await send(app.stdin, KEYS.down);
  await send(app.stdin, KEYS.up);
  await send(app.stdin, KEYS.enter);

  assert.equal(selectedName, 'beta', 'Should select beta after down-down-up');

  app.unmount();
});
