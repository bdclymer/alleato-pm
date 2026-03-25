/**
 * ESLint Rule: no-design-violations
 *
 * Catches the most common design system violations that the other rules miss:
 * 1. The Card Trap — bg-card + border border-border + rounded on the same element
 * 2. bg-white — should always be bg-card or bg-background
 * 3. Raw <button elements — should always use <Button from @/components/ui/button
 *
 * These are the patterns that make the app look inconsistent and are
 * nearly impossible to prevent manually across a large codebase.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent common design system violations: card trap, bg-white, raw buttons',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      cardTrap:
        'Card trap detected: "bg-card" + "border border-border" + "rounded" on one element. ' +
        'Use tonal elevation (bg-muted, bg-accent) or the SectionCard/Card components instead. ' +
        'See docs/design/UI_GUIDE.md #2.',
      bgWhite:
        '"bg-white" is not a design token. Use "bg-card" (surface) or "bg-background" (page). ' +
        'bg-white breaks dark mode.',
      rawButton:
        'Raw <button> element detected. Always use <Button> from "@/components/ui/button". ' +
        'Raw buttons skip the design system\'s focus, hover, and disabled states.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Skip non-component files
    if (
      filename.includes('globals.css') ||
      filename.includes('tokens') ||
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('button.tsx') // The Button component itself is exempt
    ) {
      return {};
    }

    function getClassString(node) {
      if (!node.value) return '';
      if (node.value.type === 'Literal') return node.value.value || '';
      if (node.value.type === 'JSXExpressionContainer') {
        const expr = node.value.expression;
        if (expr.type === 'Literal') return expr.value || '';
        if (expr.type === 'TemplateLiteral') {
          return expr.quasis.map(q => q.value.raw).join(' ');
        }
        // cn() calls — try to extract string args
        if (expr.type === 'CallExpression') {
          return expr.arguments
            .filter(a => a.type === 'Literal')
            .map(a => a.value || '')
            .join(' ');
        }
      }
      return '';
    }

    return {
      // Check className attributes for card trap and bg-white
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'className') return;

        const classes = getClassString(node);
        if (!classes) return;

        // bg-white check
        if (/\bbg-white\b/.test(classes)) {
          context.report({ node, messageId: 'bgWhite' });
        }

        // Card trap: has bg-card AND (border or border-border) AND rounded variant
        const hasBgCard = /\bbg-card\b/.test(classes);
        const hasBorder = /\bborder\b/.test(classes);
        const hasRounded = /\brounded\b/.test(classes);

        if (hasBgCard && hasBorder && hasRounded) {
          context.report({ node, messageId: 'cardTrap' });
        }
      },

      // Check for raw <button> JSX elements
      JSXOpeningElement(node) {
        if (
          node.name &&
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'button'
        ) {
          context.report({ node, messageId: 'rawButton' });
        }
      },
    };
  },
};
