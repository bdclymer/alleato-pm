const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');
const eslintBin = path.join(frontendDir, 'node_modules', '.bin', 'eslint');

// lint-staged 16+ does NOT spawn commands through a shell by default.
// Using `cd X && cmd` fails with "spawn cd ENOENT" because `cd` is a shell built-in.
// Fix: wrap each command in `sh -c "..."` so the shell handles `cd` and `&&`.
//
// Additionally, Next.js dynamic route paths like [projectId] and [linkId] contain
// bracket characters that the shell interprets as glob character classes if unquoted.
// Fix: double-quote each filename in the shell command string.

module.exports = {
  'frontend/**/*.{ts,tsx,js,jsx}': (filenames) => {
    // Build a shell-safe, double-quoted list of filenames.
    // We escape any double-quotes within each filename (edge case, but correct).
    const quotedFiles = filenames.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(' ');

    const designSystemRules = JSON.stringify({
      'design-system/require-api-client': 'error',
      'design-system/no-hardcoded-colors': 'error',
      'design-system/no-arbitrary-spacing': 'error',
      'design-system/require-semantic-colors': 'error',
      'design-system/no-design-violations': 'error',
      'design-system/require-page-shell': 'error',
      'design-system/no-oversized-shadows': 'error',
      'design-system/no-raw-button': 'error',
      'design-system/no-raw-form-controls': 'error',
      'design-system/require-money-field': 'error',
      'design-system/require-info-alert': 'error',
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@/components/ui/dialog',
          message: 'Use "@/components/ui/unified-modal" for app-level modals to keep animation, positioning, and spacing consistent.',
        }],
      }],
    });

    return [
      // Fix what can be auto-fixed. Use sh -c so cd works as a shell built-in.
      `sh -c 'cd "${frontendDir}" && "${eslintBin}" --fix ${quotedFiles}'`,
      // Enforce strict design-system rules on changed files only (ratchet-down pattern).
      // Global config keeps many rules at "warn" due to legacy debt, but staged changes
      // must not introduce new drift.
      `sh -c 'cd "${frontendDir}" && "${eslintBin}" --rule ${JSON.stringify(designSystemRules)} ${quotedFiles}'`,
      // Block adding new design-system eslint-disable escapes.
      'node frontend/scripts/design-system/check-no-new-disables.mjs',
      // Block any new lint warnings/errors on added lines in staged files.
      `sh -c 'cd "${frontendDir}" && node scripts/check-no-new-eslint-debt.mjs --staged'`,
      // Ratchet no-new-any on staged changes only; existing debt is handled separately.
      'node scripts/check-no-new-any.mjs --staged',
    ];
  },
};
