function esc(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtCurrency(value: number | null | undefined): string {
  if (value == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export interface CommitmentCoPdfLineItem {
  description: string | null;
  amount: number | null;
  costCodeLabel: string;
  costTypeLabel: string;
}

export interface CommitmentCoPdfData {
  changeOrderNumber: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  amount: number | null;
  requestedDate: string | null;
  approvedDate: string | null;
  createdAt: string | null;
  commitmentNumber: string | null;
  projectName: string | null;
  projectNumber: string | null;
  projectAddress: string | null;
  lineItems: CommitmentCoPdfLineItem[];
}

export function buildCommitmentCoPdfHtml(data: CommitmentCoPdfData): string {
  const printedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const title = data.title || data.description || "Commitment Change Order";
  const number = data.changeOrderNumber || "CCO";
  const lineItemSubtotal = data.lineItems.reduce(
    (sum, item) => sum + (item.amount ?? 0),
    0,
  );

  const lineItemRows = data.lineItems.length
    ? data.lineItems
        .map(
          (item) => `
          <tr>
            <td>${esc(item.description || "—")}</td>
            <td>${esc(item.costCodeLabel)}</td>
            <td>${esc(item.costTypeLabel)}</td>
            <td class="amount">${fmtCurrency(item.amount)}</td>
          </tr>`,
        )
        .join("")
    : `
      <tr>
        <td colspan="4" class="empty">No line items</td>
      </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(number)} - ${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      background: #ffffff;
      font-size: 12px;
    }
    .page {
      padding: 32px 36px 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
    }
    .header h1 {
      margin: 0 0 6px;
      font-size: 28px;
      font-weight: 600;
      color: #111827;
    }
    .eyebrow {
      color: #6b7280;
      font-size: 13px;
    }
    .meta {
      text-align: right;
      color: #4b5563;
      line-height: 1.5;
    }
    .section {
      margin-top: 28px;
    }
    .section h2 {
      margin: 0 0 14px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #c2410c;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 28px;
    }
    .field {
      display: grid;
      grid-template-columns: 140px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    .label {
      color: #6b7280;
    }
    .value {
      color: #111827;
      word-break: break-word;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      vertical-align: top;
    }
    th {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #6b7280;
      font-weight: 600;
    }
    .amount {
      text-align: right;
      white-space: nowrap;
    }
    .summary {
      margin-top: 14px;
      width: 320px;
      margin-left: auto;
    }
    .summary .field {
      grid-template-columns: 1fr auto;
    }
    .summary .value {
      white-space: nowrap;
      text-align: right;
    }
    .total .label,
    .total .value {
      font-weight: 700;
      color: #111827;
    }
    .empty {
      color: #6b7280;
      text-align: center;
      padding: 20px 12px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="eyebrow">${esc(number)}</div>
        <h1>${esc(title)}</h1>
        <div class="eyebrow">${esc(data.projectNumber || "")}${data.projectNumber && data.projectName ? " — " : ""}${esc(data.projectName || "")}</div>
      </div>
      <div class="meta">
        <div>Printed ${esc(printedOn)}</div>
        <div>Status: ${esc(data.status || "Unknown")}</div>
      </div>
    </div>

    <section class="section">
      <h2>Overview</h2>
      <div class="grid">
        <div class="field">
          <div class="label">CO Number</div>
          <div class="value">${esc(number)}</div>
        </div>
        <div class="field">
          <div class="label">Commitment</div>
          <div class="value">${esc(data.commitmentNumber || "—")}</div>
        </div>
        <div class="field">
          <div class="label">Description</div>
          <div class="value">${esc(data.description || "—")}</div>
        </div>
        <div class="field">
          <div class="label">Project Address</div>
          <div class="value">${esc(data.projectAddress || "—")}</div>
        </div>
        <div class="field">
          <div class="label">Requested</div>
          <div class="value">${esc(fmtDate(data.requestedDate))}</div>
        </div>
        <div class="field">
          <div class="label">Approved</div>
          <div class="value">${esc(fmtDate(data.approvedDate))}</div>
        </div>
        <div class="field">
          <div class="label">Created</div>
          <div class="value">${esc(fmtDate(data.createdAt))}</div>
        </div>
        <div class="field">
          <div class="label">Total Amount</div>
          <div class="value">${esc(fmtCurrency(data.amount))}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Line Items</h2>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Cost Code</th>
            <th>Cost Type</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemRows}
        </tbody>
      </table>

      <div class="summary">
        <div class="field">
          <div class="label">Line Items Subtotal</div>
          <div class="value">${esc(fmtCurrency(lineItemSubtotal))}</div>
        </div>
        <div class="field total">
          <div class="label">Change Order Total</div>
          <div class="value">${esc(fmtCurrency(data.amount))}</div>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`;
}
