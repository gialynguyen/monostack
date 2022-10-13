import * as kolorist from 'kolorist';

const info = (...params) => {
  console.log(kolorist.cyan(...params));
};

const processing = (...params) => {
  console.log(kolorist.blue(...params));
};

const heading = (...params) => {
  console.log(kolorist.bold(kolorist.lightGreen(...params)));
};

const error = (...params) => {
  console.error(kolorist.red(...params));
};

const warn = (...params) => {
  console.warn(kolorist.yellow(...params));
};

const logger = {
  info,
  error,
  warn,
  processing,
  heading,
};

export default logger;
