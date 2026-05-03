import type {
  ProgressReportContact,
  ProgressReportPhotoSelection,
  ProgressReportRecord,
} from "@/lib/progress-reports/types";

function esc(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString("en-US")} - ${endDate.toLocaleDateString("en-US")}`;
}

function bulletLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function renderBulletSection(title: string, value: string) {
  const lines = bulletLines(value);
  return `
    <section class="section">
      <h2>${esc(title)}</h2>
      ${
        lines.length > 0
          ? `<ul>${lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>`
          : `<p class="empty">No content added yet.</p>`
      }
    </section>
  `;
}

function renderContact(contact: ProgressReportContact) {
  return `
    <div class="contact">
      <div class="contact-role">${esc(contact.role || "Contact")}</div>
      <div class="contact-name">${esc(contact.name || "—")}</div>
      <div>${esc(contact.email || "—")}</div>
      <div>${esc(contact.phone || "—")}</div>
    </div>
  `;
}

function renderPhoto(photo: ProgressReportPhotoSelection) {
  const takenOn = formatDate(photo.photo.date_taken ?? photo.photo.created_at);
  const caption = photo.caption || photo.photo.description || photo.photo.title;

  return `
    <figure class="photo-card">
      <div class="photo-frame">
        <img src="${esc(photo.photo.file_url)}" alt="${esc(photo.photo.title)}" />
      </div>
      <figcaption>
        <div class="photo-title">${esc(photo.photo.title)}</div>
        <div class="photo-meta">${esc(takenOn)}${photo.photo.location ? ` · ${esc(photo.photo.location)}` : ""}</div>
        ${caption ? `<div class="photo-caption">${esc(caption)}</div>` : ""}
      </figcaption>
    </figure>
  `;
}

export function buildProgressReportHtml({
  project,
  report,
  selectedPhotos,
}: {
  project: {
    name: string | null;
    project_number: string | null;
    address: string | null;
  };
  report: ProgressReportRecord;
  selectedPhotos: ProgressReportPhotoSelection[];
}): string {
  const title = project.name ? `${project.name} Progress Report` : report.title;
  const addressLine = [project.project_number, project.address].filter(Boolean).join(" · ");
  const contacts = report.contacts.length > 0 ? report.contacts : [];

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
      color: #111827;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
    }
    .page {
      padding: 28px 30px 36px;
    }
    .header {
      margin-bottom: 20px;
    }
    .report-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: 0.02em;
    }
    .report-meta {
      color: #475569;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .dates-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 18px;
      margin: 18px 0 22px;
      padding: 14px 16px;
      border: 1px solid #dbe3ef;
      background: #f8fafc;
    }
    .dates-grid div { min-width: 0; }
    .label {
      display: block;
      margin-bottom: 2px;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .value {
      font-size: 14px;
      color: #0f172a;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section h2 {
      margin: 0 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #dbe3ef;
      font-size: 16px;
    }
    .section ul {
      margin: 0;
      padding-left: 18px;
    }
    .section li {
      margin-bottom: 6px;
    }
    .empty {
      color: #64748b;
      margin: 0;
    }
    .weather {
      font-size: 14px;
      font-weight: 600;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .photo-card {
      margin: 0;
      border: 1px solid #dbe3ef;
      background: #ffffff;
    }
    .photo-frame {
      height: 220px;
      overflow: hidden;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    figcaption {
      padding: 10px 12px 12px;
    }
    .photo-title {
      font-weight: 700;
      margin-bottom: 2px;
    }
    .photo-meta {
      color: #64748b;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .photo-caption {
      color: #334155;
      font-size: 12px;
    }
    .contacts {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 10px;
    }
    .contact {
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid #dbe3ef;
      background: #f8fafc;
    }
    .contact-role {
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }
    .contact-name {
      font-weight: 700;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="report-title">${esc(title)}</div>
      <div class="report-meta">${esc(addressLine)}</div>
      <div class="report-meta">Week of ${esc(formatWeekRange(report.week_start, report.week_end))}</div>
    </header>

    <section class="dates-grid">
      <div>
        <span class="label">Construction Start Date</span>
        <span class="value">${esc(formatDate(report.construction_start_date))}</span>
      </div>
      <div>
        <span class="label">Scheduled Substantial Completion</span>
        <span class="value">${esc(formatDate(report.scheduled_completion_date))}</span>
      </div>
    </section>

    ${renderBulletSection("1. Past Week’s Highlights", report.past_week_highlights)}
    ${renderBulletSection("2. Upcoming Week’s Activities", report.upcoming_week_activities)}
    ${renderBulletSection("3. Open Items", report.open_items)}

    <section class="section">
      <h2>4. Days Lost Due to Weather This Week</h2>
      <div class="weather">${esc(report.weather_days_lost)} day${report.weather_days_lost === 1 ? "" : "s"}</div>
    </section>

    <section class="section">
      <h2>5. Progress Mark-up / Photos</h2>
      ${
        selectedPhotos.length > 0
          ? `<div class="photo-grid">${selectedPhotos.map(renderPhoto).join("")}</div>`
          : `<p class="empty">No progress photos selected for this report yet.</p>`
      }
    </section>

    <section class="section">
      <h2>Project Contacts</h2>
      ${
        contacts.length > 0
          ? `<div class="contacts">${contacts.map(renderContact).join("")}</div>`
          : `<p class="empty">Add project contacts before sending this report.</p>`
      }
    </section>
  </div>
</body>
</html>`;
}

export function buildProgressReportEmailHtml({
  projectName,
  weekStart,
  weekEnd,
  senderName,
  note,
}: {
  projectName: string;
  weekStart: string;
  weekEnd: string;
  senderName: string;
  note?: string | null;
}) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.5;">
      <p style="margin: 0 0 12px;">Hello,</p>
      <p style="margin: 0 0 12px;">
        ${esc(senderName)} sent the latest weekly progress report for ${esc(projectName)}
        covering ${esc(formatWeekRange(weekStart, weekEnd))}.
      </p>
      ${
        note
          ? `<p style="margin: 0 0 12px;"><strong>Note:</strong> ${esc(note)}</p>`
          : ""
      }
      <p style="margin: 0;">The PDF report is attached.</p>
    </div>
  `;
}
