import fs from 'fs';
import { execa as exec } from 'execa';
import path from 'path';
import util from 'util';

const execPath = process.cwd();
const writeFile = util.promisify(fs.writeFile);
const exists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);
const huskyDir = `.husky/gitkit/`;

const addHuskyHook = async (hook, filePath, cmd) => {
  const shScrip = `. "$(dirname -- "$0")/gitkit/${hook}.sh"`;

  if (!(await exists(filePath))) {
    await exec('npx', ['husky', 'set', filePath, shScrip]);
  }

  const shFilePath = path.join(execPath, huskyDir, `${hook}.sh`);

  await writeFile(shFilePath, cmd, { mode: 0o777, flag: 'w' });
};

const setupGitHooksFeature = async (hooksConfig = {}) => {
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

export default setupGitHooksFeature;
