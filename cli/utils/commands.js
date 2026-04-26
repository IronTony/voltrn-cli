const { spawn } = require('child_process');

function executeCommand(command, options = {}) {
  const { verbose, ...spawnOptions } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      ...spawnOptions,
    });
    const stdout = [];
    const stderr = [];
    if (child.stdout) child.stdout.on('data', (c) => stdout.push(c));
    if (child.stderr) child.stderr.on('data', (c) => stderr.push(c));
    child.on('error', (err) => {
      err.command = command;
      err.stdout = Buffer.concat(stdout);
      err.stderr = Buffer.concat(stderr);
      reject(err);
    });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const err = new Error(`Command failed (exit ${code}): ${command}`);
      err.command = command;
      err.code = code;
      err.stdout = Buffer.concat(stdout);
      err.stderr = Buffer.concat(stderr);
      reject(err);
    });
  });
}

module.exports = {
  executeCommand,
};
