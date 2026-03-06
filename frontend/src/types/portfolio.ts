export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  jobNumber?: string;
  client?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  status: "Active" | "Inactive";
  stage: string;
  type: string;
  onedrive?: string;
  access?: string;
  phase?: string;
  category?: string;
  startDate?: string | null;
  estRevenue?: number | null;
  estProfit?: number | null;
  notes: string;
  isFlagged?: boolean;
}

export interface PortfolioView {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface PortfolioFilter {
  id: string;
  field: string;
  operator: "equals" | "contains" | "startsWith" | "endsWith";
  value: string;
}

export type PortfolioViewType = "list" | "thumbnails" | "overview" | "map";

export type StatusFilter = "all" | "active" | "inactive";

export interface PortfolioTableColumn {
  id: string;
  label: string;
  accessor: keyof Project;
  width?: number;
  sortable?: boolean;
}
