import type {
  CreateSubcontractInput,
  SovLineItem,
} from "@/lib/schemas/create-subcontract-schema";

/**
 * Generate realistic autofill data for subcontract form testing
 */
export function generateAutofillData(): Partial<CreateSubcontractInput> & {
  sovLines?: SovLineItem[];
} {
  const today = new Date();

  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 7); // Start in 7 days

  const completionDate = new Date(startDate);
  completionDate.setMonth(completionDate.getMonth() + 6); // 6 months duration

  const contractDate = new Date(today);
  contractDate.setDate(today.getDate() - 3); // Signed 3 days ago

  const issuedOnDate = new Date(today);

  const sovLines: SovLineItem[] = [
    {
      lineNumber: 1,
      changeEventLineItem: "",
      budgetCode: "01-100",
      description: "Site Preparation and Earthwork",
      amount: 125000,
      billedToDate: 0,
    },
    {
      lineNumber: 2,
      changeEventLineItem: "",
      budgetCode: "03-300",
      description: "Concrete Foundation and Slab",
      amount: 245000,
      billedToDate: 0,
    },
    {
      lineNumber: 3,
      changeEventLineItem: "",
      budgetCode: "05-500",
      description: "Structural Steel Framing",
      amount: 380000,
      billedToDate: 0,
    },
    {
      lineNumber: 4,
      changeEventLineItem: "",
      budgetCode: "06-100",
      description: "Rough Carpentry",
      amount: 95000,
      billedToDate: 0,
    },
    {
      lineNumber: 5,
      changeEventLineItem: "",
      budgetCode: "09-200",
      description: "Drywall and Finishes",
      amount: 175000,
      billedToDate: 0,
    },
  ];

  return {
    contractNumber: "SC-2025-001",
    // contractCompanyId intentionally left empty - user must select from real companies
    contractCompanyId: undefined,
    title: "General Construction Services - Phase 1",
    status: "Draft",
    executed: false,
    accountingMethod: "amount_based",
    defaultRetainagePercent: 10,
    description:
      "<p>Comprehensive construction services including site preparation, foundation work, structural framing, and interior finishes for the new commercial building project.</p>",
    sov: sovLines,
    sovLines, // Also include as separate property for form state
    inclusions: `<ul>
<li>All labor, materials, and equipment as specified in construction documents</li>
<li>Site mobilization and demobilization</li>
<li>Temporary site facilities and utilities</li>
<li>Project management and supervision</li>
<li>Quality control and safety compliance</li>
<li>Cleanup and waste removal</li>
</ul>`,
    exclusions: `<ul>
<li>Architectural and engineering design services</li>
<li>Building permits and inspection fees</li>
<li>Off-site utility connections</li>
<li>Landscaping and site improvements beyond building footprint</li>
<li>Owner-furnished equipment and materials</li>
<li>Extended warranty coverage beyond standard terms</li>
</ul>`,
    dates: {
      startDate: startDate,
      estimatedCompletionDate: completionDate,
      actualCompletionDate: undefined,
      contractDate: contractDate,
      signedContractReceivedDate: contractDate,
      issuedOnDate: issuedOnDate,
    },
    privacy: {
      isPrivate: true,
      nonAdminUserIds: [],
      allowNonAdminViewSovItems: false,
    },
    invoiceContactIds: [],
    attachments: [],
  };
}
