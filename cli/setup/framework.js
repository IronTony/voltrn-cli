const { executeCommand } = require('../utils/commands');
const { log } = require('../utils/logger');

async function createProject(projectName, isExpo) {
  if (isExpo) {
    await executeCommand(
      `npx create-expo-app@latest ${projectName} --template blank-typescript`,
    );
  } else {
    await executeCommand(
      `npx @react-native-community/cli@latest init ${projectName}`,
    );
  }
}

async function installIOSDependencies(projectPath) {
  const path = require('path');
  const fs = require('fs');

  try {
    const iosPath = path.join(projectPath, 'ios');
    if (fs.existsSync(iosPath)) {
      await executeCommand('cd ios && pod install && cd ..', { cwd: projectPath });
    }
  } catch (error) {
    log.warning(
      'Failed to run pod install. Please run "cd ios && pod install" manually before running on iOS.',
    );
  }
}

module.exports = {
  createProject,
  installIOSDependencies,
};
