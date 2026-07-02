import {
  Document,
  Image as PdfImage,
  Page,
  Path,
  Svg,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

const ALLEATO_ORANGE = "#df8324";
const ALLEATO_BLACK = "#2f2f2f";

export interface SubcontractorInvoicePdfLineItem {
  id: number;
  sort_order: number | null;
  budget_code: string | null;
  description: string | null;
  scheduled_value: number | null;
  work_completed_previous: number | null;
  work_completed_period: number | null;
  materials_stored: number | null;
  total_completed_stored: number | null;
  retainage_pct: number | null;
  retainage_amount: number | null;
  materials_retainage_pct: number | null;
  materials_retainage_amount: number | null;
  net_amount_this_period: number | null;
}

export interface SubcontractorInvoicePdfRollup {
  original_contract_sum: number;
  net_change_by_change_orders: number;
  contract_sum_to_date: number;
  total_completed_and_stored: number;
  total_work_retainage: number;
  total_materials_retainage: number;
  total_retainage: number;
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;
  balance_to_finish_including_retainage: number;
  change_order_additions?: number;
  change_order_deductions?: number;
}

export interface SubcontractorInvoicePdfData {
  id: number;
  invoice_number: string | null;
  application_number: number;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  billing_date: string | null;
  notes: string | null;
  project_name: string | null;
  project_number: string | null;
  project_address: string | null;
  contract_number: string | null;
  contract_title: string | null;
  contract_date: string | null;
  gc_company_name: string | null;
  gc_company_address: string | null;
  gc_company_city: string | null;
  gc_company_state: string | null;
  gc_company_zip: string | null;
  contract_company_name: string | null;
  contract_company_address: string | null;
  contract_company_city: string | null;
  contract_company_state: string | null;
  contract_company_zip: string | null;
  line_items: SubcontractorInvoicePdfLineItem[];
  rollup: SubcontractorInvoicePdfRollup;
  attachments?: string[];
}

// Formats dollar values for display in the invoice PDF.
function formatMoney(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

// Formats dates in mm/dd/yyyy style for the invoice PDF.
function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US");
}

// Joins city/state/zip values into one printable address line.
function formatCityStateZip(
  city: string | null,
  state: string | null,
  zip: string | null,
): string {
  const cityState = [city, state].filter(Boolean).join(", ");
  return [cityState, zip].filter(Boolean).join(" ");
}

// Calculates totals for the detailed schedule table.
function computeTableTotals(items: SubcontractorInvoicePdfLineItem[]) {
  return items.reduce(
    (acc, item) => {
      acc.scheduled += item.scheduled_value ?? 0;
      acc.previous += item.work_completed_previous ?? 0;
      acc.thisPeriod += item.work_completed_period ?? 0;
      acc.materials += item.materials_stored ?? 0;
      acc.completed += item.total_completed_stored ?? 0;
      acc.workRetainage += item.retainage_amount ?? 0;
      acc.materialRetainage += item.materials_retainage_amount ?? 0;
      acc.net += item.net_amount_this_period ?? 0;
      return acc;
    },
    {
      scheduled: 0,
      previous: 0,
      thisPeriod: 0,
      materials: 0,
      completed: 0,
      workRetainage: 0,
      materialRetainage: 0,
      net: 0,
    },
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 26,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#111827",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 150,
    objectFit: "contain",
  },
  topRule: {
    height: 10,
    marginHorizontal: -26,
    marginBottom: 12,
  },
  footerRule: {
    height: 10,
    marginHorizontal: -26,
  },
  title: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  thinRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
  },
  section: {
    marginBottom: 10,
  },
  col: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontFamily: "Helvetica-Bold",
  },
  muted: {
    color: "#4B5563",
  },
  box: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  boxTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  table: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginTop: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableCellHeader: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  tableCell: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    fontSize: 7,
    textAlign: "right",
  },
  leftCell: {
    textAlign: "left",
  },
  lineNoCol: { width: "4%" },
  budgetCodeCol: { width: "9%" },
  descCol: { width: "16%" },
  schedCol: { width: "10%" },
  prevCol: { width: "8%" },
  periodCol: { width: "8%" },
  storedCol: { width: "8%" },
  completedCol: { width: "9%" },
  workRetCol: { width: "7%" },
  matRetCol: { width: "7%" },
  netCol: { width: "6%" },
  balanceCol: { width: "8%" },
  totalRow: {
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#9CA3AF",
  },
  rollupGrid: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  rollupRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  rollupNumber: {
    width: 20,
    color: "#6B7280",
    fontFamily: "Helvetica-Bold",
  },
  rollupLabel: {
    flexGrow: 1,
    color: "#374151",
  },
  rollupLabelIndent: {
    paddingLeft: 14,
  },
  rollupValue: {
    fontFamily: "Helvetica-Bold",
  },
  coTable: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  attachmentsSection: {
    marginTop: 10,
  },
  attachmentRow: {
    fontSize: 8,
    color: "#374151",
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 12,
    alignItems: "center",
  },
  footerAddress: {
    fontSize: 7,
    color: ALLEATO_BLACK,
    marginBottom: 6,
    textAlign: "center",
  },
});

function Rule({ flipped = false }: { flipped?: boolean }) {
  return (
    <Svg style={flipped ? styles.footerRule : styles.topRule} viewBox="0 0 612 18">
      {flipped ? (
        <>
          <Path d="M0 0 H315 L346 18 H0 Z" fill={ALLEATO_BLACK} />
          <Path d="M354 0 H612 V18 H386 Z" fill={ALLEATO_ORANGE} />
        </>
      ) : (
        <>
          <Path d="M0 0 H286 L278 18 H0 Z" fill={ALLEATO_ORANGE} />
          <Path d="M302 0 H612 V18 H294 Z" fill={ALLEATO_BLACK} />
        </>
      )}
    </Svg>
  );
}

export function SubcontractorInvoicePdfDocument({
  data,
}: {
  data: SubcontractorInvoicePdfData;
}) {
  const tableTotals = computeTableTotals(data.line_items);
  const invoiceNumber = data.invoice_number || `APP-${data.application_number}`;
  const generatedAt = new Date().toLocaleString("en-US");
  const projectCityStateZip = formatCityStateZip(
    data.gc_company_city,
    data.gc_company_state,
    data.gc_company_zip,
  );
  const contractorCityStateZip = formatCityStateZip(
    data.contract_company_city,
    data.contract_company_state,
    data.contract_company_zip,
  );

  const logoPath = `${process.cwd()}/public/Alleato-Group-Logo_Dark.png`;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.logoWrap}>
          <PdfImage src={logoPath} style={styles.logo} />
        </View>
        <Rule />
        <Text style={styles.title}>APPLICATION AND CERTIFICATE FOR PAYMENT</Text>
        <View style={styles.thinRule} />

        <View style={[styles.row, styles.section]}>
          <View style={[styles.col, styles.box]}>
            <Text style={styles.boxTitle}>Project</Text>
            <Text>{data.project_name || "—"}</Text>
            <Text style={styles.muted}>{data.project_number || "—"}</Text>
            {data.project_address ? <Text>{data.project_address}</Text> : null}
          </View>
          <View style={[styles.col, styles.box]}>
            <Text style={styles.boxTitle}>General Contractor</Text>
            <Text>{data.gc_company_name || "—"}</Text>
            {data.gc_company_address ? <Text>{data.gc_company_address}</Text> : null}
            {projectCityStateZip ? <Text>{projectCityStateZip}</Text> : null}
          </View>
          <View style={[styles.col, styles.box]}>
            <Text style={styles.boxTitle}>Subcontractor</Text>
            <Text>{data.contract_company_name || "—"}</Text>
            {data.contract_company_address ? (
              <Text>{data.contract_company_address}</Text>
            ) : null}
            {contractorCityStateZip ? <Text>{contractorCityStateZip}</Text> : null}
          </View>
        </View>

        <View style={[styles.row, styles.section]}>
          <View style={styles.col}>
            <Text>
              <Text style={styles.label}>Invoice Number: </Text>
              {invoiceNumber}
            </Text>
            <Text>
              <Text style={styles.label}>Application #: </Text>
              {String(data.application_number)}
            </Text>
            <Text>
              <Text style={styles.label}>Status: </Text>
              {data.status || "draft"}
            </Text>
          </View>
          <View style={styles.col}>
            <Text>
              <Text style={styles.label}>Contract: </Text>
              {data.contract_number || "—"}
              {data.contract_title ? ` — ${data.contract_title}` : ""}
            </Text>
            <Text>
              <Text style={styles.label}>Contract Date: </Text>
              {formatDate(data.contract_date)}
            </Text>
            <Text>
              <Text style={styles.label}>Billing Date: </Text>
              {formatDate(data.billing_date)}
            </Text>
          </View>
          <View style={styles.col}>
            <Text>
              <Text style={styles.label}>Period Start: </Text>
              {formatDate(data.period_start)}
            </Text>
            <Text>
              <Text style={styles.label}>Period End: </Text>
              {formatDate(data.period_end)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCellHeader, styles.lineNoCol]}>#</Text>
            <Text style={[styles.tableCellHeader, styles.budgetCodeCol]}>Budget Code</Text>
            <Text style={[styles.tableCellHeader, styles.descCol]}>Description</Text>
            <Text style={[styles.tableCellHeader, styles.schedCol]}>Scheduled</Text>
            <Text style={[styles.tableCellHeader, styles.prevCol]}>Previous</Text>
            <Text style={[styles.tableCellHeader, styles.periodCol]}>This Period</Text>
            <Text style={[styles.tableCellHeader, styles.storedCol]}>Stored</Text>
            <Text style={[styles.tableCellHeader, styles.completedCol]}>Completed</Text>
            <Text style={[styles.tableCellHeader, styles.workRetCol]}>Work Ret.</Text>
            <Text style={[styles.tableCellHeader, styles.matRetCol]}>Mat. Ret.</Text>
            <Text style={[styles.tableCellHeader, styles.netCol]}>Net</Text>
            <Text style={[styles.tableCellHeader, styles.balanceCol]}>Balance</Text>
          </View>

          {data.line_items.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCell, styles.lineNoCol]}>
                {item.sort_order ?? "—"}
              </Text>
              <Text style={[styles.tableCell, styles.budgetCodeCol, styles.leftCell]}>
                {item.budget_code || "—"}
              </Text>
              <Text style={[styles.tableCell, styles.descCol, styles.leftCell]}>
                {item.description || "—"}
              </Text>
              <Text style={[styles.tableCell, styles.schedCol]}>
                {formatMoney(item.scheduled_value)}
              </Text>
              <Text style={[styles.tableCell, styles.prevCol]}>
                {formatMoney(item.work_completed_previous)}
              </Text>
              <Text style={[styles.tableCell, styles.periodCol]}>
                {formatMoney(item.work_completed_period)}
              </Text>
              <Text style={[styles.tableCell, styles.storedCol]}>
                {formatMoney(item.materials_stored)}
              </Text>
              <Text style={[styles.tableCell, styles.completedCol]}>
                {formatMoney(item.total_completed_stored)}
              </Text>
              <Text style={[styles.tableCell, styles.workRetCol]}>
                {formatMoney(item.retainage_amount)}
              </Text>
              <Text style={[styles.tableCell, styles.matRetCol]}>
                {formatMoney(item.materials_retainage_amount)}
              </Text>
              <Text style={[styles.tableCell, styles.netCol]}>
                {formatMoney(item.net_amount_this_period)}
              </Text>
              <Text style={[styles.tableCell, styles.balanceCol]}>
                {formatMoney((item.scheduled_value ?? 0) - (item.total_completed_stored ?? 0))}
              </Text>
            </View>
          ))}

          <View style={[styles.tableRow, styles.totalRow]} wrap={false}>
            <Text style={[styles.tableCell, styles.lineNoCol]} />
            <Text style={[styles.tableCell, styles.budgetCodeCol, styles.leftCell]} />
            <Text style={[styles.tableCell, styles.descCol, styles.leftCell, styles.label]}>
              Totals
            </Text>
            <Text style={[styles.tableCell, styles.schedCol]}>
              {formatMoney(tableTotals.scheduled)}
            </Text>
            <Text style={[styles.tableCell, styles.prevCol]}>
              {formatMoney(tableTotals.previous)}
            </Text>
            <Text style={[styles.tableCell, styles.periodCol]}>
              {formatMoney(tableTotals.thisPeriod)}
            </Text>
            <Text style={[styles.tableCell, styles.storedCol]}>
              {formatMoney(tableTotals.materials)}
            </Text>
            <Text style={[styles.tableCell, styles.completedCol]}>
              {formatMoney(tableTotals.completed)}
            </Text>
            <Text style={[styles.tableCell, styles.workRetCol]}>
              {formatMoney(tableTotals.workRetainage)}
            </Text>
            <Text style={[styles.tableCell, styles.matRetCol]}>
              {formatMoney(tableTotals.materialRetainage)}
            </Text>
            <Text style={[styles.tableCell, styles.netCol]}>
              {formatMoney(tableTotals.net)}
            </Text>
            <Text style={[styles.tableCell, styles.balanceCol]}>
              {formatMoney(tableTotals.scheduled - tableTotals.completed)}
            </Text>
          </View>
        </View>

        <View style={styles.rollupGrid}>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>1.</Text>
            <Text style={styles.rollupLabel}>Original Contract Sum</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.original_contract_sum)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>2.</Text>
            <Text style={styles.rollupLabel}>Net Change by Change Orders</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.net_change_by_change_orders)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>3.</Text>
            <Text style={[styles.rollupLabel, styles.label]}>
              Contract Sum to Date (1 + 2)
            </Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.contract_sum_to_date)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>4.</Text>
            <Text style={styles.rollupLabel}>Total Completed &amp; Stored to Date</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.total_completed_and_stored)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>5a.</Text>
            <Text style={[styles.rollupLabel, styles.rollupLabelIndent]}>Work Retainage</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.total_work_retainage)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>5b.</Text>
            <Text style={[styles.rollupLabel, styles.rollupLabelIndent]}>Materials Retainage</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.total_materials_retainage)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>5.</Text>
            <Text style={[styles.rollupLabel, styles.label]}>Total Retainage (5a + 5b)</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.total_retainage)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>6.</Text>
            <Text style={styles.rollupLabel}>Total Earned Less Retainage (4 − 5)</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.total_earned_less_retainage)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>7.</Text>
            <Text style={styles.rollupLabel}>Less Previous Certificates for Payment</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.less_previous_certificates)}
            </Text>
          </View>
          <View style={styles.rollupRow}>
            <Text style={styles.rollupNumber}>8.</Text>
            <Text style={[styles.rollupLabel, styles.label]}>Current Payment Due (6 − 7)</Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.current_payment_due)}
            </Text>
          </View>
          <View style={[styles.rollupRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.rollupNumber}>9.</Text>
            <Text style={styles.rollupLabel}>
              Balance to Finish, Including Retainage (3 − 6)
            </Text>
            <Text style={styles.rollupValue}>
              {formatMoney(data.rollup.balance_to_finish_including_retainage)}
            </Text>
          </View>
        </View>

        {(data.rollup.change_order_additions ?? 0) !== 0 ||
        (data.rollup.change_order_deductions ?? 0) !== 0 ? (
          <>
            <Text style={styles.sectionHeading}>Change Order Summary</Text>
            <View style={styles.coTable}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableCellHeader, { width: "40%", textAlign: "left" }]}>
                  Type
                </Text>
                <Text style={[styles.tableCellHeader, { width: "20%" }]}>Additions</Text>
                <Text style={[styles.tableCellHeader, { width: "20%" }]}>Deductions</Text>
                <Text style={[styles.tableCellHeader, { width: "20%" }]}>Net Change</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "40%" }, styles.leftCell]}>
                  Approved Change Orders
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatMoney(data.rollup.change_order_additions)}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatMoney(data.rollup.change_order_deductions)}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }, styles.label]}>
                  {formatMoney(data.rollup.net_change_by_change_orders)}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {data.attachments && data.attachments.length > 0 ? (
          <View style={styles.attachmentsSection}>
            <Text style={styles.sectionHeading}>Attachments</Text>
            {data.attachments.map((name, index) => (
              <Text key={`${name}-${index}`} style={styles.attachmentRow}>
                • {name}
              </Text>
            ))}
          </View>
        ) : null}

        {data.notes ? (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={{ marginTop: 3 }}>{data.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerAddress}>
            {data.project_name || "Project"} · Generated {generatedAt}
          </Text>
          <Text style={styles.footerAddress}>
            701 94th Ave. N, Suite #118 St. Petersburg, FL 33702      8383 Craig Street #150 Indianapolis, IN 46250
          </Text>
          <Rule flipped />
        </View>
      </Page>
    </Document>
  );
}

// Renders the subcontractor invoice PDF as a Node buffer for download/email.
export async function renderSubcontractorInvoicePdfBuffer(
  data: SubcontractorInvoicePdfData,
): Promise<Buffer> {
  return renderToBuffer(<SubcontractorInvoicePdfDocument data={data} />);
}
