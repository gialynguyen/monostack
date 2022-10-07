#!/usr/bin/env node

const { Command } = require('commander');
const deepmerge = require('deepmerge');
const kolorist = require('kolorist');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const os = require('os');
const fg = require('fast-glob');
const prompts = require('prompts');
const semver = require('semver');
const gitRawCommits = require('git-raw-commits');
const { blue } = require('kolorist');

const program = new Command();
const execPath = process.cwd();
const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);

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

const addHuskyHook = async (filePath, cmd) => {
  if (!(await exists(filePath))) {
    await exec(`npx husky set ${filePath} '${cmd}'`);
    return;
  }
  const hookFile = await readFile(filePath);
  const hookCmds = hookFile.toString().split(os.EOL);
  const cmdTrim = cmd.trim();

  const cmdExisted = hookCmds.some(hookCmd => {
    if (hookCmd.trim() === cmdTrim) {
      return true;
    }

    return false;
  });

  if (cmdExisted) {
    return;
  }

  await exec(`npx husky add ${filePath} '${cmd}'`);
};

const setupGitHooksFeatures = async (hooksConfig = {}) => {
  const processes = [];
  for (const hook in hooksConfig) {
    if (hooksConfig.hasOwnProperty(hook)) {
      const cmd = hooksConfig[hook];
      const filePath = `.husky/${hook}`;

      processes.push(addHuskyHook(filePath, cmd));
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
    console.log(
      kolorist.bold(kolorist.cyan(`Please install packages: ${listPkg}`))
    );
  }
};

const getLastTag = async packageName => {
  const tags = await exec(`git tag`).then(r =>
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
    packages.map(async package => {
      const packageJsonPath = path.join(package, 'package.json');
      const packageJson = require(packageJsonPath);

      if (!packageJson) {
        throw new Error(`[${package}]: package.json not found`);
      }

      let { name, version: currentVersion } = packageJson;
      if (name.startsWith('@')) {
        name = name.split('/')[1];
      }

      if (!name) {
        throw new Error(`[${package}]: package's name missing`);
      }

      const lastTag = await getLastTag(name);
      let hasCommit = false;
      if (lastTag) {
        hasCommit = !!(await hasCommitFromTag(package, lastTag));
      }

      if (!lastTag || hasCommit) {
        releasePackagesMetadata.push({
          name,
          currentVersion,
          path: package,
          packageJsonPath,
        });
      }
    })
  );

  const { selectedPackage, version } = await prompts([
    {
      type: 'select',
      name: 'selectedPackage',
      choices: releasePackagesMetadata.map(data => ({
        title: data.name,
        value: data,
      })),
      message: `Choose package:`,
    },
    {
      type: 'text',
      name: 'version',
      message: (_, { selectedPackage }) =>
        `Release version(current: ${selectedPackage.currentVersion}): `,
      validate: version => {
        return !!semver.valid(version);
      },
    },
  ]);

  if (!selectedPackage) {
    console.log(blue('No package was selected'));
    return;
  }

  const { path: packagePath, packageJsonPath, name } = selectedPackage;

  if (!version) return;

  const packageJson = require(packageJsonPath);
  packageJson.version = version;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const changelogConfig = config.changelog;

  if (changelogConfig.enable) {
    const changelogCmd = `conventional-changelog -p ${changelogConfig.preset} -i CHANGELOG.md -s --commit-path . --lerna-package ${name}`;

    await exec(`npx ${changelogCmd}`, {
      cwd: packagePath,
    });
  }

  const tag = `${name}@${version}`;

  const gitTagConfig = config['git-tag'];

  if (gitTagConfig['auto-add']) {
    await exec(`git add -A`);
    const releaseTagMessage = gitTagConfig['commit-message'].replace(
      /{{\s*?tag\s*?}}/,
      tag
    );
    await exec(`git commit -m '${releaseTagMessage}'`);
    await exec(`git tag ${tag}`);

    if (gitTagConfig['auto-push']) {
      await exec(`git push origin refs/tags/${tag}`);
      await exec(`git push`);
    }
  }
};

program
  .name('gitkit')
  .description('CLI to git-hook utility collection')
  .version('1.0.0');

program
  .command('setup')
  .description('Setup git-hook core features')
  .action(async () => {
    await exec('npx husky install');

    const userConfig = getConfigFromPackageJson();
    if (!userConfig) {
      console.warn(
        kolorist.yellow('Gitkit config not found, no feature will be installed')
      );

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
      console.warn(
        kolorist.yellow('Gitkit config not found, no feature will be installed')
      );

      return;
    }

    await releasePackages(userConfig.features.release);
  });

program.parse();
