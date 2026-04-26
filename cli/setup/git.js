const { execSync } = require('child_process');
const { log } = require('../utils/logger');

function initGitRepository(projectPath) {
  try {
    execSync('git init', { cwd: projectPath, stdio: 'pipe' });
    execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit via voltrn-cli"', {
      cwd: projectPath,
      stdio: 'pipe',
    });
    log.success('Git repository initialized with initial commit');
  } catch (error) {
    log.warning(
      'Could not initialize git repository. Make sure git is installed.'
    );
  }
}

module.exports = {
  initGitRepository,
};
