export interface SovLineItem {
  id: number;
  sort_order?: number | null;
  budget_code?: string | null;
  description?: string | null;
  line_item_type?: string | null;
  commitment_value?: number | null;
  change_value?: number | null;
  scheduled_value?: number | null;
  work_completed_previous?: number | null;
  work_completed_previous_pct?: number | null;
  work_completed_period?: number | null;
  materials_stored?: number | null;
  total_completed_stored?: number | null;
  work_completed_pct?: number | null;
  balance_to_finish?: number | null;
  retainage_pct?: number | null;
  retainage_amount?: number | null;
  materials_retainage_pct?: number | null;
  materials_retainage_amount?: number | null;
  previous_work_retainage?: number | null;
  previous_materials_retainage?: number | null;
  work_retainage_released?: number | null;
  materials_retainage_released?: number | null;
  net_amount_this_period?: number | null;
}

export type LineItemEdits = Record<
  number,
  {
    work_completed_period: string;
    materials_stored: string;
    retainage_pct: string;
    materials_retainage_pct: string;
    work_retainage_released: string;
    materials_retainage_released: string;
  }
>;

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(value?: number | null) {
  return currencyFmt.format(value ?? 0);
}

export { formatDate } from "@/lib/format";

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export interface InvoiceRollup {
  original_contract_sum: number;
  net_change_by_change_orders: number;
  contract_sum_to_date: number;
  total_completed_and_stored: number;
  total_work_retainage?: number;
  total_materials_retainage?: number;
  total_retainage: number;
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;
  balance_to_finish_including_retainage: number;
}
