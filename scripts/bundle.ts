import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

fs.mkdirSync(distDir, { recursive: true });

const external = ['react-devtools-core'];

await build({
  entryPoints: [path.join(root, 'src', 'cli', 'index.ts')],
  outfile: path.join(distDir, 'cc-mirror.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  external,
  banner: {
    js: '#!/usr/bin/env node',
  },
});

await build({
  entryPoints: [path.join(root, 'src', 'tui', 'index.tsx')],
  outfile: path.join(distDir, 'tui.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  external,
  banner: {
    js: '#!/usr/bin/env node',
  },
});

fs.chmodSync(path.join(distDir, 'cc-mirror.mjs'), 0o755);
fs.chmodSync(path.join(distDir, 'tui.mjs'), 0o755);

console.log('Bundled to dist/cc-mirror.mjs and dist/tui.mjs');
