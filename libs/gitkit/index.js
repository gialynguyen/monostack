#!/usr/bin/env node

import { Command } from 'commander';
import deepmerge from 'deepmerge';
import fs from 'fs';
import { execa as exec, execaCommand } from 'execa';
import path from 'path';
import util from 'util';
import os from 'os';
import fg from 'fast-glob';
import prompts from 'prompts';
import semver from 'semver';
import { fileURLToPath } from 'url';
import gitRawCommits from 'git-raw-commits';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const program = new Command();
const execPath = process.cwd();
const writeFile = util.promisify(fs.writeFile);
const exists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);
const huskyDir = `.husky/gitkit/`;

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

const addHuskyHook = async (hook, filePath, cmd) => {
  const shScrip = `. "$(dirname -- "$0")/gitkit/${hook}.sh"`;

  if (!(await exists(filePath))) {
    await exec('npx', ['husky', 'set', filePath, shScrip]);
  }

  const shFilePath = path.join(execPath, huskyDir, `${hook}.sh`);

  await writeFile(shFilePath, cmd, { mode: 0o777, flag: 'w' });
};

const setupGitHooksFeatures = async (hooksConfig = {}) => {
  const processes = [];
  if (!(await exists(huskyDir))) {
    await mkdir(huskyDir, { recursive: true });
  }

  for (const hook in hooksConfig) {
    if (hooksConfig.hasOwnProperty(hook)) {
      const cmd = hooksConfig[hook];
      const filePath = `.husky/${hook}`;

      processes.push(addHuskyHook(hook, filePath, cmd));
    }
  }

  await Promise.all(processes);
};

const setupCommitlintFeature = async () => {
  const defaultPlugins = ['@commitlint/config-conventional'];
  const commitlintConfigFile = [
    '.commitlintrc',
    '.commitlintrc.json',
    '.commitlintrc.yaml',
    '.commitlintrc.yml',
    '.commitlintrc.js',
    '.commitlintrc.cjs',
    '.commitlintrc.ts',
    'commitlint.config.js',
    'commitlint.config.cjs',
    'commitlint.config.ts',
  ];

  let existConfigFile = commitlintConfigFile.some(fileName => {
    return fs.existsSync(path.join(execPath, fileName));
  });

  if (!existConfigFile) {
    const packageJson = require(path.join(execPath, 'package.json')) || {};
    if (packageJson.commitlint) {
      existConfigFile = true;
    }
  }

  if (!existConfigFile) {
    const defaultConfigFile = fs
      .readFileSync(path.join(__dirname, 'commitlint.config.js'))
      .toString();

    fs.writeFileSync(
      path.join(execPath, 'commitlint.config.js'),
      defaultConfigFile
    );
    const listPkg = defaultPlugins.join(', ');
    logger.heading(`Please install packages: ${listPkg}`);
  }
};

const getLastTag = async packageName => {
  const tags = await exec(`git`, ['tag']).then(r =>
    r.stdout.split(os.EOL).filter(Boolean)
  );

  const prefix = `${packageName}@`;

  return tags
    .filter(tag => tag.startsWith(prefix))
    .sort()
    .reverse()[0];
};

const hasCommitFromTag = (path, tag) => {
  return new Promise(resolve => {
    try {
      let hasCommit = false;
      const stream = gitRawCommits({
        from: tag,
        path,
      })
        .on('data', data => {
          const commit = data.toString().split(os.EOL).filter(Boolean)?.[0];
          if (commit) {
            hasCommit = true;
            stream.destroy();
          }
        })
        .on('close', () => {
          resolve(hasCommit);
        });
    } catch (e) {
      resolve(undefined);
    }
  });
};

const releasePackages = async userConfig => {
  const defaultConfig = {
    packages: './',
    'git-tag': {
      'auto-add': true,
      'commit-message': 'chore(release): {{tag}} :tada:',
      'auto-push': true,
    },
    npm: {
      'auto-publish': false,
    },
    changelog: {
      enable: true,
      preset: 'conventionalcommits',
    },
  };

  const config = deepmerge(defaultConfig, userConfig);

  const packages = await fg(config.packages, {
    onlyDirectories: true,
    absolute: true,
  });

  const releasePackagesMetadata = [];

  await Promise.all(
    packages.map(async pkg => {
      const packageJsonPath = path.join(pkg, 'package.json');
      const packageJson = require(packageJsonPath);

      if (!packageJson) {
        throw new Error(`[${pkg}]: package.json not found`);
      }

      let { name, version: currentVersion } = packageJson;
      if (name.startsWith('@')) {
        name = name.split('/')[1];
      }

      if (!name) {
        throw new Error(`[${pkg}]: package's name missing`);
      }

      const lastTag = await getLastTag(name);
      let hasCommit = false;
      if (lastTag) {
        hasCommit = !!(await hasCommitFromTag(pkg, lastTag));
      }

      if (!lastTag || hasCommit) {
        releasePackagesMetadata.push({
          name,
          currentVersion,
          path: pkg,
          packageJsonPath,
        });
      }
    })
  );

  const getValidNextVersions = currentVersion => {
    const currentIsAlpha = currentVersion.includes('alpha');
    const currentIsBeta = currentVersion.includes('beta');
    const currentIsStable = !currentIsBeta && !currentIsAlpha;

    const inc = (releaseType, identifier) => {
      return semver.inc(currentVersion, releaseType, identifier);
    };

    const createVersionOption = (label, version) => {
      return {
        title: `${label} (${version})`,
        value: version,
      };
    };

    const validVersions = [
      createVersionOption(
        'next',
        inc(currentIsStable ? 'patch' : 'prerelease')
      ),
    ];

    if (currentIsStable) {
      validVersions.push(
        createVersionOption('alpha-minor', inc('preminor', 'alpha')),
        createVersionOption('beta-minor', inc('preminor', 'beta')),
        createVersionOption('alpha-major', inc('premajor', 'alpha')),
        createVersionOption('beta-major', inc('premajor', 'beta')),
        createVersionOption('minor', inc('minor')),
        createVersionOption('major', inc('major'))
      );
    }

    if (currentIsAlpha) {
      validVersions.push(createVersionOption('beta', `${inc('patch')}-beta.0`));
    }

    if (currentIsBeta) {
      validVersions.push(createVersionOption('stable', inc('patch')));
    }

    validVersions.push({
      title: 'custom',
      value: 'custom',
    });

    return validVersions;
  };

  let { selectedPackage, version } = await prompts([
    {
      type: 'select',
      name: 'selectedPackage',
      choices: releasePackagesMetadata.map(data => ({
        title: data.name,
        value: data,
      })),
      message: `Choose package (changes detected):`,
    },
    {
      type: 'select',
      name: 'version',
      choices: (_, { selectedPackage }) =>
        getValidNextVersions(selectedPackage.currentVersion),
      message: (_, { selectedPackage }) =>
        `Release version(current: ${selectedPackage.currentVersion})`,
      validate: version => {
        return !!semver.valid(version);
      },
    },
  ]);

  if (!selectedPackage) {
    logger.info('No package was selected');
    return;
  }

  if (version === 'custom') {
    const { customVersion } = await prompts([
      {
        type: 'text',
        name: 'customVersion',
        message: `Input the next version (current: ${selectedPackage.currentVersion})`,
        validate: version => {
          return !!semver.valid(version);
        },
      },
    ]);

    if (customVersion) {
      version = customVersion;
    }
  }

  const { path: packageCwd, packageJsonPath, name } = selectedPackage;

  if (!version) return;

  const gitTagConfig = config['git-tag'];
  const tag = `${name}@${version}`;

  const defaultReleaseTagMessage = gitTagConfig['commit-message']?.replace(
    /{{\s*?tag\s*?}}/,
    tag
  );

  const customOptionSymbol = Symbol('custom');
  let { releaseMessage } = await prompts([
    {
      type: 'select',
      name: 'releaseMessage',
      message: 'Release Commit Message',
      choices: [
        defaultReleaseTagMessage
          ? {
              title: `Default: '${defaultReleaseTagMessage}'`,
              value: defaultReleaseTagMessage,
            }
          : undefined,
        {
          title: 'Custom',
          value: customOptionSymbol,
        },
      ],
    },
  ]);

  if (releaseMessage === customOptionSymbol) {
    await prompts([
      {
        type: 'text',
        message: 'Input release commit message',
        validate: message => !!message,
        onState: message => (releaseMessage = message.value),
      },
    ]);
  }

  const { releaseConfirm } = await prompts([
    {
      type: 'confirm',
      name: 'releaseConfirm',
      message: `Release preview: \n - Tag: ${tag} \n - Commit Message: '${releaseMessage}'`,
    },
  ]);

  if (!releaseConfirm) return;

  const packageJson = require(packageJsonPath);
  packageJson.version = version;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const changelogConfig = config.changelog;

  if (changelogConfig.enable) {
    const changelogCmd = [
      'conventional-changelog',
      '-p',
      changelogConfig.preset,
      '-i',
      'CHANGELOG.md',
      '-s',
      '--commit-path',
      '.',
      '--lerna-package',
      name,
    ];

    await exec('npx', changelogCmd, {
      cwd: packageCwd,
    });
  }

  await execaCommand('git add -A');

  await exec('git', ['commit', '-m', `${releaseMessage}`], {
    stderr: process.stderr,
    stdout: process.stdout,
  });

  if (gitTagConfig['auto-add']) {
    await exec('git', ['tag', tag]);

    if (gitTagConfig['auto-push']) {
      await exec('git', ['push', 'origin', `refs/tags/${tag}`]);

      await exec('git', ['push']);
    }
  }

  const npmConfig = config.npm;

  if (npmConfig['auto-publish']) {
    const npmrc = path.join(packageCwd, '.npmrc');
    let cmd = `npm publish`;

    if (fs.existsSync(npmrc)) {
      cmd += ` --userconfig ${npmrc}`;
    }

    await execaCommand(cmd, {
      cwd: packageCwd,
      stdout: process.stdout,
      stdin: process.stdin,
      stderr: process.stderr,
    });
  }
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
    await setupGitHooksFeatures(config.hooks);

    if (config.features.commitlint) {
      await setupCommitlintFeature();
      await setupGitHooksFeatures({
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

    await releasePackages(userConfig.features.release);
  });

program.parse();
