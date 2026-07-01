import { readFileSync } from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parse } from "node-html-parser";

import type { Database } from "@/types/database.types";
import {
  BRANDED_FOOTER_MARGIN,
  buildBrandedDocumentHtml,
  buildBrandedFooterTemplate,
} from "@/lib/documents/branded-letterhead";

export type DocumentRecordType =
  | "prime-contract"
  | "commitment"
  | "change-order"
  | "prime-contract-change-order";

type TypedSupabaseClient = SupabaseClient<Database>;

type PersonRow = Database["public"]["Tables"]["people"]["Row"];

interface RelatedCompanyConfig {
  companyId: string;
  role: string;
  defaultSelected?: boolean;
}

interface PrimeContractCompanyRelation {
  id: string;
  name: string | null;
}

interface PrimeContractVendorRelation {
  id: string;
  name: string | null;
  contact_email?: string | null;
}

interface PrimeContractRow {
  id: string;
  project_id: number;
  contract_number: string;
  title: string;
  description: string | null;
  status: string;
  original_contract_value: number;
  revised_contract_value: number;
  executed: boolean;
  executed_at: string | null;
  start_date: string | null;
  end_date: string | null;
  substantial_completion_date: string | null;
  actual_completion_date: string | null;
  signed_contract_received_date: string | null;
  contract_termination_date: string | null;
  retention_percentage: number | null;
  payment_terms: string | null;
  billing_schedule: string | null;
  inclusions: string | null;
  exclusions: string | null;
  client: PrimeContractCompanyRelation | PrimeContractCompanyRelation[] | null;
  contract_company: PrimeContractCompanyRelation | PrimeContractCompanyRelation[] | null;
  contractor: PrimeContractCompanyRelation | PrimeContractCompanyRelation[] | null;
  architect_engineer: PrimeContractCompanyRelation | PrimeContractCompanyRelation[] | null;
  vendor: PrimeContractVendorRelation | PrimeContractVendorRelation[] | null;
  approved_change_orders?: number;
  pending_change_orders?: number;
  draft_change_orders?: number;
  pending_revised_contract_amount?: number;
  invoiced_amount?: number;
  payments_received?: number;
  remaining_balance?: number;
}

interface ContractLineItemRow {
  id: string;
  line_number: number;
  description: string;
  quantity: number | null;
  unit_of_measure: string | null;
  unit_cost: number | null;
  total_cost: number | null;
}

interface ContractChangeOrderRow {
  id: string;
  change_order_number: string;
  description: string;
  amount: number;
  status: string;
  requested_date: string;
}

type PrimeContractChangeOrderRow =
  Database["public"]["Tables"]["prime_contract_change_orders"]["Row"];

interface CommitmentUnifiedRow {
  commitment_type: string;
}

interface CommitmentCompanyRelation {
  id: string;
  name: string | null;
}

interface VendorRecipientRow {
  id: string;
  company_id: string;
  contact_email: string | null;
  contact_name: string | null;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

interface CommitmentBaseRow {
  id: string;
  project_id: number;
  created_at?: string;
  contract_number: string;
  title: string | null;
  description: string | null;
  status: string;
  executed: boolean;
  contract_date?: string | null;
  start_date?: string | null;
  estimated_completion_date?: string | null;
  substantial_completion_date?: string | null;
  actual_completion_date?: string | null;
  signed_contract_received_date?: string | null;
  signed_po_received_date?: string | null;
  issued_on_date?: string | null;
  payment_terms?: string | null;
  accounting_method?: string | null;
  default_retainage_percent?: number | null;
  bill_to?: string | null;
  ship_to?: string | null;
  ship_via?: string | null;
  prime_contract_id?: string | null;
  inclusions?: string | null;
  exclusions?: string | null;
  invoice_contact_ids?: string[] | null;
  contract_company_id: string | null;
  contract_company: CommitmentCompanyRelation | CommitmentCompanyRelation[] | null;
}

interface CommitmentTotalsRow {
  total_sov_amount?: number | null;
  total_billed_to_date?: number | null;
  total_amount_remaining?: number | null;
}

interface CommitmentLineItemRow {
  id: string;
  line_number: number | null;
  description: string | null;
  amount: number | null;
  quantity?: number | null;
  unit_cost?: number | null;
  uom?: string | null;
  unit_of_measure?: string | null;
  billed_to_date?: number | null;
}

interface ChangeOrderRow {
  id: number;
  project_id: number;
  co_number: string | null;
  title: string | null;
  description: string | null;
  amount: number | null;
  status: string | null;
  revision: number | null;
  date_initiated: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  due_date: string | null;
  review_date: string | null;
  schedule_impact: string | null;
  scope: string | null;
  designated_reviewer_id: string | null;
  submitted_by: string | null;
  approved_by: string | null;
  contract_id: number | null;
}

interface ContractRow {
  id: number;
  contract_number: string | null;
  title: string;
  client_id: number;
  owner_client_id: number | null;
  original_contract_amount: number | null;
  revised_contract_amount: number | null;
}

interface ClientRow {
  id: number;
  name: string | null;
  company_id: string | null;
  company_name: string | null;
}

interface ChangeOrderLineRow {
  id: number;
  description: string | null;
  amount: number | null;
}

interface ProjectRow {
  id: number;
  name: string | null;
  address: string | null;
  project_number: string | null;
  company_id: string | null;
  state?: string | null;
  summary_metadata?: {
    city?: string | null;
    postal_code?: string | null;
  } | null;
}

interface CompanyProfileRow {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  title?: string | null;
}

interface ContactProfile {
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
}

interface CommitmentContractTemplateData {
  ownerName: string | null;
  contractorNotice: ContactProfile & {
    companyName: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
  };
  counterpartyNotice: ContactProfile & {
    companyName: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
  };
  contractorSignerName: string | null;
  contractorSignerTitle: string | null;
}

export interface DocumentPdfOptions {
  footerTemplate?: string;
  marginBottom?: string;
}

export interface DocumentRecipientSuggestion {
  id: string;
  email: string;
  name: string;
  source: string;
  defaultSelected: boolean;
}

export interface DocumentSection {
  title: string;
  fields: Array<{
    label: string;
    value: string;
  }>;
}

export interface DocumentListSection {
  title: string;
  items: string[];
}

export interface DocumentLineItem {
  lineNumber: string;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
  total: string;
}

export interface DocumentBundle {
  recordType: DocumentRecordType;
  commitmentType?: string;
  recordId: string;
  label: string;
  title: string;
  number: string;
  status: string;
  effectiveDate?: string | null;
  filename: string;
  defaultSubject: string;
  parties?: {
    contractor: string;
    counterparty: string;
  };
  project?: {
    name: string;
    address: string;
    jobNumber: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
  };
  commitmentContractTemplate?: CommitmentContractTemplateData;
  sections: DocumentSection[];
  totals: Array<{ label: string; value: string }>;
  lineItems: DocumentLineItem[];
  listSections: DocumentListSection[];
  recipients: DocumentRecipientSuggestion[];
}

function coerceSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatCurrency(value: number | null | undefined): string {
  const normalized = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(normalized);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBool(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatPlainValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Not set";
  return String(value);
}

function splitListField(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function fetchPeopleSuggestions(
  supabase: TypedSupabaseClient,
  relatedCompanies: RelatedCompanyConfig[],
  directPersonIds: string[] = [],
): Promise<DocumentRecipientSuggestion[]> {
  const companyIds = Array.from(
    new Set(relatedCompanies.map((item) => item.companyId).filter(Boolean)),
  );

  const peopleMap = new Map<string, PersonRow>();

  if (companyIds.length > 0) {
    const { data: companyPeople, error } = await supabase
      .from("people")
      .select("id, first_name, last_name, email, company_id")
      .in("company_id", companyIds)
      .not("email", "is", null)
      .order("last_name", { ascending: true });

    if (error) {
      throw new Error(`Failed to load related contacts: ${error.message}`);
    }

    for (const person of companyPeople ?? []) {
      peopleMap.set(person.id, person as any);
    }
  }

  const uniqueDirectIds = Array.from(new Set(directPersonIds.filter(Boolean)));
  const missingDirectIds = uniqueDirectIds.filter((id) => !peopleMap.has(id));

  if (missingDirectIds.length > 0) {
    const { data: directPeople, error } = await supabase
      .from("people")
      .select("id, first_name, last_name, email, company_id")
      .in("id", missingDirectIds)
      .not("email", "is", null);

    if (error) {
      throw new Error(`Failed to load selected contacts: ${error.message}`);
    }

    for (const person of directPeople ?? []) {
      peopleMap.set(person.id, person as any);
    }
  }

  const directDefaults = new Set(uniqueDirectIds);
  const companyDefaults = new Map<string, { role: string; defaultSelected: boolean }>();

  for (const config of relatedCompanies) {
    if (!config.companyId) continue;
    const existing = companyDefaults.get(config.companyId);
    if (!existing || config.defaultSelected) {
      companyDefaults.set(config.companyId, {
        role: config.role,
        defaultSelected: Boolean(config.defaultSelected),
      });
    }
  }

  const suggestions = Array.from(peopleMap.values()).flatMap((person) => {
    if (!person.email) return [];

    const companyConfig = person.company_id
      ? companyDefaults.get(person.company_id)
      : undefined;
    const name = [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || person.email;

    return [
      {
        id: person.id,
        email: person.email,
        name,
        source: companyConfig?.role ?? "Related contact",
        defaultSelected:
          directDefaults.has(person.id) || Boolean(companyConfig?.defaultSelected),
      },
    ];
  });

  return suggestions.sort((left, right) => {
    if (left.defaultSelected !== right.defaultSelected) {
      return left.defaultSelected ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

function renderHtmlValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLegalDate(value: string | null | undefined): string {
  if (!value) return "____ day of __________, ______";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = parsed.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix} day of ${parsed.toLocaleDateString("en-US", { month: "long" })}, ${parsed.getFullYear()}`;
}

function getSectionField(
  bundle: DocumentBundle,
  sectionTitle: string,
  label: string,
): string {
  const section = bundle.sections.find((entry) => entry.title === sectionTitle);
  const field = section?.fields.find((entry) => entry.label === label);
  return field?.value ?? "Not set";
}

function getTotal(bundle: DocumentBundle, label: string): string {
  return bundle.totals.find((item) => item.label === label)?.value ?? "$0.00";
}

let cachedCommitmentTemplateHtml: string | null = null;

function getCommitmentTemplateHtml(): string {
  if (cachedCommitmentTemplateHtml) {
    return cachedCommitmentTemplateHtml;
  }

  cachedCommitmentTemplateHtml = readFileSync(
    path.join(process.cwd(), "src", "lib", "documents", "templates", "commitment-subcontract-template.html"),
    "utf8",
  );
  return cachedCommitmentTemplateHtml;
}

function formatAddressLine2(
  city: string | null | undefined,
  state: string | null | undefined,
  postalCode?: string | null,
): string | null {
  const parts = [city, state].map((value) => value?.trim()).filter(Boolean);
  const base = parts.join(", ");
  const zip = postalCode?.trim();
  if (base && zip) return `${base} ${zip}`;
  return base || zip || null;
}

function formatContactName(person: PersonRow | null | undefined): string | null {
  if (!person) return null;
  const value = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  return value || null;
}

function getContactPhone(person: PersonRow | null | undefined): string | null {
  return person?.phone_business || person?.phone_mobile || null;
}

function pickAuthorizedSigner(people: PersonRow[]): PersonRow | null {
  return (
    people.find((person) => /\b(ceo|president|owner)\b/i.test(person.job_title || "")) ??
    null
  );
}

function applyTextReplacements(html: string, replacements: Array<[RegExp, string]>) {
  let output = html;
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function isMeaningfulValue(value: string | null | undefined): value is string {
  return Boolean(value && value.trim() && value.trim() !== "Not set");
}

function renderInlineValueOrBlank(
  value: string | null | undefined,
  width = "220px",
): string {
  if (!isMeaningfulValue(value)) {
    return `<span style="display:inline-block;min-width:${width};border-bottom:1px solid #111;height:1em;vertical-align:baseline;"></span>`;
  }

  return `<span style="font-weight:600;">${renderHtmlValue(value.trim())}</span>`;
}

function replaceHtmlRangeByMarkers(
  html: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const startTextIndex = html.indexOf(startMarker);
  const endTextIndex = html.indexOf(endMarker);
  if (startTextIndex === -1 || endTextIndex === -1 || endTextIndex <= startTextIndex) {
    return html;
  }

  const startTagIndex = html.lastIndexOf("<p", startTextIndex);
  const endTagIndex = html.lastIndexOf("<p", endTextIndex);
  if (startTagIndex === -1 || endTagIndex === -1 || endTagIndex <= startTagIndex) {
    return html;
  }

  return `${html.slice(0, startTagIndex)}${replacement}${html.slice(endTagIndex)}`;
}

function buildCommitmentNoticeHtml(bundle: DocumentBundle): string {
  const templateData = bundle.commitmentContractTemplate;
  const contractorNotice = templateData?.contractorNotice;
  const counterpartyNotice = templateData?.counterpartyNotice;

  const renderNoticeLines = (notice: CommitmentContractTemplateData["contractorNotice"]) =>
    [
      notice?.name,
      notice?.companyName,
      notice?.email,
      notice?.addressLine1,
      notice?.addressLine2,
      notice?.phone ? `Phone: ${notice.phone}` : null,
    ]
      .filter(isMeaningfulValue)
      .map(
        (line) => `
          <p align="justify" style="margin:0 0 8px;">
            <font color="#000000">
              <span style="text-decoration:none">
                <font face="Times New Roman, serif">
                  <font size="3" style="font-size:12pt">
                    <span style="font-style:normal">
                      <span style="font-weight:normal">${renderHtmlValue(line)}</span>
                    </span>
                  </font>
                </font>
              </span>
            </font>
          </p>
        `,
      )
      .join("");

  return `
    <p align="justify" style="line-height:100%;margin-bottom:0in"><br /></p>
    <p align="justify" style="line-height:100%;margin-bottom:0in">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><b>If to Subcontractor:</b></span></font></font></span></font>
    </p>
    <p align="justify" style="line-height:100%;margin-bottom:0in"><br /></p>
    <table width="682" cellpadding="0" cellspacing="0">
      <col width="146" />
      <col width="535" />
      <tr valign="top">
        <td width="146" style="border:none;padding:0in"></td>
        <td width="535" style="border:none;padding:0in">
          ${renderNoticeLines(counterpartyNotice)}
        </td>
      </tr>
      <tr valign="top">
        <td width="146" style="border:none;padding:0in">
          <p align="justify" style="margin:0;">
            <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal">If to Contractor:</span></span></font></font></span></font>
          </p>
        </td>
        <td width="535" style="border:none;padding:0in">
          ${renderNoticeLines(contractorNotice)}
        </td>
      </tr>
    </table>
    <p align="justify" style="line-height:100%;margin-bottom:0in"><br /></p>
  `;
}

function buildCommitmentExhibitAHtml(bundle: DocumentBundle): string {
  const description = getSectionField(bundle, "Overview", "Description");
  const paymentTerms = getSectionField(bundle, "Commercial Terms", "Payment Terms");
  const originalAmount = getTotal(bundle, "Original Amount");
  const startDate = getSectionField(bundle, "Dates", "Start Date");
  const estimatedCompletion = getSectionField(bundle, "Dates", "Estimated Completion");
  const inclusions = bundle.listSections.find((section) => section.title === "Inclusions")?.items ?? [];
  const exclusions = bundle.listSections.find((section) => section.title === "Exclusions")?.items ?? [];

  const lineItemsRows = bundle.lineItems
    .map(
      (item) => `
        <tr>
          <td style="border:1px solid #000;padding:6px 8px;">${renderHtmlValue(item.lineNumber)}</td>
          <td style="border:1px solid #000;padding:6px 8px;">${renderHtmlValue(item.description)}</td>
          <td style="border:1px solid #000;padding:6px 8px;text-align:center;">${renderHtmlValue(item.quantity)}</td>
          <td style="border:1px solid #000;padding:6px 8px;text-align:center;">${renderHtmlValue(item.unit)}</td>
          <td style="border:1px solid #000;padding:6px 8px;text-align:right;">${renderHtmlValue(item.total)}</td>
        </tr>
      `,
    )
    .join("");

  const renderBulletList = (items: string[]) =>
    items.length === 0
      ? `<p style="margin:0 0 12px 0;"><font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal">None specified in the commitment record.</span></span></font></font></span></font></p>`
      : `
          <ul style="margin:0 0 14px 18px;padding:0;">
            ${items
              .map(
                (item) => `
                  <li style="margin:0 0 8px 0;">
                    <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal">${renderHtmlValue(item)}</span></span></font></font></span></font>
                  </li>
                `,
              )
              .join("")}
          </ul>
        `;

  return `
    <p align="center" style="line-height:100%;margin-bottom:0in;page-break-before:always">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><b>EXHIBIT &quot;A&quot;</b></span></font></font></span></font>
    </p>
    <p align="center" style="line-height:100%;margin-bottom:0in">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><b>SUBCONTRACTOR SCOPE OF WORK</b></span></font></font></span></font>
    </p>
    <p style="line-height:100%;margin-bottom:0in"><br /></p>
    <p style="margin:0 0 12px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal">Subcontractor shall furnish all necessary equipment, material, and labor required for commitment ${renderHtmlValue(bundle.number)} on ${renderHtmlValue(bundle.project?.name || "the project")}.</span></span></font></font></span></font>
    </p>
    <p style="margin:0 0 12px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal">Project address: ${renderHtmlValue(bundle.project?.addressLine1 || bundle.project?.address || "Not set")}${bundle.project?.addressLine2 ? `, ${renderHtmlValue(bundle.project.addressLine2)}` : ""}</span></span></font></font></span></font>
    </p>
    <p style="margin:0 0 12px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal">Contract amount: ${renderHtmlValue(originalAmount)}${isMeaningfulValue(paymentTerms) ? ` • Payment terms: ${renderHtmlValue(paymentTerms)}` : ""}</span></span></font></font></span></font>
    </p>
    ${
      isMeaningfulValue(description)
        ? `
          <p style="margin:0 0 12px 0;">
            <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal">Commitment description: ${renderHtmlValue(description)}</span></span></font></font></span></font>
          </p>
        `
        : ""
    }
    <p style="margin:18px 0 8px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><b>Scope line items</b></span></font></font></span></font>
    </p>
    <table width="682" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px 0;">
      <col width="72" />
      <col width="370" />
      <col width="80" />
      <col width="70" />
      <col width="90" />
      <tr>
        <th style="border:1px solid #000;padding:6px 8px;text-align:left;font-weight:700;">Line</th>
        <th style="border:1px solid #000;padding:6px 8px;text-align:left;font-weight:700;">Description</th>
        <th style="border:1px solid #000;padding:6px 8px;text-align:center;font-weight:700;">Qty</th>
        <th style="border:1px solid #000;padding:6px 8px;text-align:center;font-weight:700;">Unit</th>
        <th style="border:1px solid #000;padding:6px 8px;text-align:right;font-weight:700;">Amount</th>
      </tr>
      ${lineItemsRows}
    </table>
    <p style="margin:0 0 8px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><b>Inclusions</b></span></font></font></span></font>
    </p>
    ${renderBulletList(inclusions)}
    <p style="margin:0 0 8px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><b>Exclusions</b></span></font></font></span></font>
    </p>
    ${renderBulletList(exclusions)}
    <p style="margin:18px 0 10px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><u><span style="font-weight:normal">Date of commencement of Subcontractor’s Work:</span></u></span></font></font></span></font>
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal"> ${renderInlineValueOrBlank(startDate, "200px")}</span></span></font></font></span></font>
    </p>
    <p style="margin:0 0 10px 0;">
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><u><span style="font-weight:normal">The Work of this Subcontract shall be substantially completed not later than:</span></u></span></font></font></span></font>
      <font color="#000000"><span style="text-decoration:none"><font face="Times New Roman, serif"><font size="3" style="font-size:12pt"><span style="font-style:normal"><span style="font-weight:normal"> ${renderInlineValueOrBlank(estimatedCompletion, "200px")}</span></span></font></font></span></font>
    </p>
  `;
}

function renderCommitmentContractHtml(bundle: DocumentBundle): string {
  const templateData = bundle.commitmentContractTemplate;
  const templateRoot = parse(getCommitmentTemplateHtml());
  templateRoot.querySelector('div[title="header"]')?.remove();
  templateRoot.querySelector('div[title="footer"]')?.remove();

  const projectAddressLine1 = bundle.project?.addressLine1 || bundle.project?.address || "Not set";
  const projectAddressLine2 = bundle.project?.addressLine2 || "Not set";
  const contractorName = bundle.parties?.contractor || "Alleato Group";
  const counterpartyName = bundle.parties?.counterparty || "Not set";
  const ownerName = templateData?.ownerName || "Not set";
  const contractorNotice = templateData?.contractorNotice;
  const counterpartyNotice = templateData?.counterpartyNotice;

  const contractorNoticeName = contractorNotice?.name || "";
  const contractorNoticeCompany = contractorNotice?.companyName || contractorName;
  const contractorNoticeEmail = contractorNotice?.email || "";
  const contractorNoticeAddressLine1 = contractorNotice?.addressLine1 || "";
  const contractorNoticeAddressLine2 = contractorNotice?.addressLine2 || "";
  const contractorNoticePhone = contractorNotice?.phone || "";

  const counterpartyNoticeName = counterpartyNotice?.name || "";
  const counterpartyNoticeCompany = counterpartyNotice?.companyName || counterpartyName;
  const counterpartyNoticeEmail = counterpartyNotice?.email || "";
  const counterpartyNoticeAddressLine1 = counterpartyNotice?.addressLine1 || "";
  const counterpartyNoticeAddressLine2 = counterpartyNotice?.addressLine2 || "";
  const counterpartyNoticePhone = counterpartyNotice?.phone || "";

  const bodyHtml = applyTextReplacements(templateRoot.querySelector("body")?.innerHTML ?? templateRoot.toString(), [
    [/the 1st day of August, 2024/g, formatLegalDate(bundle.effectiveDate)],
    [/Alleato\s*Group/g, contractorName],
    [/Deem,\s*LLC/g, counterpartyName],
    [/Goodwill\s*Industries of Central Indiana,\s*Llc/g, ownerName],
    [/Goodwill\s*Bart/g, bundle.project?.name || "Not set"],
    [/940\s*N Marr Road/g, projectAddressLine1],
    [/Columbus,&nbsp;Indiana\s*47201/g, projectAddressLine2],
    [/24-104/g, bundle.project?.jobNumber || "Not set"],
    [/Chad(?:&nbsp;|\s+)Gooding/g, counterpartyNoticeName],
    [/cgooding@deemfirst\.com/g, counterpartyNoticeEmail],
    [/11201(?:&nbsp;|\s+)USA(?:&nbsp;|\s+)Pkwy/g, counterpartyNoticeAddressLine1],
    [/Fishers(?:&nbsp;|\s+)Indiana(?:&nbsp;|\s+)46037/g, counterpartyNoticeAddressLine2],
    [/\(317\)\s*491-2449/g, counterpartyNoticePhone],
    [/Nick(?:&nbsp;|\s+)Jepson/g, contractorNoticeName],
    [/njepson@alleatogroup\.com/g, contractorNoticeEmail],
    [/Fishers(?:,|&nbsp;|\s)+Indiana(?:&nbsp;|\s)+46037/g, counterpartyNoticeAddressLine2],
    [/Fishers,\s*Indiana\s*46037/g, counterpartyNoticeAddressLine2],
    [/Cell:\s*\(727\)\s*603-1265/g, contractorNoticePhone ? `Cell: ${contractorNoticePhone}` : ""],
    [/Brandon\s*Clymer/g, templateData?.contractorSignerName || ""],
    [/President/g, templateData?.contractorSignerTitle || ""],
    [/ProcoreSubcontractorSignHere/g, ""],
    [/ProcoreSubcontractorPrintHere/g, ""],
    [/ProcoreSubcontractorTitleHere/g, ""],
    [/ProcoreSubcontractorSignedDate/g, ""],
    [/ProcoreGeneralContractorSignHere/g, ""],
    [/ProcoreGeneralContractorSignedDate/g, ""],
  ]);

  const noticeNormalizedBody = replaceHtmlRangeByMarkers(
    bodyHtml,
    "If\nto Subcontractor:",
    "i.\n\tMerger.",
    buildCommitmentNoticeHtml(bundle),
  );

  const exhibitNormalizedBody = replaceHtmlRangeByMarkers(
    noticeNormalizedBody,
    "EXHIBIT\n&quot;A&quot;",
    "EXHIBIT\n&quot;B&quot;",
    buildCommitmentExhibitAHtml(bundle),
  );

  const normalizedBody = exhibitNormalizedBody
    .replace(/<p[^>]*>,<\/p>/g, "<p></p>")
    .replace(/<p[^>]*>\s*,\s*<\/p>/g, contractorNoticeAddressLine1 ? `<p>${renderHtmlValue(contractorNoticeAddressLine1)}</p>` : "<p></p>")
    .replace(/<p[^>]*>\s*<\/p>\s*<p[^>]*>Cell:\s*<\/p>/g, "<p></p><p></p>");

  return buildBrandedDocumentHtml({
    title: bundle.title,
    renderHeading: false,
    renderFooterInBody: false,
    bodyHtml: normalizedBody,
  });
}

export function renderDocumentHtml(bundle: DocumentBundle): string {
  if (bundle.recordType === "commitment") {
    return renderCommitmentContractHtml(bundle);
  }

  const sectionsHtml = bundle.sections
    .map(
      (section) => `
        <section class="panel">
          <h2>${renderHtmlValue(section.title)}</h2>
          <div class="field-grid">
            ${section.fields
              .map(
                (field) => `
                  <div class="field">
                    <div class="field-label">${renderHtmlValue(field.label)}</div>
                    <div class="field-value">${renderHtmlValue(field.value)}</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");

  const totalsHtml = bundle.totals.length
    ? `
      <section class="panel">
        <h2>Financial Summary</h2>
        <div class="field-grid">
          ${bundle.totals
            .map(
              (field) => `
                <div class="field">
                  <div class="field-label">${renderHtmlValue(field.label)}</div>
                  <div class="field-value">${renderHtmlValue(field.value)}</div>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>
    `
    : "";

  const lineItemsHtml = bundle.lineItems.length
    ? `
      <section class="panel">
        <h2>Line Items</h2>
        <table>
          <thead>
            <tr>
              <th>Line</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Unit Cost</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${bundle.lineItems
              .map(
                (item) => `
                  <tr>
                    <td>${renderHtmlValue(item.lineNumber)}</td>
                    <td>${renderHtmlValue(item.description)}</td>
                    <td>${renderHtmlValue(item.quantity)}</td>
                    <td>${renderHtmlValue(item.unit)}</td>
                    <td>${renderHtmlValue(item.unitCost)}</td>
                    <td>${renderHtmlValue(item.total)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `
    : "";

  const listSectionsHtml = bundle.listSections
    .filter((section) => section.items.length > 0)
    .map(
      (section) => `
        <section class="panel">
          <h2>${renderHtmlValue(section.title)}</h2>
          <ul>
            ${section.items
              .map((item) => `<li>${renderHtmlValue(item)}</li>`)
              .join("")}
          </ul>
        </section>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <title>${renderHtmlValue(bundle.filename)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #f8fafc;
          line-height: 1.45;
        }
        .page {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 40px 32px 56px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          padding-bottom: 24px;
          border-bottom: 2px solid #cbd5e1;
          margin-bottom: 24px;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 8px;
        }
        h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }
        .meta {
          min-width: 220px;
          background: #e2e8f0;
          border-radius: 14px;
          padding: 16px 18px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          padding: 4px 0;
        }
        .meta-label {
          color: #475569;
        }
        .meta-value {
          font-weight: 700;
          text-align: right;
        }
        .content {
          display: grid;
          gap: 18px;
        }
        .panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px 20px;
          page-break-inside: avoid;
        }
        h2 {
          margin: 0 0 14px;
          font-size: 14px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #334155;
        }
        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 18px;
        }
        .field-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          margin-bottom: 5px;
        }
        .field-value {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          white-space: pre-wrap;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #cbd5e1;
          padding: 10px 8px;
          text-align: left;
        }
        td {
          font-size: 13px;
          padding: 10px 8px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }
        ul {
          margin: 0;
          padding-left: 18px;
        }
        li {
          margin: 6px 0;
          font-size: 13px;
        }
        .footer {
          margin-top: 18px;
          font-size: 11px;
          color: #64748b;
          text-align: right;
        }
        @media print {
          body {
            background: white;
          }
          .page {
            padding: 0;
          }
          .panel,
          .meta {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <main class="page">
        <header class="header">
          <div>
            <div class="eyebrow">${renderHtmlValue(bundle.label)}</div>
            <h1>${renderHtmlValue(bundle.number)}${bundle.title ? ` · ${renderHtmlValue(bundle.title)}` : ""}</h1>
          </div>
          <div class="meta">
            <div class="meta-row">
              <span class="meta-label">Status</span>
              <span class="meta-value">${renderHtmlValue(bundle.status)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Generated</span>
              <span class="meta-value">${renderHtmlValue(formatDate(new Date().toISOString()))}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">File</span>
              <span class="meta-value">${renderHtmlValue(bundle.filename)}</span>
            </div>
          </div>
        </header>
        <div class="content">
          ${sectionsHtml}
          ${totalsHtml}
          ${lineItemsHtml}
          ${listSectionsHtml}
        </div>
        <div class="footer">Generated by Alleato</div>
      </main>
    </body>
  </html>`;
}

export function getDocumentPdfOptions(bundle: DocumentBundle): DocumentPdfOptions {
  if (bundle.recordType === "commitment") {
    return {
      footerTemplate: buildBrandedFooterTemplate(),
      marginBottom: BRANDED_FOOTER_MARGIN,
    };
  }

  return {};
}

export function renderDocumentEmailHtml(
  bundle: DocumentBundle,
  customMessage: string,
  senderName: string,
): string {
  const intro = customMessage.trim()
    ? `<p style="margin:0 0 16px;">${renderHtmlValue(customMessage).replace(/\n/g, "<br />")}</p>`
    : "";

  const financialSummary = bundle.totals
    .slice(0, 4)
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;color:#64748b;">${renderHtmlValue(item.label)}</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;">${renderHtmlValue(item.value)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="max-width:700px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
      <div style="padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;">
        <div style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;">${renderHtmlValue(bundle.label)}</div>
        <h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;">${renderHtmlValue(bundle.number)}${bundle.title ? ` · ${renderHtmlValue(bundle.title)}` : ""}</h1>
        <p style="margin:0 0 18px;color:#475569;">${renderHtmlValue(bundle.status)}</p>
        ${intro}
        <p style="margin:0 0 16px;">A PDF copy is attached for download and forwarding.</p>
        ${
          financialSummary
            ? `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;">${financialSummary}</table>`
            : ""
        }
        <p style="margin:20px 0 0;">Sent by ${renderHtmlValue(senderName)} via Alleato.</p>
      </div>
    </div>
  `;
}

export function renderDocumentEmailText(
  bundle: DocumentBundle,
  customMessage: string,
  senderName: string,
): string {
  const lines = [
    `${bundle.label}: ${bundle.number}${bundle.title ? ` - ${bundle.title}` : ""}`,
    `Status: ${bundle.status}`,
    "",
  ];

  if (customMessage.trim()) {
    lines.push(customMessage.trim(), "");
  }

  if (bundle.totals.length > 0) {
    lines.push("Financial Summary");
    for (const total of bundle.totals.slice(0, 4)) {
      lines.push(`${total.label}: ${total.value}`);
    }
    lines.push("");
  }

  lines.push(`Sent by ${senderName} via Alleato.`);
  return lines.join("\n");
}

async function loadPrimeContractBundle(
  supabase: TypedSupabaseClient,
  recordId: string,
): Promise<DocumentBundle> {
  const { data: contractData, error: contractError } = await supabase
    .from("prime_contracts")
    .select(
      `
        *,
        client:companies!prime_contracts_client_company_id_fkey(id, name),
        contract_company:companies!prime_contracts_contract_company_id_fkey(id, name),
        contractor:companies!prime_contracts_contractor_id_fkey(id, name),
        architect_engineer:companies!prime_contracts_architect_engineer_id_fkey(id, name),
        vendor:companies!prime_contracts_vendor_id_fkey(id, name, contact_email)
      `,
    )
    .eq("id", recordId)
    .single();

  if (contractError || !contractData) {
    throw new Error("Prime contract not found");
  }

  const contract = contractData as unknown as PrimeContractRow;

  const [lineItemsResult, changeOrdersResult] = await Promise.all([
    supabase
      .from("contract_line_items")
      .select("id, line_number, description, quantity, unit_of_measure, unit_cost, total_cost")
      .eq("contract_id", recordId)
      .order("line_number", { ascending: true }),
    supabase
      .from("contract_change_orders")
      .select("id, change_order_number, description, amount, status, requested_date")
      .eq("contract_id", recordId)
      .order("requested_date", { ascending: true }),
  ]);

  if (lineItemsResult.error) {
    throw new Error(`Failed to load contract line items: ${lineItemsResult.error.message}`);
  }

  if (changeOrdersResult.error) {
    throw new Error(`Failed to load contract change orders: ${changeOrdersResult.error.message}`);
  }

  const client = coerceSingle(contract.client);
  const ownerCompany = coerceSingle(contract.contract_company);
  const contractor = coerceSingle(contract.contractor);
  const architectEngineer = coerceSingle(contract.architect_engineer);
  const vendor = coerceSingle(contract.vendor);

  const recipients = await fetchPeopleSuggestions(
    supabase,
    [
      ...(client?.id
        ? [{ companyId: client.id, role: "Owner contact", defaultSelected: true }]
        : []),
      ...(ownerCompany?.id
        ? [{ companyId: ownerCompany.id, role: "Owner company contact", defaultSelected: true }]
        : []),
      ...(contractor?.id
        ? [{ companyId: contractor.id, role: "Contractor contact" }]
        : []),
    ],
  );

  const lineItems = (lineItemsResult.data ?? []) as ContractLineItemRow[];
  const changeOrders = (changeOrdersResult.data ?? []) as ContractChangeOrderRow[];

  const filename = `${slugify(contract.contract_number || "prime-contract")}-${slugify(contract.title || "agreement")}.pdf`;

  return {
    recordType: "prime-contract",
    recordId,
    label: "Prime Contract",
    title: contract.title,
    number: contract.contract_number || "Prime Contract",
    status: formatPlainValue(contract.status),
    filename,
    defaultSubject: `${contract.contract_number || "Prime Contract"} - ${contract.title}`,
    sections: [
      {
        title: "Parties",
        fields: [
          { label: "Owner / Client", value: client?.name || ownerCompany?.name || "Not set" },
          { label: "Contractor", value: contractor?.name || "Not set" },
          { label: "Architect / Engineer", value: architectEngineer?.name || "Not set" },
          { label: "Vendor", value: vendor?.name || "Not set" },
        ],
      },
      {
        title: "Dates",
        fields: [
          { label: "Start Date", value: formatDate(contract.start_date) },
          { label: "End Date", value: formatDate(contract.end_date) },
          { label: "Executed", value: formatBool(contract.executed) },
          { label: "Executed At", value: formatDate(contract.executed_at) },
          { label: "Substantial Completion", value: formatDate(contract.substantial_completion_date) },
          { label: "Actual Completion", value: formatDate(contract.actual_completion_date) },
          { label: "Signed Contract Received", value: formatDate(contract.signed_contract_received_date) },
          { label: "Termination Date", value: formatDate(contract.contract_termination_date) },
        ],
      },
      {
        title: "Commercial Terms",
        fields: [
          { label: "Retention", value: `${contract.retention_percentage ?? 0}%` },
          { label: "Payment Terms", value: formatPlainValue(contract.payment_terms) },
          { label: "Billing Schedule", value: formatPlainValue(contract.billing_schedule) },
          { label: "Description", value: formatPlainValue(contract.description) },
        ],
      },
    ],
    totals: [
      { label: "Original Contract Value", value: formatCurrency(contract.original_contract_value) },
      { label: "Approved Change Orders", value: formatCurrency(contract.approved_change_orders ?? 0) },
      { label: "Pending Change Orders", value: formatCurrency(contract.pending_change_orders ?? 0) },
      { label: "Revised Contract Value", value: formatCurrency(contract.revised_contract_value) },
      { label: "Invoiced Amount", value: formatCurrency(contract.invoiced_amount ?? 0) },
      { label: "Payments Received", value: formatCurrency(contract.payments_received ?? 0) },
      { label: "Remaining Balance", value: formatCurrency(contract.remaining_balance ?? 0) },
    ],
    lineItems: lineItems.map((item) => ({
      lineNumber: String(item.line_number),
      description: item.description,
      quantity: formatPlainValue(item.quantity),
      unit: formatPlainValue(item.unit_of_measure),
      unitCost: formatCurrency(item.unit_cost),
      total: formatCurrency(item.total_cost),
    })),
    listSections: [
      {
        title: "Inclusions",
        items: splitListField(contract.inclusions),
      },
      {
        title: "Exclusions",
        items: splitListField(contract.exclusions),
      },
      {
        title: "Related Change Orders",
        items: changeOrders.map(
          (changeOrder) =>
            `${changeOrder.change_order_number} · ${formatCurrency(changeOrder.amount)} · ${changeOrder.status} · ${changeOrder.description}`,
        ),
      },
    ],
    recipients,
  };
}

async function loadCommitmentBundle(
  supabase: TypedSupabaseClient,
  recordId: string,
): Promise<DocumentBundle> {
  const { data: unifiedData, error: unifiedError } = await supabase
    .from("commitments_unified")
    .select("commitment_type")
    .eq("id", recordId)
    .single();

  if (unifiedError || !unifiedData) {
    throw new Error("Commitment not found");
  }

  const commitmentType = (unifiedData as CommitmentUnifiedRow).commitment_type;
  const isSubcontract = commitmentType === "subcontract";
  const tableName = isSubcontract ? "subcontracts" : "purchase_orders";
  const totalsTable = isSubcontract ? "subcontracts_with_totals" : "purchase_orders_with_totals";
  const lineItemsTable = isSubcontract ? "subcontract_sov_items" : "purchase_order_sov_items";
  const lineItemsForeignKey = isSubcontract ? "subcontract_id" : "purchase_order_id";

  const { data: baseData, error: baseError } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", recordId)
    .single();

  if (baseError || !baseData) {
    throw new Error("Commitment record not found");
  }

  const [totalsResult, lineItemsResult] = await Promise.all([
    supabase.from(totalsTable).select("total_sov_amount, total_billed_to_date, total_amount_remaining").eq("id", recordId).single(),
    supabase.from(lineItemsTable).select("*").eq(lineItemsForeignKey, recordId).order("line_number", { ascending: true }),
  ]);

  if (totalsResult.error && totalsResult.error.code !== "PGRST116") {
    throw new Error(`Failed to load commitment totals: ${totalsResult.error.message}`);
  }

  if (lineItemsResult.error) {
    throw new Error(`Failed to load commitment line items: ${lineItemsResult.error.message}`);
  }

  const base = baseData as unknown as CommitmentBaseRow;
  const totals = (totalsResult.data ?? {}) as CommitmentTotalsRow;
  const lineItems = (lineItemsResult.data ?? []) as CommitmentLineItemRow[];

  let vendor: VendorRecipientRow | null = null;
  if (base.contract_company_id) {
    const { data: vendorData, error: vendorError } = await supabase
      .from("companies")
      .select("id, contact_email, contact_name, name, address, city, state")
      .eq("id", base.contract_company_id)
      .single();

    if (vendorError && vendorError.code !== "PGRST116") {
      throw new Error(`Failed to load vendor: ${vendorError.message}`);
    }

    vendor = (vendorData ?? null) as VendorRecipientRow | null;
  }

  const { data: projectData } = await supabase
    .from("projects")
    .select('id, name, address, project_number, company_id, state, summary_metadata')
    .eq("id", base.project_id)
    .single();

  const project = (projectData ?? null) as ProjectRow | null;

  const [projectPrimeContractResult, vendorPeopleResult] = await Promise.all([
    base.prime_contract_id
      ? supabase
          .from("prime_contracts")
          .select("id, client_id, contract_company_id, contractor_id")
          .eq("id", base.prime_contract_id)
          .single()
      : supabase
          .from("prime_contracts")
          .select("id, client_id, contract_company_id, contractor_id")
          .eq("project_id", base.project_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
    base.contract_company_id
      ? supabase
          .from("people")
          .select("id, first_name, last_name, email, job_title, phone_business, phone_mobile, company_id")
          .eq("company_id", base.contract_company_id)
          .order("created_at", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (projectPrimeContractResult.error && projectPrimeContractResult.error.code !== "PGRST116") {
    throw new Error(`Failed to load project contract context: ${projectPrimeContractResult.error.message}`);
  }

  if (vendorPeopleResult.error) {
    throw new Error(`Failed to load vendor contacts: ${vendorPeopleResult.error.message}`);
  }

  const projectPrimeContract = projectPrimeContractResult.data;
  const vendorPeople = (vendorPeopleResult.data ?? []) as PersonRow[];
  const vendorPrimaryContact = vendorPeople[0] ?? null;

  const companyIds = Array.from(
    new Set(
      [
        vendor?.id,
        project?.company_id,
        projectPrimeContract?.client_id,
        projectPrimeContract?.contract_company_id,
        projectPrimeContract?.contractor_id,
      ].filter(Boolean),
    ),
  );

  const companyProfilesById = new Map<string, CompanyProfileRow>();
  if (companyIds.length > 0) {
    const { data: companyProfiles, error: companyProfilesError } = await supabase
      .from("companies")
      .select("id, name, address, city, state, title")
      .in("id", companyIds);

    if (companyProfilesError) {
      throw new Error(`Failed to load related companies: ${companyProfilesError.message}`);
    }

    for (const profile of companyProfiles ?? []) {
      companyProfilesById.set(profile.id, profile as CompanyProfileRow);
    }
  }

  const contractorCompany =
    (project?.company_id ? companyProfilesById.get(project.company_id) : null) ??
    (projectPrimeContract?.contractor_id ? companyProfilesById.get(projectPrimeContract.contractor_id) : null) ??
    (projectPrimeContract?.contract_company_id
      ? companyProfilesById.get(projectPrimeContract.contract_company_id)
      : null) ??
    null;
  const ownerCompany =
    (projectPrimeContract?.client_id ? companyProfilesById.get(projectPrimeContract.client_id) : null) ??
    (projectPrimeContract?.contract_company_id
      ? companyProfilesById.get(projectPrimeContract.contract_company_id)
      : null) ??
    null;

  const contractorCompanyId = contractorCompany?.id ?? null;
  const contractorPeopleResult = contractorCompanyId
    ? await supabase
        .from("people")
        .select("id, first_name, last_name, email, job_title, phone_business, phone_mobile, company_id")
        .eq("company_id", contractorCompanyId)
        .order("created_at", { ascending: true })
        .limit(20)
    : { data: [], error: null };

  if (contractorPeopleResult.error) {
    throw new Error(`Failed to load contractor contacts: ${contractorPeopleResult.error.message}`);
  }

  const contractorPeople = (contractorPeopleResult.data ?? []) as PersonRow[];
  const contractorSigner = pickAuthorizedSigner(contractorPeople);
  const contractorName = contractorCompany?.name || "Alleato Group";

  const contactRecipients = await fetchPeopleSuggestions(
    supabase,
    vendor?.id
      ? [{ companyId: vendor.id, role: isSubcontract ? "Subcontractor contact" : "Vendor contact" }]
      : [],
    base.invoice_contact_ids ?? [],
  );

  const recipients = (() => {
    const merged = new Map<string, DocumentRecipientSuggestion>();

    if (vendor?.contact_email) {
      merged.set(vendor.contact_email.toLowerCase(), {
        id: `vendor-contact-${vendor.id}`,
        email: vendor.contact_email,
        name: vendor.contact_name || vendor.name || vendor.contact_email,
        source: isSubcontract ? "Subcontractor contact" : "Vendor contact",
        defaultSelected: true,
      });
    }

    for (const recipient of contactRecipients) {
      merged.set(recipient.email.toLowerCase(), recipient);
    }

    return Array.from(merged.values()).sort((left, right) => {
      if (left.defaultSelected !== right.defaultSelected) {
        return left.defaultSelected ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  })();

  const number = base.contract_number || (isSubcontract ? "Subcontract" : "Purchase Order");
  const title = base.title || (isSubcontract ? "Subcontract" : "Purchase Order");
  const filename = `${slugify(number)}-${slugify(title)}.pdf`;

  return {
    recordType: "commitment",
    commitmentType,
    recordId,
    label: isSubcontract ? "Commitment - Subcontract" : "Commitment - Purchase Order",
    title,
    number,
    status: formatPlainValue(base.status),
    effectiveDate: base.contract_date ?? base.created_at ?? null,
    filename,
    defaultSubject: `${number} - ${title}`,
    parties: {
      contractor: contractorName,
      counterparty: vendor?.name || "Not set",
    },
    project: {
      name: project?.name || "Not set",
      address: project?.address || "Not set",
      jobNumber: project?.project_number || String(base.project_id),
      addressLine1: project?.address || "Not set",
      addressLine2:
        formatAddressLine2(
          project?.summary_metadata?.city ?? null,
          project?.state ?? null,
          project?.summary_metadata?.postal_code ?? null,
        ) || null,
    },
    commitmentContractTemplate: {
      ownerName: ownerCompany?.name || null,
      contractorNotice: {
        companyName: contractorCompany?.name || contractorName,
        name: null,
        title: null,
        email: null,
        phone: null,
        addressLine1: contractorCompany?.address || null,
        addressLine2: formatAddressLine2(contractorCompany?.city, contractorCompany?.state),
      },
      counterpartyNotice: {
        companyName: vendor?.name || null,
        name: formatContactName(vendorPrimaryContact),
        title: vendorPrimaryContact?.job_title || null,
        email: vendorPrimaryContact?.email || vendor?.contact_email || null,
        phone: getContactPhone(vendorPrimaryContact),
        addressLine1: vendor?.address || null,
        addressLine2: formatAddressLine2(vendor?.city, vendor?.state),
      },
      contractorSignerName: formatContactName(contractorSigner),
      contractorSignerTitle: contractorSigner?.job_title || null,
    },
    sections: [
      {
        title: "Overview",
        fields: [
          { label: "Company", value: vendor?.name || "Not set" },
          { label: "Description", value: formatPlainValue(base.description) },
          { label: "Executed", value: formatBool(base.executed) },
          { label: "Accounting Method", value: formatPlainValue(base.accounting_method) },
        ],
      },
      {
        title: "Dates",
        fields: [
          { label: "Contract Date", value: formatDate(base.contract_date) },
          { label: "Start Date", value: formatDate(base.start_date) },
          { label: "Estimated Completion", value: formatDate(base.estimated_completion_date ?? base.substantial_completion_date) },
          { label: "Actual Completion", value: formatDate(base.actual_completion_date) },
          { label: "Issued On", value: formatDate(base.issued_on_date) },
          { label: "Signed Received", value: formatDate(base.signed_contract_received_date ?? base.signed_po_received_date) },
        ],
      },
      {
        title: "Commercial Terms",
        fields: [
          { label: "Payment Terms", value: formatPlainValue(base.payment_terms) },
          { label: "Retainage", value: `${base.default_retainage_percent ?? 0}%` },
          { label: "Bill To", value: formatPlainValue(base.bill_to) },
          { label: "Ship To", value: formatPlainValue(base.ship_to) },
          { label: "Ship Via", value: formatPlainValue(base.ship_via) },
        ],
      },
    ],
    totals: [
      { label: "Original Amount", value: formatCurrency(totals.total_sov_amount ?? 0) },
      { label: "Billed To Date", value: formatCurrency(totals.total_billed_to_date ?? 0) },
      { label: "Balance To Finish", value: formatCurrency(totals.total_amount_remaining ?? 0) },
    ],
    lineItems: lineItems.map((item) => {
      const quantity = item.quantity ?? null;
      const unitCost = item.unit_cost ?? item.amount ?? null;
      const total = item.amount ?? (quantity !== null && unitCost !== null ? quantity * unitCost : null);
      return {
        lineNumber: formatPlainValue(item.line_number),
        description: item.description || "Line item",
        quantity: formatPlainValue(quantity),
        unit: formatPlainValue(item.uom ?? item.unit_of_measure),
        unitCost: formatCurrency(unitCost),
        total: formatCurrency(total),
      };
    }),
    listSections: [
      {
        title: "Inclusions",
        items: splitListField(base.inclusions),
      },
      {
        title: "Exclusions",
        items: splitListField(base.exclusions),
      },
    ],
    recipients,
  };
}

async function loadChangeOrderBundle(
  supabase: TypedSupabaseClient,
  recordId: string,
): Promise<DocumentBundle> {
  const numericId = Number.parseInt(recordId, 10);
  if (Number.isNaN(numericId)) {
    throw new Error("Invalid change order id");
  }

  const { data: changeOrderData, error: changeOrderError } = await supabase
    .from("prime_contract_change_orders")
    .select("*")
    .eq("id", numericId)
    .single();

  if (changeOrderError || !changeOrderData) {
    throw new Error("Change order not found");
  }

  const changeOrder = changeOrderData as unknown as ChangeOrderRow;

  const [contractResult, lineItemsResult, reviewerPeopleResult] = await Promise.all([
    changeOrder.contract_id
      ? supabase
          .from("prime_contracts")
          .select("id, contract_number, title, client_id, original_contract_value, revised_contract_value")
          .eq("id", String(changeOrder.contract_id))
          .single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("change_order_lines" as any)
      .select("id, description, amount")
      .eq("change_order_id", numericId)
      .order("created_at", { ascending: true }),
    supabase
      .from("people")
      .select("id, first_name, last_name, email, company_id")
      .in(
        "id",
        [changeOrder.designated_reviewer_id, changeOrder.submitted_by, changeOrder.approved_by].filter(
          (value): value is string => Boolean(value),
        ),
      ),
  ]);

  if (contractResult && "error" in contractResult && contractResult.error) {
    throw new Error(`Failed to load parent contract: ${contractResult.error.message}`);
  }

  if (lineItemsResult.error) {
    throw new Error(`Failed to load change order line items: ${lineItemsResult.error.message}`);
  }

  if (reviewerPeopleResult.error) {
    throw new Error(`Failed to load related people: ${reviewerPeopleResult.error.message}`);
  }

  const contract = (contractResult && "data" in contractResult ? contractResult.data : null) as ContractRow | null;
  const lineItems = (lineItemsResult.data ?? []) as unknown as ChangeOrderLineRow[];

  const clientIds = [contract?.client_id, contract?.owner_client_id].filter(
    (value): value is number => typeof value === "number",
  );

  let clientsById = new Map<number, ClientRow>();
  if (clientIds.length > 0) {
    const { data: clientRows, error: clientError } = await (supabase
      .from("clients" as any)
      .select("id, name, company_id")
      .in("id", clientIds)) as any;

    if (clientError) {
      throw new Error(`Failed to load owner contacts: ${clientError.message}`);
    }

    clientsById = new Map(((clientRows ?? []) as any[]).map((client) => [client.id, client as ClientRow]));
  }

  const ownerClient = contract?.owner_client_id ? clientsById.get(contract.owner_client_id) ?? null : null;
  const client = contract?.client_id ? clientsById.get(contract.client_id) ?? null : null;

  const recipients = await fetchPeopleSuggestions(
    supabase,
    [
      ...(ownerClient?.company_id
        ? [{ companyId: ownerClient.company_id, role: "Owner contact", defaultSelected: true }]
        : []),
      ...(client?.company_id && client.company_id !== ownerClient?.company_id
        ? [{ companyId: client.company_id, role: "Client contact", defaultSelected: true }]
        : []),
    ],
    [changeOrder.designated_reviewer_id, changeOrder.submitted_by, changeOrder.approved_by].filter(
      (value): value is string => Boolean(value),
    ),
  );

  const number = changeOrder.co_number || `CO-${changeOrder.id}`;
  const title = changeOrder.title || "Change Order";
  const filename = `${slugify(number)}-${slugify(title)}.pdf`;

  return {
    recordType: "change-order",
    recordId,
    label: "Change Order",
    title,
    number,
    status: formatPlainValue(changeOrder.status),
    filename,
    defaultSubject: `${number} - ${title}`,
    sections: [
      {
        title: "Overview",
        fields: [
          { label: "Parent Contract", value: contract?.contract_number || "Not set" },
          { label: "Contract Title", value: contract?.title || "Not set" },
          { label: "Owner", value: ownerClient?.name || client?.name || "Not set" },
          { label: "Description", value: formatPlainValue(changeOrder.description) },
        ],
      },
      {
        title: "Workflow",
        fields: [
          { label: "Revision", value: formatPlainValue(changeOrder.revision) },
          { label: "Date Initiated", value: formatDate(changeOrder.date_initiated) },
          { label: "Submitted At", value: formatDate(changeOrder.submitted_at) },
          { label: "Approved At", value: formatDate(changeOrder.approved_at) },
          { label: "Due Date", value: formatDate(changeOrder.due_date) },
          { label: "Review Date", value: formatDate(changeOrder.review_date) },
        ],
      },
      {
        title: "Impact",
        fields: [
          { label: "Scope", value: formatPlainValue(changeOrder.scope) },
          { label: "Schedule Impact", value: formatPlainValue(changeOrder.schedule_impact) },
        ],
      },
    ],
    totals: [
      { label: "Change Order Amount", value: formatCurrency(changeOrder.amount) },
      { label: "Original Contract Amount", value: formatCurrency(contract?.original_contract_amount ?? 0) },
      { label: "Revised Contract Amount", value: formatCurrency(contract?.revised_contract_amount ?? 0) },
    ],
    lineItems: lineItems.map((item, index) => ({
      lineNumber: String(index + 1),
      description: item.description || "Line item",
      quantity: "1",
      unit: "LS",
      unitCost: formatCurrency(item.amount),
      total: formatCurrency(item.amount),
    })),
    listSections: [],
    recipients,
  };
}

async function loadPrimeContractChangeOrderBundle(
  supabase: TypedSupabaseClient,
  recordId: string,
): Promise<DocumentBundle> {
  const numericRecordId = Number(recordId);
  if (!Number.isFinite(numericRecordId) || numericRecordId <= 0) {
    throw new Error("Invalid prime contract change order id");
  }

  const { data: changeOrderData, error: changeOrderError } = await supabase
    .from("prime_contract_change_orders")
    .select("*")
    .eq("id", numericRecordId)
    .single();

  if (changeOrderError || !changeOrderData) {
    throw new Error("Prime contract change order not found");
  }

  const changeOrder = changeOrderData as PrimeContractChangeOrderRow;
  const contractId = changeOrder.prime_contract_id ?? changeOrder.contract_id;

  const { data: contractData, error: contractError } = await supabase
    .from("prime_contracts")
    .select(
      `
        id,
        contract_number,
        title,
        original_contract_value,
        revised_contract_value,
        client:companies!prime_contracts_client_company_id_fkey(id, name),
        contract_company:companies!prime_contracts_contract_company_id_fkey(id, name),
        contractor:companies!prime_contracts_contractor_id_fkey(id, name)
      `,
    )
    .eq("id", contractId ?? "")
    .single();

  if (contractError || !contractData) {
    throw new Error("Parent prime contract not found");
  }

  const contract = contractData as unknown as PrimeContractRow;
  const { data: projectData } = changeOrder.project_id
    ? await supabase
        .from("projects")
        .select("id, name, project_number, address")
        .eq("id", changeOrder.project_id)
        .single()
    : { data: null };

  const { data: lineItemsData } = await supabase
    .from("pcco_line_items")
    .select("description, quantity, uom, unit_cost, line_amount")
    .eq("pcco_id", numericRecordId)
    .order("id", { ascending: true });

  const client = coerceSingle(contract.client);
  const ownerCompany = coerceSingle(contract.contract_company);
  const contractor = coerceSingle(contract.contractor);

  const recipients = await fetchPeopleSuggestions(
    supabase,
    [
      ...(client?.id
        ? [{ companyId: client.id, role: "Owner contact", defaultSelected: true }]
        : []),
      ...(ownerCompany?.id
        ? [{ companyId: ownerCompany.id, role: "Owner company contact", defaultSelected: true }]
        : []),
      ...(contractor?.id
        ? [{ companyId: contractor.id, role: "Contractor contact" }]
        : []),
    ],
  );

  const number = changeOrder.pcco_number || `PCCO-${changeOrder.id}`;
  const title =
    changeOrder.title || changeOrder.description || "Prime Contract Change Order";
  const filename = `${slugify(number)}-${slugify(title)}.pdf`;
  const lineItems =
    lineItemsData && lineItemsData.length > 0
      ? lineItemsData.map((item, index) => ({
          lineNumber: String(index + 1),
          description: item.description || "Line item",
          quantity: String(item.quantity ?? 1),
          unit: item.uom || "LS",
          unitCost: formatCurrency(item.unit_cost),
          total: formatCurrency(item.line_amount),
        }))
      : [
          {
            lineNumber: "1",
            description: changeOrder.description || title,
            quantity: "1",
            unit: "LS",
            unitCost: formatCurrency(changeOrder.total_amount),
            total: formatCurrency(changeOrder.total_amount),
          },
        ];

  return {
    recordType: "prime-contract-change-order",
    recordId,
    label: "Prime Contract Change Order",
    title,
    number,
    status: formatPlainValue(changeOrder.status),
    filename,
    defaultSubject: `${number} - ${contract.contract_number || contract.title}`,
    project: projectData
      ? {
          name: projectData.name || "Not set",
          address: projectData.address || "Not set",
          jobNumber:
            projectData.project_number ||
            String(projectData.id),
        }
      : undefined,
    sections: [
      {
        title: "Overview",
        fields: [
          { label: "Parent Contract", value: contract.contract_number || "Not set" },
          { label: "Contract Title", value: contract.title || "Not set" },
          { label: "Owner / Client", value: client?.name || ownerCompany?.name || "Not set" },
          { label: "Description", value: formatPlainValue(changeOrder.description) },
          { label: "Change Reason", value: formatPlainValue(changeOrder.change_reason) },
        ],
      },
      {
        title: "Workflow",
        fields: [
          { label: "Submitted At", value: formatDate(changeOrder.submitted_at) },
          { label: "Approved At", value: formatDate(changeOrder.approved_at) },
          { label: "Due Date", value: formatDate(changeOrder.due_date) },
          { label: "Created At", value: formatDate(changeOrder.created_at) },
        ],
      },
    ],
    totals: [
      { label: "Change Order Amount", value: formatCurrency(changeOrder.total_amount) },
      { label: "Original Contract Value", value: formatCurrency(contract.original_contract_value ?? 0) },
      { label: "Current Revised Contract Value", value: formatCurrency(contract.revised_contract_value ?? 0) },
    ],
    lineItems,
    listSections: [
      {
        title: "Notes",
        items: [
          ...(changeOrder.rejection_reason ? [`Rejection Reason: ${changeOrder.rejection_reason}`] : []),
        ],
      },
    ],
    recipients,
  };
}

export async function getDocumentBundle(
  supabase: TypedSupabaseClient,
  recordType: DocumentRecordType,
  recordId: string,
): Promise<DocumentBundle> {
  if (recordType === "prime-contract") {
    return loadPrimeContractBundle(supabase, recordId);
  }

  if (recordType === "commitment") {
    return loadCommitmentBundle(supabase, recordId);
  }

  if (recordType === "prime-contract-change-order") {
    return loadPrimeContractChangeOrderBundle(supabase, recordId);
  }

  return loadChangeOrderBundle(supabase, recordId);
}
