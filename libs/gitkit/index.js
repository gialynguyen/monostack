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
const { execSync } = require('child_process');
const prompts = require('prompts');
const semver = require('semver');
const gitRawCommits = require('git-raw-commits');

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

const commitFromTag = (path, tag) => {
  return new Promise(resolve => {
    try {
      let commits = [];
      gitRawCommits({
        from: tag,
        path,
      })
        .on('data', data => {
          const commit = data.toString().split(os.EOL).filter(Boolean)?.[0];
          commits.push(commit);
        })
        .on('end', () => {
          resolve(commits);
        });
    } catch (e) {
      resolve(undefined);
    }
  });
};

const releasePackages = async userConfig => {
  const config = {
    packages: './',
  };

  Object.assign(config, userConfig);

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

      // const hasCommit = execSync(`npx git-raw-commits --path ${package}`);
      const lastTag = await getLastTag(name);
      let hasCommit = false;
      if (lastTag) {
        hasCommit = !!(await commitFromTag(package, lastTag));
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

  for (let index = 0; index < releasePackagesMetadata.length; index++) {
    const packageMetadata = releasePackagesMetadata[index];
    const { name, currentVersion } = packageMetadata;

    console.log(`Release packages: ${name}`);

    const response = await prompts([
      {
        type: 'text',
        name: 'version',
        message: `Release version(current: ${currentVersion}): `,
        validate: version => {
          return !!semver.valid(version);
        },
      },
    ]);

    Object.assign(packageMetadata, {
      releaseVersion: response.version,
    });
  }

  await Promise.all(
    releasePackagesMetadata.map(async packageMetadata => {
      const { releaseVersion, path, packageJsonPath, name } = packageMetadata;
      const changelogCmd = `conventional-changelog -p angular -i CHANGELOG.md -s --commit-path . --lerna-package ${name}`;

      if (!releaseVersion) return;

      const packageJson = require(packageJsonPath);
      packageJson.version = releaseVersion;

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

      await exec(`npx ${changelogCmd}`, {
        cwd: path,
      });

      const tag = `${name}@${releaseVersion}`;

      // await exec(`git add -A`);
      // await exec(`git commit -m 'chore(release): ${tag} :tada:'`);
      // await exec(`git tag ${tag}`);
      // await exec(`git push origin refs/tags/${tag}`);
      // await exec(`git push`);
    })
  );
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
