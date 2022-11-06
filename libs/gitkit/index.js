#!/usr/bin/env node

import { Command } from 'commander';
import deepmerge from 'deepmerge';
import fs from 'fs';
import { execaCommand } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import logger from './logger.js';
import setupGitHooksFeature from './githook.js';
import setupReleasePackagesFeature from './release.js';
import setupCommitlintFeature from './commitlint.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const program = new Command();
const execPath = process.cwd();
const defaultConfig = {
  features: {},
  hooks: {},
};

const getConfigFromPackageJson = (cwd = execPath) => {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('Package.json not found');
  }

  const gitKitConfig = (require(packageJsonPath) || {}).gitkit;

  return gitKitConfig;
};

program.name('gitkit').description('CLI to git-hook utility collection');

program.command('version').action(async () => {
  const version = require(path.join(__dirname, 'package.json')).version;
  logger.info(version);
});

program
  .command('setup')
  .description('Setup git-hook core features')
  .action(async () => {
    await execaCommand('npx husky install', { stdio: 'inherit' });

    const userConfig = getConfigFromPackageJson();
    if (!userConfig) {
      logger.warn('Gitkit config not found, no feature will be installed');

      return;
    }

    const config = deepmerge(defaultConfig, userConfig);
    await setupGitHooksFeature(config.hooks);

    if (config.features.commitlint) {
      await setupCommitlintFeature(execPath);
      await setupGitHooksFeature({
        'commit-msg': 'npx --no -- commitlint --edit ${1}',
      });
    }
  });

program
  .command('release')
  .description('Generate changelog and release packages')
  .action(async () => {
    const userConfig = getConfigFromPackageJson();
    if (!userConfig) {
      logger.warn('Gitkit config not found, no feature will be installed');

      return;
    }

    await setupReleasePackagesFeature(userConfig.features.release);
  });

program.parse();
