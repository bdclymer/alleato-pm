import { logger } from "@/lib/logger";

/**
 * Must match the installed @sparticuz/chromium version — the guardrail test in
 * __tests__/pdf.unit.test.ts fails if a package upgrade drifts this pin.
 */
export const CHROMIUM_PACK_VERSION = "148.0.0";

/**
 * Chromium pack downloaded at runtime when the bundled binary is unusable.
 *
 * MUST be architecture-aware: Vercel functions run x64 OR arm64 (varies per
 * deployment), and the @sparticuz/chromium npm package bundles an x64-only
 * binary. Serving the wrong pack extracts fine but fails at launch with
 * `cannot execute binary file` (exit code 126) — seen in production 2026-07-01
 * on the commitment-CO export. Override via CHROMIUM_REMOTE_PACK_URL env (e.g.
 * self-hosted storage) — the override is used verbatim for both architectures.
 */
export function getChromiumRemotePackUrl(arch: string = process.arch): string {
  const override = process.env.CHROMIUM_REMOTE_PACK_URL;
  if (override) return override;
  const packArch = arch === "arm64" ? "arm64" : "x64";
  return `https://github.com/Sparticuz/chromium/releases/download/v${CHROMIUM_PACK_VERSION}/chromium-v${CHROMIUM_PACK_VERSION}-pack.${packArch}.tar`;
}

/**
 * Removes the Chromium artifacts @sparticuz/chromium caches in /tmp.
 * executablePath() short-circuits on an existing /tmp/chromium, so a warm
 * function instance holding a wrong-arch or corrupt binary stays broken until
 * this cache is wiped.
 */
async function clearCachedChromium(): Promise<void> {
  const [{ rm }, { tmpdir }, path] = await Promise.all([
    import("node:fs/promises"),
    import("node:os"),
    import("node:path"),
  ]);
  await Promise.allSettled([
    rm(path.join(tmpdir(), "chromium"), { force: true }),
    rm(path.join(tmpdir(), "chromium-pack"), { recursive: true, force: true }),
  ]);
}

/**
 * Launches headless Chromium in a serverless (Vercel/Lambda) environment.
 *
 * Resolution order:
 * 1. arm64 function → straight to the arm64 remote pack (the npm-bundled
 *    binary is x64-only, so the "bundled" path can never work on arm64).
 * 2. x64 function → bundled binary if next.config's outputFileTracingIncludes
 *    delivered it (fast path; Turbopack builds currently don't), else the x64
 *    remote pack.
 * 3. If launch itself fails (wrong-arch/corrupt binary cached in /tmp on a warm
 *    instance — exec code 126), wipe the /tmp cache, re-extract the
 *    arch-correct pack, and retry once.
 *
 * Net effect: a PDF route cannot hard-fail on a tracing/bundling regression or
 * an architecture change — worst case is a slower cold start. New PDF tools do
 * not have to be hand-wired into next.config to avoid a 500.
 */
async function launchServerlessBrowser() {
  const puppeteer = await import("puppeteer-core");
  const chromium = (await import("@sparticuz/chromium")).default;

  const launch = (executablePath: string) =>
    puppeteer.default.launch({
      executablePath,
      args: chromium.args,
      headless: true,
    });

  const resolveExecutablePath = async (): Promise<string> => {
    if (process.arch === "arm64") {
      return chromium.executablePath(getChromiumRemotePackUrl());
    }
    try {
      return await chromium.executablePath();
    } catch (bundledError) {
      logger.warn({
        msg: "[pdf] bundled Chromium unavailable; downloading remote pack",
        arch: process.arch,
        error: bundledError instanceof Error ? bundledError.message : String(bundledError),
        remotePackUrl: getChromiumRemotePackUrl(),
      });
      return chromium.executablePath(getChromiumRemotePackUrl());
    }
  };

  try {
    return await launch(await resolveExecutablePath());
  } catch (launchError) {
    logger.warn({
      msg: "[pdf] Chromium launch failed; clearing cached binary and retrying with arch-correct pack",
      arch: process.arch,
      error: launchError instanceof Error ? launchError.message : String(launchError),
      remotePackUrl: getChromiumRemotePackUrl(),
    });
    await clearCachedChromium();
    return launch(await chromium.executablePath(getChromiumRemotePackUrl()));
  }
}

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

export interface LogTableColumn {
  label: string;
  /** CSS text-align for the column body cells. Defaults to "left". */
  align?: "left" | "center" | "right";
}

/**
 * Renders a wide, landscape-friendly data table for branded "log" style PDF
 * exports (RFI log, drawing log, budget export, etc). Meant to be dropped
 * into `buildBrandedDocumentHtml({ bodyHtml, contentWidth: "100%" })` and
 * rendered with `renderPdfFromHtml(html, { landscape: true, ... })`.
 */
export function buildBrandedLogTableHtml({
  columns,
  rows,
  emptyMessage = "No records found.",
}: {
  columns: LogTableColumn[];
  rows: Array<Array<string | number | null | undefined>>;
  emptyMessage?: string;
}): string {
  const headerCells = columns
    .map((col) => `<th style="text-align:${col.align ?? "left"};">${esc(col.label)}</th>`)
    .join("");

  const bodyRows = rows.length
    ? rows
        .map((row) => {
          const cells = row
            .map((value, i) => {
              const align = columns[i]?.align ?? "left";
              return `<td style="text-align:${align};">${esc(value ?? "—")}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${columns.length}" style="text-align:center;padding:16px;color:#807b76;">${esc(emptyMessage)}</td></tr>`;

  return `
    <style>
      .log-table { width: 100%; border-collapse: collapse; font-size: 9px; }
      .log-table th { background: #2f3030; color: #fff; padding: 5px 6px; font-weight: 700; border: 1px solid #4a4a4a; white-space: nowrap; }
      .log-table td { padding: 4px 6px; border: 1px solid #e2ddd7; vertical-align: top; }
      .log-table tr:nth-child(even) td { background: #faf9f7; }
    </style>
    <table class="log-table">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
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
 * Renders HTML to a PDF buffer using puppeteer-core.
 *
 * In production (Vercel/Lambda) we use @sparticuz/chromium which ships a
 * pre-built headless binary for Linux serverless environments.
 *
 * In local development we point puppeteer-core at the system Chrome
 * installation so the Linux-only @sparticuz binary isn't needed.
 */
export interface RenderPdfOptions {
  /** Puppeteer footer template HTML, pinned to the bottom margin of every page. */
  footerTemplate?: string;
  /** Bottom page margin; widen to make room for a footerTemplate. Defaults to 0.5in. */
  marginBottom?: string;
  /** Print in landscape orientation (wide tables). Defaults to portrait. */
  landscape?: boolean;
}

export async function renderPdfFromHtml(
  html: string,
  options: RenderPdfOptions = {},
): Promise<Buffer> {
  const isProduction = process.env.NODE_ENV === "production";
  const browser = isProduction ? await launchServerlessBrowser() : null;

  if (!browser) {
    const [{ tmpdir }, fs, { promisify }, { execFile }] = await Promise.all([
      import("node:os"),
      import("node:fs/promises"),
      import("node:util"),
      import("node:child_process"),
    ]);
    const runExecFile = promisify(execFile);
    const crypto = await import("node:crypto");
    const path = await import("node:path");

    const tempPrefix = `alleato-pdf-${crypto.randomUUID()}`;
    const htmlPath = path.join(tmpdir(), `${tempPrefix}.html`);
    const optionsPath = path.join(tmpdir(), `${tempPrefix}.json`);
    const outputPath = path.join(tmpdir(), `${tempPrefix}.pdf`);
    const scriptPath = path.join(process.cwd(), "scripts", "render-pdf.mjs");
    const nodeBinary =
      process.env.NODE && process.env.NODE.length > 0 ? process.env.NODE : process.execPath;

    await fs.writeFile(htmlPath, html, "utf8");
    await fs.writeFile(optionsPath, JSON.stringify(options), "utf8");

    try {
      try {
        await runExecFile(nodeBinary, [scriptPath, htmlPath, optionsPath, outputPath], {
          cwd: process.cwd(),
        });
      } catch (error) {
        const details =
          error instanceof Error && "stderr" in error
            ? String((error as Error & { stderr?: string }).stderr || "").trim()
            : "";
        throw new Error(
          details ? `Local PDF renderer failed via ${nodeBinary}: ${details}` : String(error),
        );
      }
      return await fs.readFile(outputPath);
    } finally {
      await Promise.allSettled([
        fs.rm(htmlPath, { force: true }),
        fs.rm(optionsPath, { force: true }),
        fs.rm(outputPath, { force: true }),
      ]);
    }
  }

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
      landscape: Boolean(options.landscape),
      printBackground: true,
      displayHeaderFooter: Boolean(options.footerTemplate),
      headerTemplate: "<div></div>",
      footerTemplate: options.footerTemplate ?? "<div></div>",
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: options.marginBottom ?? "0.5in",
        left: "0.5in",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
