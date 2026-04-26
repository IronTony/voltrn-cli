const PACKAGE_MANAGERS = {
  npm: {
    name: 'npm',
    install: 'npm install',
    add: (packages) => `npm install ${packages}`,
    addDev: (packages) => `npm install --save-dev ${packages}`,
    run: (script) => `npm run ${script}`,
    exec: 'npx',
    lockfile: 'package-lock.json',
  },
  yarn: {
    name: 'yarn',
    install: 'yarn',
    add: (packages) => `yarn add ${packages}`,
    addDev: (packages) => `yarn add --dev ${packages}`,
    run: (script) => `yarn ${script}`,
    exec: 'npx',
    lockfile: 'yarn.lock',
  },
  pnpm: {
    name: 'pnpm',
    install: 'pnpm install',
    add: (packages) => `pnpm add ${packages}`,
    addDev: (packages) => `pnpm add -D ${packages}`,
    run: (script) => `pnpm run ${script}`,
    exec: 'pnpx',
    lockfile: 'pnpm-lock.yaml',
  },
  bun: {
    name: 'bun',
    install: 'bun install',
    add: (packages) => `bun add ${packages}`,
    addDev: (packages) => `bun add -d ${packages}`,
    run: (script) => `bun run ${script}`,
    exec: 'bunx',
    lockfile: 'bun.lockb',
  },
};

/**
 * Append --legacy-peer-deps when using npm with Expo.
 * Other package managers handle peer deps without flags.
 */
function withLegacyPeerDeps(pm, isExpo) {
  if (pm.name !== 'npm' || !isExpo) return pm;

  return {
    ...pm,
    add: (packages) => `npm install ${packages} --legacy-peer-deps`,
    addDev: (packages) =>
      `npm install --save-dev ${packages} --legacy-peer-deps`,
  };
}

function getPackageManager(name) {
  const pm = PACKAGE_MANAGERS[name];
  if (!pm) {
    throw new Error(`Unknown package manager: ${name}`);
  }
  return pm;
}

const { execSync } = require('child_process');

function isPackageManagerInstalled(name) {
  try {
    execSync(`${name} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getInstalledPackageManagers() {
  return Object.keys(PACKAGE_MANAGERS).filter(isPackageManagerInstalled);
}

module.exports = {
  PACKAGE_MANAGERS,
  getPackageManager,
  withLegacyPeerDeps,
  isPackageManagerInstalled,
  getInstalledPackageManagers,
};
