const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');
const eslintBin = path.join(frontendDir, 'node_modules', '.bin', 'eslint');

module.exports = {
  'frontend/**/*.{ts,tsx,js,jsx}': (filenames) => [
    // Fix what can be auto-fixed
    `cd ${frontendDir} && ${eslintBin} --fix ${filenames.join(' ')}`,
    // Then enforce stricter rules on changed files only (ratchet-down pattern).
    // require-api-client is warn globally (300+ existing violations as debt)
    // but ERROR here — new/modified files must use apiFetch, not raw fetch().
    // Regression (2026-04-13): use-rfis.ts raw fetch caused "Failed to fetch"
    // instead of real server error messages. This gate prevents recurrence.
    `cd ${frontendDir} && ${eslintBin} --rule '{"design-system/require-api-client": "error"}' ${filenames.join(' ')}`,
    // Ratchet no-new-any on staged changes only; existing debt is handled separately.
    'node scripts/check-no-new-any.mjs --staged',
  ],
};
