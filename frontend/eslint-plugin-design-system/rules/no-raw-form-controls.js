/**
 * ESLint Rule: no-raw-form-controls
 *
 * Prevents raw HTML form controls in app code.
 * Use shared design-system primitives and form-field wrappers instead.
 *
 * Allowed:
 * - UI primitive implementations under /components/ui/
 * - Hidden inputs (<input type="hidden">) for metadata fields
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw <input>/<select>/<textarea> outside UI primitives',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      rawInput:
        'Use shared form primitives (Input/Textarea/Select or field wrappers) instead of raw <input>.',
      rawSelect:
        'Use shared Select/form primitives instead of raw <select>.',
      rawTextarea:
        'Use shared Textarea/form primitives instead of raw <textarea>.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    if (
      filename.includes('/components/ui/') ||
      filename.includes('GOLDEN-EXAMPLES') ||
      filename.includes('tailwind.config') ||
      filename.includes('globals.css')
    ) {
      return {};
    }

    const isHiddenInput = (node) =>
      node.attributes.some(
        (attr) =>
          attr.type === 'JSXAttribute' &&
          attr.name &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'type' &&
          attr.value &&
          attr.value.type === 'Literal' &&
          attr.value.value === 'hidden',
      );

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;

        if (node.name.name === 'input') {
          if (isHiddenInput(node)) return;
          context.report({ node, messageId: 'rawInput' });
          return;
        }

        if (node.name.name === 'select') {
          context.report({ node, messageId: 'rawSelect' });
          return;
        }

        if (node.name.name === 'textarea') {
          context.report({ node, messageId: 'rawTextarea' });
        }
      },
    };
  },
};

