const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');

/**
 * Set up MPL-2.0 license in the generated project.
 *
 * - Copies the LICENSE file from the CLI's own root
 * - Sets "license": "MPL-2.0" in the project's package.json
 *
 * @param {string} projectPath - Path to the generated project
 */
function setupLicense(projectPath, spinner) {
  spinner?.message('Adding MPL-2.0 license...');

  // Copy LICENSE file from CLI root to generated project
  const sourceLicense = path.join(__dirname, '..', '..', 'LICENSE');
  const destLicense = path.join(projectPath, 'LICENSE');

  if (fs.existsSync(sourceLicense)) {
    fs.copyFileSync(sourceLicense, destLicense);
  } else {
    log.warning('LICENSE file not found in CLI - skipping LICENSE copy');
    return;
  }

  // Set license field in package.json
  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.license = 'MPL-2.0';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }
}

module.exports = { setupLicense };
