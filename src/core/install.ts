import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { commandExists } from './paths.js';

export const resolveNpmCliPath = (npmDir: string, npmPackage: string): string => {
  const packageParts = npmPackage.split('/');
  return path.join(npmDir, 'node_modules', ...packageParts, 'cli.js');
};

export const installNpmClaude = (params: {
  npmDir: string;
  npmPackage: string;
  npmVersion: string;
  stdio?: 'inherit' | 'pipe';
}): { cliPath: string } => {
  if (!commandExists('npm')) {
    throw new Error('npm is required for npm-based installs.');
  }

  const stdio = params.stdio ?? 'inherit';
  const pkgSpec = params.npmVersion ? `${params.npmPackage}@${params.npmVersion}` : params.npmPackage;
  const result = spawnSync('npm', ['install', '--prefix', params.npmDir, '--no-save', pkgSpec], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (stdio === 'inherit') {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim();
    const tail = output.length > 0 ? `\n${output}` : '';
    throw new Error(`npm install failed for ${pkgSpec}.${tail}`);
  }

  const cliPath = resolveNpmCliPath(params.npmDir, params.npmPackage);
  if (!fs.existsSync(cliPath)) {
    throw new Error(`npm install succeeded but cli.js was not found at ${cliPath}`);
  }

  return { cliPath };
};
