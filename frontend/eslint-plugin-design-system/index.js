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
const noOversizedShadows = require('./rules/no-oversized-shadows');
const noRawButton = require('./rules/no-raw-button');
const requireMoneyField = require('./rules/require-money-field');

module.exports = {
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'no-arbitrary-spacing': noArbitrarySpacing,
    'require-semantic-colors': requireSemanticColors,
    'no-design-violations': noDesignViolations,
    'require-page-shell': requirePageShell,
    'no-oversized-shadows': noOversizedShadows,
    'no-raw-button': noRawButton,
    'require-money-field': requireMoneyField,
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
        'design-system/no-oversized-shadows': 'error',
        'design-system/no-raw-button': 'error',
        'design-system/require-money-field': 'error',
      },
    },
    strict: {
      plugins: ['design-system'],
      rules: {
        'design-system/no-hardcoded-colors': 'error',
        'design-system/no-arbitrary-spacing': 'error',
        'design-system/require-semantic-colors': 'error',
        'design-system/require-page-shell': 'error',
        'design-system/no-oversized-shadows': 'error',
        'design-system/no-raw-button': 'error',
        'design-system/require-money-field': 'error',
      },
    },
  },
};
