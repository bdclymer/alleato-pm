/**
 * ESLint Plugin: Design System
 *
 * Custom ESLint rules to enforce design system compliance.
 * Prevents hardcoded colors, arbitrary spacing, and encourages semantic tokens.
 */

const noHardcodedColors = require('./rules/no-hardcoded-colors');
const noArbitrarySpacing = require('./rules/no-arbitrary-spacing');
const requireSemanticColors = require('./rules/require-semantic-colors');
const noDesignViolations = require('./rules/no-design-violations');
const requirePageShell = require('./rules/require-page-shell');

module.exports = {
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'no-arbitrary-spacing': noArbitrarySpacing,
    'require-semantic-colors': requireSemanticColors,
    'no-design-violations': noDesignViolations,
    'require-page-shell': requirePageShell,
  },
  configs: {
    recommended: {
      plugins: ['design-system'],
      rules: {
        'design-system/no-hardcoded-colors': 'error',
        'design-system/no-arbitrary-spacing': 'error',
        'design-system/require-semantic-colors': 'warn',
        'design-system/no-design-violations': 'error',
        'design-system/require-page-shell': 'warn',
      },
    },
    strict: {
      plugins: ['design-system'],
      rules: {
        'design-system/no-hardcoded-colors': 'error',
        'design-system/no-arbitrary-spacing': 'error',
        'design-system/require-semantic-colors': 'error',
        'design-system/require-page-shell': 'error',
      },
    },
  },
};
