// Script to run Electron with ELECTRON_RUN_AS_NODE unset
const { spawn } = require('child_process');
const path = require('path');

// Delete ELECTRON_RUN_AS_NODE from environment
delete process.env.ELECTRON_RUN_AS_NODE;

// Spawn Electron
const electronPath = require('electron');
const child = spawn(electronPath, ['.'], {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code);
});
