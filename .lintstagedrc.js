const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');
const eslintBin = path.join(frontendDir, 'node_modules', '.bin', 'eslint');

module.exports = {
  'frontend/**/*.{ts,tsx,js,jsx}': (filenames) => [
    // Fix what can be auto-fixed
    `cd ${frontendDir} && ${eslintBin} --fix ${filenames.join(' ')}`,
    // Then enforce strict design-system rules on changed files only (ratchet-down pattern).
    // Global config keeps many rules at "warn" due to legacy debt, but staged changes
    // must not introduce new drift.
    `cd ${frontendDir} && ${eslintBin} --rule '{"design-system/require-api-client":"error","design-system/no-hardcoded-colors":"error","design-system/no-arbitrary-spacing":"error","design-system/require-semantic-colors":"error","design-system/no-design-violations":"error","design-system/require-page-shell":"error","design-system/no-oversized-shadows":"error","design-system/no-raw-button":"error","design-system/no-raw-form-controls":"error","design-system/require-money-field":"error"}' ${filenames.join(' ')}`,
    // Block adding new design-system eslint-disable escapes.
    'node frontend/scripts/design-system/check-no-new-disables.mjs',
    // Block any new lint warnings/errors on added lines in staged files.
    'cd frontend && node scripts/check-no-new-eslint-debt.mjs --staged',
    // Ratchet no-new-any on staged changes only; existing debt is handled separately.
    'node scripts/check-no-new-any.mjs --staged',
  ],
};
