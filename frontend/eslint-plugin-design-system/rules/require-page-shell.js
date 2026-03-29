/**
 * ESLint Rule: require-page-shell
 *
 * Every page.tsx file under app/ must use <PageShell> as its root layout wrapper.
 * This prevents the recurring pattern of agents writing raw <div> + manual <h1>
 * instead of using the design system's page component.
 *
 * What it checks:
 * - The file exports a default function (a Next.js page)
 * - The file imports PageShell from @/components/layout
 * - The returned JSX contains a <PageShell> element
 *
 * Exceptions (via eslint-disable or path-based):
 * - Files in (auth)/ routes (login, signup pages have custom layouts)
 * - Files that explicitly disable with eslint-disable comment
 * - Layout files (layout.tsx) — those wrap pages, not the other way around
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require PageShell component in all page.tsx files',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      missingPageShell:
        'Page files must use <PageShell> from "@/components/layout". ' +
        'Do not write raw <div> + manual headings. ' +
        'See CLAUDE.md → "BUILDING A NEW PAGE? START HERE" for variants: ' +
        'dashboard, table, form, detail, content.',
      missingPageShellImport:
        'Page file is missing the PageShell import. ' +
        'Add: import { PageShell } from "@/components/layout";',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename?.() || context.filename || '';

    // Only apply to page.tsx files
    if (!filename.endsWith('page.tsx')) return {};

    // Skip auth routes, error pages, and special pages
    const skipPatterns = [
      '(auth)',
      '/auth/',
      'error.tsx',
      'not-found.tsx',
      'loading.tsx',
      'layout.tsx',
      // Admin pages that are legitimately non-standard
      'test-modals',
      'test-form',
    ];
    if (skipPatterns.some(p => filename.includes(p))) return {};

    let hasPageShellImport = false;
    let hasPageShellJSX = false;
    let defaultExportNode = null;

    return {
      // Track imports
      ImportDeclaration(node) {
        const source = node.source.value;
        if (
          source === '@/components/layout' ||
          source === '@/components/layout/page-shell'
        ) {
          const hasPageShell = node.specifiers.some(
            s => s.imported && s.imported.name === 'PageShell'
          );
          if (hasPageShell) hasPageShellImport = true;
        }
      },

      // Track JSX usage of <PageShell>
      JSXOpeningElement(node) {
        if (
          node.name.type === 'JSXIdentifier' &&
          node.name.name === 'PageShell'
        ) {
          hasPageShellJSX = true;
        }
      },

      // Track default export
      ExportDefaultDeclaration(node) {
        defaultExportNode = node;
      },

      // Check at the end of the file
      'Program:exit'() {
        // Only check files that export a default (page components)
        if (!defaultExportNode) return;

        if (!hasPageShellImport && !hasPageShellJSX) {
          context.report({
            node: defaultExportNode,
            messageId: 'missingPageShell',
          });
        } else if (hasPageShellImport && !hasPageShellJSX) {
          // Imported but never used — likely a mistake
          context.report({
            node: defaultExportNode,
            messageId: 'missingPageShell',
          });
        } else if (!hasPageShellImport && hasPageShellJSX) {
          // Used but not imported — would be a runtime error anyway
          context.report({
            node: defaultExportNode,
            messageId: 'missingPageShellImport',
          });
        }
      },
    };
  },
};
