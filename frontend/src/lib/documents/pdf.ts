function esc(s: string | number | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "0";
  return String(n);
}

interface LineItemForPdf {
  quantity?: number | null;
  unit_of_measure?: string | null;
  unit_cost?: number | null;
  revenue_rom?: number | null;
  cost_rom?: number | null;
  non_committed_cost?: number | null;
  budget_line?: {
    description?: string | null;
    cost_code?: { title?: string | null } | null;
  } | null;
  vendor?: { name?: string | null } | null;
  commitment?: { contract_number?: string | null } | null;
}

interface ChangeEventForPdf {
  id: string | number;
  number?: string | number | null;
  title?: string | null;
  status?: string | null;
  type?: string | null;
  origin?: string | null;
  scope?: string | null;
  reason?: string | null;
  description?: string | null;
  created_at?: string | null;
  creator?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
}

interface ProjectForPdf {
  name?: string | null;
  number?: string | number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export function buildChangeEventHtml(
  changeEvent: ChangeEventForPdf,
  lineItems: LineItemForPdf[],
  project: ProjectForPdf | null,
): string {
  const companyName = "Alleato Group";
  const companyAddress = "2050 Meridian Blvd., Suite 300";
  const companyCityState = "Franklin, TN 37067";
  const companyPhone = "(615) 771-0024";

  const printedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const projectAddress = [project?.address, project?.city, project?.state]
    .filter(Boolean)
    .join(", ");

  const lineItemRows = lineItems
    .map((item) => {
      const budgetCode =
        item.budget_line?.cost_code?.title || item.budget_line?.description || "—";
      const vendor = item.vendor?.name || "—";
      const commitment = item.commitment?.contract_number || "—";
      const qty = fmtNum(item.quantity);
      const unitCost = fmt(item.unit_cost);
      const revenueRom = fmt(item.revenue_rom);
      const costRom = fmt(item.cost_rom);
      const nonCommitted = fmt(item.non_committed_cost);
      const latestPrice = fmt(item.revenue_rom || 0);
      const latestCost = fmt(item.cost_rom || 0);
      const overUnder = fmt((item.revenue_rom || 0) - (item.cost_rom || 0));
      return `
        <tr>
          <td>${esc(budgetCode)}</td>
          <td>${esc(vendor)} / ${esc(commitment)}</td>
          <td>${esc(item.unit_of_measure) || "—"}</td>
          <td>${qty}</td>
          <td>${unitCost}</td>
          <td>${revenueRom}</td>
          <td>${latestPrice}</td>
          <td>${qty}</td>
          <td>${unitCost}</td>
          <td>${costRom}</td>
          <td>${nonCommitted}</td>
          <td>${latestCost}</td>
          <td>${overUnder}</td>
          <td>—</td>
        </tr>`;
    })
    .join("");

  const totalRevenueRom = lineItems.reduce((s, li) => s + (li.revenue_rom || 0), 0);
  const totalCostRom = lineItems.reduce((s, li) => s + (li.cost_rom || 0), 0);
  const totalNonCommitted = lineItems.reduce((s, li) => s + (li.non_committed_cost || 0), 0);
  const totalOverUnder = totalRevenueRom - totalCostRom;

  const ceNumber = changeEvent.number || changeEvent.id;
  const ceTitle = esc(changeEvent.title) || "Untitled";
  const ceStatus = esc(changeEvent.status) || "Open";
  const ceType = esc(changeEvent.type) || "—";
  const ceOrigin = esc(changeEvent.origin) || "—";
  const ceScope = esc(changeEvent.scope) || "—";
  const ceReason = esc(changeEvent.reason) || "—";
  const ceDescription = esc(changeEvent.description) || "—";
  const createdAt = changeEvent.created_at
    ? new Date(changeEvent.created_at).toLocaleDateString("en-US")
    : "—";
  const createdBy = changeEvent.creator
    ? esc(
        [changeEvent.creator.first_name, changeEvent.creator.last_name]
          .filter(Boolean)
          .join(" ") ||
          changeEvent.creator.email ||
          "—",
      )
    : "—";
  const projectNumber = project?.number ? `${esc(String(project.number))} - ` : "";
  const projectName = esc(project?.name) || "Unknown Project";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Change Event #${esc(String(ceNumber))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1a1a1a; background: #fff; }
    .page { padding: 20mm 15mm; min-height: 100vh; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .header-left { font-size: 10px; line-height: 1.5; }
    .header-left .company-name { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
    .header-right { text-align: right; font-size: 10px; line-height: 1.5; }
    .header-right .project-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
    hr.divider { border: none; border-top: 2px solid #1a1a1a; margin-bottom: 16px; }
    .ce-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 20px; }
    .meta-row { display: flex; gap: 6px; }
    .meta-label { font-weight: 600; white-space: nowrap; min-width: 100px; }
    .meta-value { color: #333; }
    .section-heading { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 8px; }
    th { background: #2d2d2d; color: #fff; padding: 4px 3px; text-align: center; font-weight: 600; border: 1px solid #444; white-space: nowrap; }
    th.group-revenue { background: #1a4d7a; }
    th.group-cost { background: #2d6b3d; }
    th.group-overunder { background: #6b3a2d; }
    th.group-budgetmod { background: #4a3d6b; }
    td { padding: 3px; border: 1px solid #ddd; text-align: center; vertical-align: top; }
    td:first-child { text-align: left; }
    td:nth-child(2) { text-align: left; }
    tr:nth-child(even) { background: #f8f8f8; }
    .totals-row { font-weight: 700; background: #f0f0f0 !important; }
    .totals-row td { border-top: 2px solid #333; }
    .footer { display: flex; justify-content: space-between; font-size: 8px; color: #666; border-top: 1px solid #ccc; padding-top: 4px; margin-top: 16px; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="company-name">${companyName}</div>
      <div>${companyAddress}</div>
      <div>${companyCityState}</div>
      <div>${companyPhone}</div>
    </div>
    <div class="header-right">
      <div class="project-name">Project: ${projectNumber}${projectName}</div>
      ${projectAddress ? `<div>${esc(projectAddress)}</div>` : ""}
    </div>
  </div>
  <hr class="divider" />
  <div class="ce-title">CHANGE EVENT #${esc(String(ceNumber))} &mdash; ${ceTitle}</div>
  <div class="meta-grid">
    <div>
      <div class="meta-row"><span class="meta-label">Origin:</span><span class="meta-value">${ceOrigin}</span></div>
      <div class="meta-row"><span class="meta-label">Date Created:</span><span class="meta-value">${createdAt}</span></div>
      <div class="meta-row"><span class="meta-label">Status:</span><span class="meta-value">${ceStatus}</span></div>
      <div class="meta-row"><span class="meta-label">Type:</span><span class="meta-value">${ceType}</span></div>
      <div class="meta-row"><span class="meta-label">Description:</span><span class="meta-value">${ceDescription}</span></div>
      <div class="meta-row"><span class="meta-label">Attachments:</span><span class="meta-value">—</span></div>
    </div>
    <div>
      <div class="meta-row"><span class="meta-label">Created By:</span><span class="meta-value">${createdBy}</span></div>
      <div class="meta-row"><span class="meta-label">Scope:</span><span class="meta-value">${ceScope}</span></div>
      <div class="meta-row"><span class="meta-label">Change Reason:</span><span class="meta-value">${ceReason}</span></div>
    </div>
  </div>
  <div class="section-heading">Change Event Line Items</div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">Budget Code</th>
        <th rowspan="2">Vendor / Contract</th>
        <th rowspan="2">UOM</th>
        <th colspan="3" class="group-revenue">Revenue</th>
        <th colspan="1" class="group-revenue">Prime PCO</th>
        <th colspan="4" class="group-cost">Cost</th>
        <th colspan="1" class="group-overunder">Over/Under</th>
        <th colspan="1" class="group-budgetmod">Budget Mod.</th>
      </tr>
      <tr>
        <th class="group-revenue">QTY</th>
        <th class="group-revenue">Unit Cost</th>
        <th class="group-revenue">ROM</th>
        <th class="group-revenue">Latest Price</th>
        <th class="group-cost">QTY</th>
        <th class="group-cost">Unit Cost</th>
        <th class="group-cost">Non-Commit.</th>
        <th class="group-cost">Latest Cost</th>
        <th class="group-overunder">Over/Under</th>
        <th class="group-budgetmod">Budget Mod.</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows || `<tr><td colspan="14" style="text-align:center;padding:8px;color:#666;">No line items</td></tr>`}
      <tr class="totals-row">
        <td colspan="5"><strong>Grand Totals</strong></td>
        <td>${fmt(totalRevenueRom)}</td>
        <td>${fmt(totalRevenueRom)}</td>
        <td></td>
        <td></td>
        <td>${fmt(totalNonCommitted)}</td>
        <td>${fmt(totalCostRom)}</td>
        <td>${fmt(totalOverUnder)}</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    <span>${companyName}</span>
    <span>Page 1 of 1</span>
    <span>Printed on: ${printedOn}</span>
  </div>
</div>
</body>
</html>`;
}

/**
 * Renders HTML to a PDF buffer using @sparticuz/chromium + puppeteer-core.
 *
 * This replaces the previous playwright-based implementation which required
 * a full Chromium install that is NOT available in serverless environments
 * (Vercel, AWS Lambda, etc.).  @sparticuz/chromium ships a pre-built
 * headless shell that works in those environments without any extra setup.
 *
 * Root cause of the original bug:
 *   playwright's `chromium.launch()` resolves the executable from
 *   ~/.cache/ms-playwright, which is never present in a serverless container.
 *
 * Prevention: The `playwright` package must never be imported in server-side
 * PDF routes.  If Playwright is needed for E2E tests it should remain a
 * devDependency used only in `tests/`.
 */
export async function renderPdfFromHtml(html: string): Promise<Buffer> {
  // Dynamic imports so the heavy binary isn't loaded in non-PDF code paths.
  const chromium = (await import("@sparticuz/chromium")).default;
  const puppeteer = await import("puppeteer-core");

  const browser = await puppeteer.default.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for any lazy-loading images to settle before printing.
    await page.evaluate(async () => {
      const pendingImages = Array.from(document.images).filter(
        (image) => !image.complete,
      );
      await Promise.all(
        pendingImages.map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      );
    });

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
