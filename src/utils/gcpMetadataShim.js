const logger = {
  log: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
};

export const instance = async () => {
  return {
    project: {
      projectId: process.env.REACT_APP_PROJECT_ID,
    },
  };
};

export const project = async () => {
  return {
    projectId: process.env.REACT_APP_PROJECT_ID,
  };
};

export const universe = async () => {
  return {
    universeDomain: "googleapis.com",
  };
};

export default {
  instance,
  project,
  universe,
  logger,
};
