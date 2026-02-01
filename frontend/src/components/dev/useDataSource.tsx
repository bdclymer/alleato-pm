'use client';

import { useEffect, useId, useContext, createContext } from 'react';

// We need to import the context directly to avoid conditional hook issues
import { useDevMode } from './DevModeProvider';

interface DataSourceConfig {
  component: string;
  table: string;
  columns: string[];
  query?: string;
  relationships?: string[];
  calculatedFields?: Record<string, string>;
}

// Create a fallback context for when DevModeProvider isn't available
const DevModeAvailableContext = createContext(false);

/**
 * Hook to register a component's data source for dev mode visibility.
 *
 * Usage:
 * ```tsx
 * function PrimeContractsTable({ contracts }) {
 *   useDataSource({
 *     component: 'PrimeContractsTable',
 *     table: 'prime_contracts_with_financials',
 *     columns: ['id', 'number', 'title', 'original_contract_value', 'revised_contract_value'],
 *     query: 'SELECT * FROM prime_contracts_with_financials WHERE project_id = ?',
 *     calculatedFields: {
 *       revised_contract_value: 'original_contract_value + SUM(change_orders.approved_amount)',
 *       percent_paid: 'total_payments / revised_contract_value * 100',
 *     },
 *     relationships: ['prime_contracts', 'contract_change_orders', 'owner_invoices'],
 *   });
 *
 *   return <Table data={contracts} />;
 * }
 * ```
 *
 * This will show in the dev panel when dev mode is enabled.
 * Remove these hooks before production or gate behind NODE_ENV check.
 */
export function useDataSource(config: DataSourceConfig) {
  const id = useId();

  // Always call the hook - it returns null/defaults when provider isn't available
  const devModeResult = useDevModeOptional();
  const enabled = devModeResult?.enabled ?? false;
  const registerDataSource = devModeResult?.registerDataSource;
  const unregisterDataSource = devModeResult?.unregisterDataSource;

  useEffect(() => {
    if (!enabled || !registerDataSource || !unregisterDataSource) return;

    registerDataSource({ id, ...config });

    return () => {
      unregisterDataSource(id);
    };
  }, [enabled, id, config, registerDataSource, unregisterDataSource]);
}

// Safe version that doesn't throw when provider is missing
function useDevModeOptional() {
  try {
    return useDevMode();
  } catch {
    return null;
  }
}

/**
 * Component wrapper that shows a data source badge on hover.
 * Use this to wrap any component that displays data.
 *
 * Usage:
 * ```tsx
 * <DataSourceBadge table="prime_contracts" column="number">
 *   <span>{contract.number}</span>
 * </DataSourceBadge>
 * ```
 */
export function DataSourceBadge({
  children,
  table,
  column,
  calculation,
  className = '',
}: {
  children: React.ReactNode;
  table?: string;
  column?: string;
  calculation?: string;
  className?: string;
}) {
  const devModeResult = useDevModeOptional();
  const enabled = devModeResult?.enabled ?? false;

  if (!enabled) {
    return <>{children}</>;
  }

  const label = calculation ? `CALC: ${calculation}` : `${table}.${column}`;

  return (
    <span className={`relative group ${className}`}>
      {children}
      <span className="absolute -top-5 left-0 hidden group-hover:block text-2xs bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded whitespace-nowrap z-50 shadow">
        {label}
      </span>
    </span>
  );
}
