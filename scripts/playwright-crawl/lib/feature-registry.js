/**
 * feature-registry.js
 * Maps feature names to Procore URLs and the page states to capture.
 *
 * URL format: webclients (new, current)
 * https://us02.procore.com/webclients/host/companies/{COMPANY}/projects/{PROJECT}/tools/{tool}
 */

const COMPANY = '562949953443325';
const PROJECT = '562949954728542';
const BASE = `https://us02.procore.com/webclients/host/companies/${COMPANY}/projects/${PROJECT}/tools`;

/**
 * State types:
 *   list        - navigate directly to url, capture as-is
 *   create-form - click selector to open create form, capture the form
 *   detail      - click selector to open detail/show page
 *   detail-tab  - within detail, click a tab selector
 *   modal       - click selector to open a modal
 */

export const FEATURES = {
  'change-events': {
    name: 'Change Events',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/change-events/events`,
        waitFor: '.ag-root, table, [class*="change-event"]',
        description: 'Change Events list view',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/change-events/events`,
        selector: 'button[data-cy="create-change-event-button"], button:has-text("Create Change Event"), [data-action*="new"], button:has-text("New")',
        waitFor: 'form, [role="dialog"], [class*="modal"]',
        description: 'Create Change Event form/modal',
      },
      {
        id: 'detail',
        type: 'detail',
        url: `${BASE}/change-events/events`,
        selector: '.ag-row:first-child, tr[class*="row"]:first-child a, [class*="event-title"] a',
        waitFor: '[class*="detail"], [class*="show"], form',
        description: 'Change Event detail / show page',
      },
      // Note: Change Events detail uses toolbar-style navigation, not role="tab".
      // The "Line Items" table is the default view. "Prime Contract COs" is via "Add to" dropdown.
      // Tabs captured from default detail view — no separate tab-click needed.
      {
        id: 'detail-add-to-dropdown',
        type: 'detail-tab',
        parentStateId: 'detail',
        selector: 'button:has-text("Add to"), [aria-label*="Add to"]',
        waitFor: '[role="menu"], [class*="dropdown"]',
        description: 'Change Event detail — "Add to" dropdown (Prime Contract COs, Budget)',
      },
      {
        id: 'detail-send-rfqs',
        type: 'detail-tab',
        parentStateId: 'detail',
        selector: 'button:has-text("Send Requests for Quote"), button:has-text("RFQ")',
        waitFor: '[role="dialog"], form',
        description: 'Change Event detail — Send Requests for Quote modal',
      },
    ],
  },

  'prime-contracts': {
    name: 'Prime Contracts',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/contracts/prime_contracts`,
        waitFor: '.ag-root, table, [class*="prime-contract"]',
        description: 'Prime Contracts list view',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/contracts/prime_contracts`,
        selector: 'button:has-text("Create Prime Contract"), button:has-text("New Prime Contract"), [data-cy*="create"]',
        waitFor: 'form, [role="dialog"]',
        description: 'Create Prime Contract form',
      },
      {
        id: 'detail',
        type: 'detail',
        url: `${BASE}/contracts/prime_contracts`,
        selector: '.ag-row:first-child, tr[class*="row"]:first-child a, [class*="contract-title"] a',
        waitFor: '[class*="detail"], [class*="contract"]',
        description: 'Prime Contract detail page',
      },
      {
        id: 'detail-schedule-of-values',
        type: 'detail-tab',
        parentStateId: 'detail',
        selector: 'a:has-text("Schedule of Values"), button:has-text("Schedule of Values")',
        waitFor: '.ag-root, table',
        description: 'Prime Contract — Schedule of Values tab',
      },
      {
        id: 'detail-change-orders',
        type: 'detail-tab',
        parentStateId: 'detail',
        selector: 'a:has-text("Change Orders"), button:has-text("Change Orders")',
        waitFor: '.ag-root, table, [class*="empty"]',
        description: 'Prime Contract — Change Orders tab',
      },
      {
        id: 'detail-payments',
        type: 'detail-tab',
        parentStateId: 'detail',
        selector: 'a:has-text("Payments"), button:has-text("Payments")',
        waitFor: '.ag-root, table, [class*="empty"]',
        description: 'Prime Contract — Payments tab',
      },
    ],
  },

  'commitments': {
    name: 'Commitments',
    states: [
      {
        id: 'list-purchase-orders',
        type: 'list',
        url: `${BASE}/contracts/purchase_orders`,
        waitFor: '.ag-root, table',
        description: 'Purchase Orders (Subcontracts) list view',
      },
      {
        id: 'list-purchase-order-change-orders',
        type: 'list',
        url: `${BASE}/contracts/purchase_order_change_orders`,
        waitFor: '.ag-root, table',
        description: 'Purchase Order Change Orders list view',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/contracts/purchase_orders`,
        selector: 'button:has-text("Create Subcontract"), button:has-text("Create Purchase Order"), [data-cy*="create"]',
        waitFor: 'form, [role="dialog"]',
        description: 'Create Commitment form',
      },
      {
        id: 'detail',
        type: 'detail',
        url: `${BASE}/contracts/purchase_orders`,
        selector: '.ag-row:first-child, tr[class*="row"]:first-child a',
        waitFor: '[class*="detail"]',
        description: 'Commitment detail page',
      },
      {
        id: 'detail-schedule-of-values',
        type: 'detail-tab',
        parentStateId: 'detail',
        selector: 'a:has-text("Schedule of Values"), button:has-text("Schedule of Values")',
        waitFor: '.ag-root, table',
        description: 'Commitment — Schedule of Values tab',
      },
    ],
  },

  'budget': {
    name: 'Budget',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `https://us02.procore.com/${PROJECT}/project/budget`,
        waitFor: '.ag-root, table',
        description: 'Budget main view',
      },
      {
        id: 'detail-budget-detail',
        type: 'detail',
        url: `https://us02.procore.com/${PROJECT}/project/budget`,
        selector: '.ag-row:first-child .ag-cell:first-child',
        waitFor: '[class*="detail"], .ag-root',
        description: 'Budget detail view',
      },
    ],
  },

  'direct-costs': {
    name: 'Direct Costs',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/direct_costs`,
        waitFor: '.ag-root, table',
        description: 'Direct Costs list view',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/direct_costs`,
        selector: 'button:has-text("Create Direct Cost"), [data-cy*="create"]',
        waitFor: 'form, [role="dialog"]',
        description: 'Create Direct Cost form',
      },
      {
        id: 'detail',
        type: 'detail',
        url: `${BASE}/direct_costs`,
        selector: '.ag-row:first-child, tr[class*="row"]:first-child a',
        waitFor: '[class*="detail"]',
        description: 'Direct Cost detail page',
      },
    ],
  },

  'invoicing': {
    name: 'Invoicing',
    states: [
      {
        id: 'list-owner',
        type: 'list',
        url: `${BASE}/invoicing`,
        waitFor: '.ag-root, table',
        description: 'Invoicing — Owner Invoices list',
      },
      {
        id: 'list-subcontractor',
        type: 'list',
        url: `${BASE}/invoicing/subcontractor`,
        waitFor: '.ag-root, table',
        description: 'Invoicing — Subcontractor Invoices list',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/invoicing`,
        selector: 'button:has-text("Create Invoice"), [data-cy*="create"]',
        waitFor: 'form, [role="dialog"]',
        description: 'Create Invoice form',
      },
    ],
  },

  'meetings': {
    name: 'Meetings',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/meetings/list`,
        waitFor: '.ag-root, table',
        description: 'Meetings list view',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/meetings/list`,
        selector: 'button:has-text("Create Meeting"), [data-cy*="create"]',
        waitFor: 'form, [role="dialog"]',
        description: 'Create Meeting form',
      },
      {
        id: 'detail',
        type: 'detail',
        url: `${BASE}/meetings/list`,
        selector: '.ag-row:first-child, tr[class*="row"]:first-child a',
        waitFor: '[class*="detail"], [class*="meeting"]',
        description: 'Meeting detail / minutes page',
      },
    ],
  },

  'rfis': {
    name: 'RFIs',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/rfis`,
        waitFor: '.ag-root, table',
        description: 'RFIs list view',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/rfis`,
        selector: 'button:has-text("Create RFI"), [data-cy*="create"]',
        waitFor: 'form, [role="dialog"]',
        description: 'Create RFI form',
      },
      {
        id: 'detail',
        type: 'detail',
        url: `${BASE}/rfis`,
        selector: '.ag-row:first-child, tr[class*="row"]:first-child a',
        waitFor: '[class*="detail"]',
        description: 'RFI detail page',
      },
    ],
  },

  'drawings': {
    name: 'Drawings',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/drawings`,
        waitFor: '[class*="drawing"], .ag-root, table',
        description: 'Drawings list view',
      },
    ],
  },

  'specifications': {
    name: 'Specifications',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/specifications`,
        waitFor: '.ag-root, table',
        description: 'Specifications list view',
      },
    ],
  },

  'punch-list': {
    name: 'Punch List',
    states: [
      {
        id: 'list',
        type: 'list',
        url: `${BASE}/punchlist`,
        waitFor: '.ag-root, table',
        description: 'Punch List view',
      },
      {
        id: 'create-form',
        type: 'create-form',
        url: `${BASE}/punchlist`,
        selector: 'button:has-text("Create Punch Item"), [data-cy*="create"]',
        waitFor: 'form, [role="dialog"]',
        description: 'Create Punch List item form',
      },
    ],
  },
};

export function getFeature(name) {
  if (!FEATURES[name]) {
    throw new Error(`Unknown feature "${name}". Available: ${Object.keys(FEATURES).join(', ')}`);
  }
  return FEATURES[name];
}
