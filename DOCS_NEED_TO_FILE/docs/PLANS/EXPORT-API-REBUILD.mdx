# Direct Costs Export API - Rebuild Complete

**Date:** 2026-01-10
**Status:** ✅ Complete
**File:** `frontend/src/app/api/projects/[id]/direct-costs/export/route.ts`

## Summary

Rebuilt the Direct Costs Export API endpoint that was corrupted with syntax errors. The API now provides production-ready export functionality for CSV, Excel, and PDF formats.

## API Endpoint

**POST** `/api/projects/[id]/direct-costs/export`

### Request Body

```typescript
{
  format: 'csv' | 'excel' | 'pdf'
  template: 'standard' | 'accounting' | 'summary'
  filters?: DirectCostFilterSchema  // Optional filtering
  include_line_items?: boolean      // Default: true
  columns?: string[]                // Optional column selection
}
```

### Response

- **CSV:** `text/csv` file with proper escaping
- **Excel:** `.xlsx` file using `xlsx` library
- **PDF:** Print-friendly HTML that auto-triggers browser print dialog

## Features Implemented

### 1. Multiple Export Formats

- **CSV:** Properly escaped CSV with configurable templates
- **Excel:** Binary `.xlsx` format with column widths and formatting
- **PDF:** HTML-based PDF generation (browser print to PDF)

### 2. Template Support

Three templates control which columns are exported:

| Template | Use Case | Columns |
|----------|----------|---------|
| `standard` | Full details | All fields including line items |
| `accounting` | Financial reporting | Date, Invoice, Vendor, Account Code, Amounts |
| `summary` | High-level overview | Date, Vendor, Type, Status, Amount |

### 3. Line Items Handling

- **Include Line Items:** Each line item becomes a separate row
- **Summary Only:** One row per direct cost with totals
- Controlled via `include_line_items` boolean

### 4. Filtering

Uses existing `DirectCostFilterSchema` to filter data before export:
- Status filter (Draft, Approved, Paid, Rejected)
- Cost type filter
- Vendor/employee filter
- Date range filter
- Amount range filter
- Search term

### 5. Data Validation

- Request validation using Zod schemas
- Returns 400 for invalid parameters
- Returns 404 if no data matches filters
- Proper error handling with detailed messages

## Implementation Details

### CSV Generation

```typescript
function generateCSV(
  directCosts: DirectCostWithLineItems[],
  params: { include_line_items: boolean; template: string }
): string
```

- Properly escapes commas, quotes, and newlines
- Uses template to determine columns
- Handles line items expansion

### Excel Generation

```typescript
function generateExcel(
  directCosts: DirectCostWithLineItems[],
  params: { include_line_items: boolean; template: string }
): Buffer
```

- Uses `xlsx` library (already installed in package.json)
- Creates workbook with formatted worksheet
- Sets column widths automatically
- Returns binary buffer for download

### PDF/HTML Generation

```typescript
function generatePDFHTML(
  directCosts: DirectCostWithLineItems[],
  params: { include_line_items: boolean; template: string }
): string
```

- Returns print-friendly HTML with embedded CSS
- Auto-triggers browser print dialog
- User can save as PDF via browser print
- Responsive design for printing

## Schema Updates

Updated `DirectCostExportSchema` in `frontend/src/lib/schemas/direct-costs.ts`:

```typescript
// Added 'excel' to format enum
format: z.enum(['csv', 'excel', 'pdf'])
```

Updated `DirectCostWithLineItems` interface:

```typescript
// Added required fields for export
total_amount: number;
line_items: (DirectCostLineItem & {
  id: string;
  line_total: number;  // Added for line item totals
  budget_code?: {
    code: string;
    description: string;
  };
})[];
```

## Service Integration

The API uses `DirectCostService.list()` to fetch data:
- Applies all filters from request
- Includes related data (vendor, employee, budget codes)
- Paginates with large limit (10,000) for export
- Returns properly typed `DirectCostWithLineItems[]`

## File Structure

```
frontend/src/app/api/projects/[id]/direct-costs/export/
└── route.ts                    # Main export endpoint

frontend/src/lib/
├── schemas/direct-costs.ts     # Updated schema with 'excel' format
└── services/direct-cost-service.ts  # Used for data fetching
```

## Testing Recommendations

### Manual Testing

1. **CSV Export:**
   ```bash
   curl -X POST http://localhost:3000/api/projects/123/direct-costs/export \
     -H "Content-Type: application/json" \
     -d '{"format":"csv","template":"standard","include_line_items":true}'
   ```

2. **Excel Export:**
   ```bash
   curl -X POST http://localhost:3000/api/projects/123/direct-costs/export \
     -H "Content-Type: application/json" \
     -d '{"format":"excel","template":"accounting","include_line_items":true}' \
     --output export.xlsx
   ```

3. **PDF Export:**
   Open in browser: POST to `/api/projects/123/direct-costs/export`
   with body `{"format":"pdf","template":"summary"}`

### Automated Testing

Should test:
- All three formats (CSV, Excel, PDF)
- All three templates (standard, accounting, summary)
- With and without line items
- Various filter combinations
- Empty result set (404 expected)
- Invalid parameters (400 expected)

## Security Considerations

- Uses `createClient()` from Supabase (server-side auth)
- RLS policies apply to data fetching via service
- No SQL injection risk (uses Supabase client)
- File size controlled by 10,000 record limit

## Performance

- Large exports (10,000 records) may take 5-10 seconds
- Excel generation is memory-intensive
- PDF HTML generation is lightweight
- Consider adding progress indicator for large exports

## Future Enhancements

Potential improvements:
1. Streaming exports for very large datasets
2. Custom column selection (currently template-based)
3. Scheduled/automated exports
4. Email delivery option
5. Export history tracking
6. True PDF generation (using jsPDF or similar)
7. Multiple worksheets in Excel (by status, vendor, etc.)

## Related Files

- Schema: `frontend/src/lib/schemas/direct-costs.ts`
- Service: `frontend/src/lib/services/direct-cost-service.ts`
- Main API: `frontend/src/app/api/projects/[id]/direct-costs/route.ts`
- Type definitions: `frontend/src/types/database.types.ts`
