const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');
const eslintBin = path.join(frontendDir, 'node_modules', '.bin', 'eslint');

module.exports = {
  'frontend/**/*.{ts,tsx,js,jsx}': (filenames) => [
    `cd ${frontendDir} && ${eslintBin} --fix ${filenames.join(' ')}`,
  ],
};
