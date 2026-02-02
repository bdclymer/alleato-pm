# Budget Line Item Inline Editing - Implementation Summary

## ✅ Completed

### 1. Database & Backend
- **Migration Applied**: `20251223_add_budget_line_history.sql`
  - `budget_line_history` table created with automatic trigger tracking
  - `updated_by` and `updated_at` columns added to `budget_lines`

- **API Endpoints**:
  - `PATCH /api/projects/[id]/budget/lines/[lineId]` - Update line items
  - `GET /api/projects/[id]/budget/lines/[lineId]/history` - View change history

- **Types Updated**: `BudgetLineItem` now includes `quantity`, `unit_cost`, `costCode`, `costCodeDescription`

### 2. Components
- **BudgetLineHistoryModal**: Beautiful timeline UI for viewing changes

## 🎯 To Complete: Update BudgetTable

### Required Changes to `budget-table.tsx`:

#### 1. Add Props
```typescript
interface BudgetTableProps {
  data: BudgetLineItem[];
  grandTotals: BudgetGrandTotals;
  projectId: string;  // NEW
  isLocked: boolean;  // NEW
  onDataChange?: () => void;  // NEW - callback to refresh data
}
```

#### 2. Add State for Inline Editing
```typescript
const [editingRowId, setEditingRowId] = useState<string | null>(null);
const [editValues, setEditValues] = useState<{
  quantity: number | null;
  unit_cost: number | null;
  description: string;
}>({ quantity: null, unit_cost: null, description: '' });
const [saving, setSaving] = useState(false);
const [historyModalOpen, setHistoryModalOpen] = useState(false);
const [selectedLineItem, setSelectedLineItem] = useState<BudgetLineItem | null>(null);
```

#### 3. Add Actions Column (BEFORE the description column)
```typescript
{
  id: 'actions',
  header: 'Actions',
  cell: ({ row }) => {
    const isEditing = editingRowId === row.original.id;

    if (isEditing) {
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={() => handleSave(row.original.id)}
            disabled={saving}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCancel()}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleEdit(row.original)}
          disabled={isLocked}
          title={isLocked ? 'Budget is locked' : 'Edit line item'}
        >
          <PencilIcon className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewHistory(row.original)}
          title="View change history"
        >
          <HistoryIcon className="w-4 h-4" />
        </Button>
      </div>
    );
  },
  size: 120,
}
```

#### 4. Make Description Column Editable
```typescript
{
  accessorKey: 'description',
  header: 'Description',
  cell: ({ row }) => {
    const isEditing = editingRowId === row.original.id;

    if (isEditing) {
      return (
        <input
          type="text"
          className="w-full px-2 py-1 border rounded"
          value={editValues.description}
          onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
        />
      );
    }

    return (
      <div className={cn('font-medium text-gray-900', row.depth > 0 && 'text-gray-700')}>
        {row.getValue('description')}
      </div>
    );
  },
}
```

#### 5. Add Quantity Column (editable)
```typescript
{
  accessorKey: 'quantity',
  header: () => <div className="text-right">Quantity</div>,
  cell: ({ row }) => {
    const isEditing = editingRowId === row.original.id;

    if (isEditing) {
      return (
        <input
          type="number"
          className="w-full px-2 py-1 border rounded text-right"
          value={editValues.quantity || ''}
          onChange={(e) => setEditValues(prev => ({
            ...prev,
            quantity: e.target.value ? parseFloat(e.target.value) : null
          }))}
        />
      );
    }

    const qty = row.getValue('quantity') as number | null;
    return (
      <div className="text-right">
        {qty !== null ? qty.toLocaleString() : '-'}
      </div>
    );
  },
  size: 100,
}
```

#### 6. Add Unit Cost Column (editable)
```typescript
{
  accessorKey: 'unit_cost',
  header: () => <div className="text-right">Unit Cost</div>,
  cell: ({ row }) => {
    const isEditing = editingRowId === row.original.id;

    if (isEditing) {
      return (
        <input
          type="number"
          step="0.01"
          className="w-full px-2 py-1 border rounded text-right"
          value={editValues.unit_cost || ''}
          onChange={(e) => setEditValues(prev => ({
            ...prev,
            unit_cost: e.target.value ? parseFloat(e.target.value) : null
          }))}
        />
      );
    }

    const cost = row.getValue('unit_cost') as number | null;
    return (
      <div className="text-right">
        {cost !== null ? <CurrencyCell value={cost} /> : '-'}
      </div>
    );
  },
  size: 120,
}
```

#### 7. Implement Handler Functions
```typescript
const handleEdit = (lineItem: BudgetLineItem) => {
  if (isLocked) {
    toast.error('Budget is locked');
    return;
  }
  setEditingRowId(lineItem.id);
  setEditValues({
    quantity: lineItem.quantity,
    unit_cost: lineItem.unit_cost,
    description: lineItem.description,
  });
};

const handleCancel = () => {
  setEditingRowId(null);
  setEditValues({ quantity: null, unit_cost: null, description: '' });
};

const handleSave = async (rowId: string) => {
  setSaving(true);
  try {
    const response = await fetch(`/api/projects/${projectId}/budget/lines/${rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editValues),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update');
    }

    toast.success('Line item updated successfully');
    setEditingRowId(null);
    onDataChange?.();  // Refresh data
  } catch (error) {
    console.error('Error updating line item:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to update line item');
  } finally {
    setSaving(false);
  }
};

const handleViewHistory = (lineItem: BudgetLineItem) => {
  setSelectedLineItem(lineItem);
  setHistoryModalOpen(true);
};
```

#### 8. Add History Modal at the end of component
```typescript
return (
  <>
    <div className="flex flex-col h-full rounded-md overflow-hidden">
      {/* existing table code */}
    </div>

    {selectedLineItem && (
      <BudgetLineHistoryModal
        open={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedLineItem(null);
        }}
        lineItem={{
          id: selectedLineItem.id,
          description: selectedLineItem.description,
          costCode: selectedLineItem.costCode,
        }}
        projectId={projectId}
      />
    )}
  </>
);
```

### Update Budget Page to Pass Props

In `/app/[projectId]/budget/page.tsx`, update the BudgetTable usage:
```typescript
<BudgetTable
  data={budgetData}
  grandTotals={grandTotals}
  projectId={projectId}
  isLocked={isLocked}
  onDataChange={() => {
    // Refetch budget data
    fetch(`/api/projects/${projectId}/budget`)
      .then(res => res.json())
      .then(data => {
        setBudgetData(data.lineItems || []);
        setGrandTotals(data.grandTotals || budgetGrandTotals);
      });
  }}
/>
```

## Required Imports
```typescript
import { Pencil as PencilIcon, History as HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BudgetLineHistoryModal } from './budget-line-history-modal';
import { toast } from 'sonner';
```

## Testing Plan

### Playwright Tests Needed:
1. **Inline Editing Test** (`budget-inline-edit.spec.ts`)
   - Click Edit button
   - Modify quantity, unit cost, description
   - Click Save
   - Verify changes are reflected
   - Test Cancel button

2. **Change History Test** (`budget-change-history.spec.ts`)
   - Edit a line item
   - Click History button
   - Verify timeline shows the change
   - Verify old→new values are displayed

3. **Budget Lock Test**
   - Lock budget
   - Verify Edit button is disabled
   - Verify History button still works
