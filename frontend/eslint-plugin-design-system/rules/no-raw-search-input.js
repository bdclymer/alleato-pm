/**
 * ESLint Rule: no-raw-search-input
 *
 * Prevents using raw <Input placeholder="Search..."> for search functionality.
 * All search inputs must use <ExpandingSearch> from "@/components/ds".
 *
 * ExpandingSearch renders as a Search icon that expands to an input on click —
 * the ONE consistent search pattern across the codebase.
 *
 * Allowed locations:
 *   - The ExpandingSearch component itself
 *   - The ui/input primitive (shadcn source)
 *   - Design system ds/ composites
 *   - Table toolbar components (they have their own search)
 *   - Test files
 *
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow raw <Input> for search — use <ExpandingSearch> from @/components/ds',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      rawSearchInput:
        'Do not use a raw <Input> for search. ' +
        'Use <ExpandingSearch> from "@/components/ds" instead. ' +
        'It renders as a Search icon that expands on click — the one consistent search pattern. ' +
        'Import: import { ExpandingSearch } from "@/components/ds"',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    if (
      filename.includes('/components/ui/input') ||
      filename.includes('/components/ds/') ||
      filename.includes('/components/tables/') ||
      filename.includes('expanding-search') ||
      filename.includes('table-toolbar') ||
      filename.includes('GOLDEN-EXAMPLES') ||
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('/tests/')
    ) {
      return {};
    }

    const SEARCH_PLACEHOLDER_RE = /\b(search|find|filter)\b/i;

    return {
      JSXOpeningElement(node) {
        const name = node.name;
        // Match <Input ...>
        if (
          name.type !== 'JSXIdentifier' ||
          name.name !== 'Input'
        ) {
          return;
        }

        for (const attr of node.attributes) {
          if (
            attr.type !== 'JSXAttribute' ||
            attr.name?.name !== 'placeholder'
          ) {
            continue;
          }

          let placeholderValue = null;

          if (attr.value?.type === 'Literal') {
            placeholderValue = attr.value.value;
          } else if (
            attr.value?.type === 'JSXExpressionContainer' &&
            attr.value.expression?.type === 'Literal'
          ) {
            placeholderValue = attr.value.expression.value;
          }

          if (
            typeof placeholderValue === 'string' &&
            SEARCH_PLACEHOLDER_RE.test(placeholderValue)
          ) {
            context.report({ node, messageId: 'rawSearchInput' });
          }
        }
      },
    };
  },
};
