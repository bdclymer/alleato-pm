export interface PaymentApplicationSummaryLineItem {
  scheduled_value: number;
  total_completed: number | null;
  retainage_this_period_work: number;
  retainage_previous_work: number;
  retainage_released_work: number;
  retainage_this_period_materials: number;
  retainage_previous_materials: number;
  retainage_released_materials: number;
}

export interface PaymentApplicationContractSummary {
  original_contract_value: number;
  revised_contract_value: number;
}

export interface PaymentApplicationSummaryLine {
  number: string;
  label: string;
  value: number;
  indent?: boolean;
  highlight?: boolean;
}

export interface PaymentApplicationSummary {
  totalScheduledValue: number;
  totalCompletedAndStored: number;
  retainageCompletedWork: number;
  retainageStoredMaterial: number;
  originalContractSum: number;
  netChangeByChangeOrders: number;
  contractSumToDate: number;
  totalRetainage: number;
  totalEarnedLessRetainage: number;
  previousPaymentDue: number;
  currentPaymentDue: number;
  balanceToFinish: number;
  lines: PaymentApplicationSummaryLine[];
}

export function calculatePaymentApplicationSummary({
  lineItems,
  contract,
  previousPaymentDue,
}: {
  lineItems: PaymentApplicationSummaryLineItem[];
  contract: PaymentApplicationContractSummary;
  previousPaymentDue: number;
}): PaymentApplicationSummary {
  const totalScheduledValue = lineItems.reduce(
    (sum, lineItem) => sum + lineItem.scheduled_value,
    0,
  );
  const totalCompletedAndStored = lineItems.reduce(
    (sum, lineItem) => sum + (lineItem.total_completed ?? 0),
    0,
  );
  const retainageCompletedWork = lineItems.reduce(
    (sum, lineItem) =>
      sum +
      lineItem.retainage_this_period_work +
      lineItem.retainage_previous_work -
      lineItem.retainage_released_work,
    0,
  );
  const retainageStoredMaterial = lineItems.reduce(
    (sum, lineItem) =>
      sum +
      lineItem.retainage_this_period_materials +
      lineItem.retainage_previous_materials -
      lineItem.retainage_released_materials,
    0,
  );

  const originalContractSum = contract.original_contract_value;
  const netChangeByChangeOrders =
    contract.revised_contract_value - originalContractSum;
  const contractSumToDate = originalContractSum + netChangeByChangeOrders;
  const totalRetainage = retainageCompletedWork + retainageStoredMaterial;
  const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage;
  const currentPaymentDue = totalEarnedLessRetainage - previousPaymentDue;
  const balanceToFinish =
    lineItems.length > 0
      ? totalScheduledValue - totalCompletedAndStored
      : contractSumToDate;

  const lines: PaymentApplicationSummaryLine[] = [
    {
      number: "1",
      label: "Original Contract Sum",
      value: originalContractSum,
    },
    {
      number: "2",
      label: "Net Change by Change Orders",
      value: netChangeByChangeOrders,
    },
    {
      number: "3",
      label: "Contract Sum to Date (1 +/- 2)",
      value: contractSumToDate,
    },
    {
      number: "4",
      label: "Total Completed and Stored to Date",
      value: totalCompletedAndStored,
    },
    {
      number: "5a",
      label: "Retainage: % of Completed Work",
      value: retainageCompletedWork,
      indent: true,
    },
    {
      number: "5b",
      label: "Retainage: % of Stored Material",
      value: retainageStoredMaterial,
      indent: true,
    },
    {
      number: "5",
      label: "Total Retainage (5a + 5b)",
      value: totalRetainage,
    },
    {
      number: "6",
      label: "Total Earned Less Retainage (4 - 5)",
      value: totalEarnedLessRetainage,
    },
    {
      number: "7",
      label: "Less Previous Certificates for Payment",
      value: previousPaymentDue,
    },
    {
      number: "8",
      label: "Current Payment Due",
      value: currentPaymentDue,
      highlight: true,
    },
    {
      number: "9",
      label: "Balance to Finish, Including Retainage",
      value: balanceToFinish,
    },
  ];

  return {
    totalScheduledValue,
    totalCompletedAndStored,
    retainageCompletedWork,
    retainageStoredMaterial,
    originalContractSum,
    netChangeByChangeOrders,
    contractSumToDate,
    totalRetainage,
    totalEarnedLessRetainage,
    previousPaymentDue,
    currentPaymentDue,
    balanceToFinish,
    lines,
  };
}
