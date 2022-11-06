import fs from 'fs';
import logger from './logger.js';
import { createRequire } from 'module';
import logger from './logger.js';

const require = createRequire(import.meta.url);

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

export default setupCommitlintFeature;
