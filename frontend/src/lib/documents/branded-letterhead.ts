import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

interface BrandedDocumentHtmlOptions {
  title: string;
  subtitle?: string;
  detail?: string;
  meta?: Array<{
    label: string;
    value: string | null | undefined;
  }>;
  bodyHtml: string;
  /**
   * When false, the contact/locations/brand-bar footer is omitted from the
   * document body so it can instead be supplied to the PDF renderer as a
   * Puppeteer `footerTemplate` (see `buildBrandedFooterTemplate`) and stay
   * pinned to the bottom of every page. Defaults to true.
   */
  renderFooterInBody?: boolean;
}

/** Page bottom margin reserved for `buildBrandedFooterTemplate`. */
export const BRANDED_FOOTER_MARGIN = "0.9in";

const COMPANY_PHONE = "(317) 760-0088";
const COMPANY_EMAIL = "info@alleatogroup.com";
const COMPANY_WEBSITE = "alleatogroup.com";
const COMPANY_LOCATIONS = [
  "Indianapolis: 8383 Craig Street, Suite 150, Indianapolis, Indiana 46250",
  "Tampa / St. Pete: 701 94th Avenue North, Suite 118, St. Petersburg, Florida",
];
const LOGO_PUBLIC_PATH = "Alleato-Group-Logo_Dark.png";
const FOOTER_ITEMS = [
  {
    label: COMPANY_PHONE,
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z"/></svg>`,
  },
  {
    label: COMPANY_WEBSITE,
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/></svg>`,
  },
  {
    label: COMPANY_EMAIL,
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  },
];

function esc(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPublicAssetDataUri(publicPath: string): string | null {
  const assetPath = path.join(process.cwd(), "public", publicPath);
  if (!existsSync(assetPath)) return null;

  const extension = path.extname(assetPath).toLowerCase();
  const mimeType = extension === ".svg" ? "image/svg+xml" : "image/png";
  return `data:${mimeType};base64,${readFileSync(assetPath).toString("base64")}`;
}

function renderLogo() {
  const logoSrc = getPublicAssetDataUri(LOGO_PUBLIC_PATH);
  if (!logoSrc) {
    return `<div class="letterhead-logo-mark">ALLEATO<br /><span>GROUP</span></div>`;
  }

  return `<img class="letterhead-logo" src="${logoSrc}" alt="Alleato Group" />`;
}

function renderMeta(meta: BrandedDocumentHtmlOptions["meta"]) {
  const visibleMeta = (meta ?? []).filter((item) => item.value);
  if (visibleMeta.length === 0) return "";

  return `
    <dl class="document-meta">
      ${visibleMeta
        .map(
          (item) => `
            <div>
              <dt>${esc(item.label)}</dt>
              <dd>${esc(item.value)}</dd>
            </div>
          `,
        )
        .join("")}
    </dl>
  `;
}

function renderFooterItem(item: (typeof FOOTER_ITEMS)[number]) {
  return `<span><span class="footer-icon">${item.icon}</span>${esc(item.label)}</span>`;
}

/**
 * The diagonally-split brand bar as an SVG data URI. Puppeteer `footerTemplate`
 * ignores CSS `background-color`, so the bar (drawn with pseudo-elements in the
 * in-body footer) must be an image to survive in a footer template.
 */
function footerRuleSvgDataUri(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 36" preserveAspectRatio="none">` +
    `<rect x="0" y="0" width="1000" height="36" fill="#df8127"/>` +
    `<rect x="0" y="0" width="550" height="36" fill="#2f3030"/>` +
    `<polygon points="515,36 561,36 601,0 555,0" fill="#ffffff"/>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Puppeteer `footerTemplate` mirroring the in-body branded footer. Pair with
 * `buildBrandedDocumentHtml({ renderFooterInBody: false })` and
 * `renderPdfFromHtml(html, { footerTemplate, marginBottom: BRANDED_FOOTER_MARGIN })`
 * so the footer anchors to the bottom of every page instead of floating where
 * the content happens to end.
 */
export function buildBrandedFooterTemplate(): string {
  const contact = FOOTER_ITEMS.map((item) => {
    const icon = item.icon.replace(
      '<svg viewBox="0 0 24 24" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#df8127" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;">',
    );
    return `<span style="display:inline-flex;align-items:center;gap:5px;margin:0 10px;">${icon}<span>${esc(item.label)}</span></span>`;
  }).join("");

  return (
    `<div style="width:100%;margin:0;font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;">` +
    `<div style="width:600px;max-width:100%;margin:0 auto;padding:7px 0 0;border-top:1px solid #ece7e2;text-align:center;font-size:9px;color:#807b76;">${contact}</div>` +
    `<div style="text-align:center;font-size:8px;color:#77716b;padding:4px 24px 7px;">${esc(COMPANY_LOCATIONS.join(" · "))}</div>` +
    `<img src="${footerRuleSvgDataUri()}" style="display:block;width:100%;height:14px;" alt="" />` +
    `</div>`
  );
}

export function buildBrandedDocumentHtml({
  title,
  subtitle,
  detail,
  meta,
  bodyHtml,
  renderFooterInBody = true,
}: BrandedDocumentHtmlOptions) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #262626;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
    }
    .document-page {
      position: relative;
      min-height: 100vh;
      padding: 0 0 24px;
      background: #ffffff;
    }
    .letterhead {
      position: relative;
      min-height: 128px;
      margin-bottom: 30px;
      overflow: hidden;
      background: #ffffff;
    }
    .letterhead-rule {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 15px;
      overflow: hidden;
      background: #2f3030;
    }
    .letterhead-rule::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 47%;
      background: #df8127;
    }
    .letterhead-rule::after {
      content: "";
      position: absolute;
      left: 46.5%;
      top: -4px;
      bottom: -4px;
      width: 34px;
      transform: skewX(-42deg);
      background: #ffffff;
    }
    .letterhead-logo-wrap {
      position: absolute;
      left: 50%;
      top: 30px;
      width: 210px;
      height: 62px;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .letterhead-logo {
      max-width: 210px;
      max-height: 62px;
      object-fit: contain;
    }
    .letterhead-logo-mark {
      text-align: center;
      font-size: 28px;
      line-height: 1.1;
      font-weight: 700;
      color: #333333;
    }
    .letterhead-logo-mark span {
      font-size: 13px;
      letter-spacing: 0.35em;
    }
    .document-heading {
      max-width: 640px;
      margin: 0 auto 22px;
      padding: 0;
    }
    .document-title {
      margin: 0;
      color: #242424;
      font-size: 26px;
      line-height: 1.15;
      font-weight: 700;
    }
    .document-subtitle {
      margin: 7px 0 0;
      color: #5f5b56;
      font-size: 12px;
    }
    .document-detail {
      margin: 4px 0 0;
      color: #df8127;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .document-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 18px 0 0;
    }
    .document-meta div {
      min-width: 0;
      padding-top: 8px;
      border-top: 2px solid #df8127;
    }
    .document-meta dt {
      margin-bottom: 2px;
      color: #6b6762;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .document-meta dd {
      margin: 0;
      color: #252525;
      font-size: 12px;
      font-weight: 600;
    }
    .document-content {
      max-width: 640px;
      margin: 0 auto;
      padding: 0;
    }
    .document-footer {
      margin-top: 40px;
      color: #77716b;
      font-size: 9px;
    }
    .document-footer-contact {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 8px 4px 9px;
      border-top: 1px solid #ece7e2;
      color: #807b76;
      white-space: nowrap;
      max-width: 640px;
      margin: 0 auto;
    }
    .document-footer-contact > span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .footer-icon {
      display: inline-flex;
      width: 12px;
      height: 12px;
      color: #df8127;
    }
    .footer-icon svg {
      width: 12px;
      height: 12px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .document-footer-locations {
      padding: 0 4px 8px;
      color: #77716b;
      font-size: 8px;
      text-align: center;
      max-width: 640px;
      margin: 0 auto;
    }
    .document-footer-rule {
      position: relative;
      height: 36px;
      overflow: hidden;
      background: #df8127;
      border-bottom: 2px solid #df8127;
    }
    .document-footer-rule::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 55%;
      background: #2f3030;
    }
    .document-footer-rule::after {
      content: "";
      position: absolute;
      left: 53.5%;
      top: -4px;
      bottom: -4px;
      width: 38px;
      transform: skewX(42deg);
      background: #ffffff;
    }
    @media print {
      .section, .photo-card, .contact, .dates-grid {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="document-page">
    <header class="letterhead">
      <div class="letterhead-logo-wrap">${renderLogo()}</div>
      <div class="letterhead-rule"></div>
    </header>
    <main>
      <section class="document-heading">
        <h1 class="document-title">${esc(title)}</h1>
        ${subtitle ? `<p class="document-subtitle">${esc(subtitle)}</p>` : ""}
        ${detail ? `<p class="document-detail">${esc(detail)}</p>` : ""}
        ${renderMeta(meta)}
      </section>
      <div class="document-content">
        ${bodyHtml}
      </div>
    </main>
    ${
      renderFooterInBody
        ? `<footer class="document-footer">
      <div class="document-footer-contact">
        ${FOOTER_ITEMS.map(renderFooterItem).join("")}
      </div>
      <div class="document-footer-locations">${esc(COMPANY_LOCATIONS.join(" · "))}</div>
      <div class="document-footer-rule"></div>
    </footer>`
        : ""
    }
  </div>
</body>
</html>`;
}
