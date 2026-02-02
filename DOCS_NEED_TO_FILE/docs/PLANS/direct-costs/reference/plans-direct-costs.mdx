# PLANS: Direct Costs Implementation

**Project:** Alleato-Procore Direct Costs Feature
**Created:** 2026-01-10 14:00
**Status:** Execution Plan for Remaining Work
**Estimated Completion:** 2026-01-13 (3 days from now)

---

## 🎯 Executive Summary

This document outlines the execution plan for completing the Direct Costs feature implementation. Phase 1 (Core Infrastructure) is 100% complete. The remaining work includes:
- Applying database migration and generating types
- Browser testing and bug fixes
- Building remaining UI components
- Implementing bulk operations and export functionality
- Running E2E tests and quality checks

**Total Estimated Effort:** 23-33 hours over 3 days
**Critical Path:** Database setup → Browser testing → Missing features → Testing

---

## 📋 Implementation Strategy

### Multi-Agent Approach

We will use specialized sub-agents to complete tasks in parallel where possible:

1. **Database Agent:** Apply migration, generate types, create seed data
2. **Frontend Agent:** Build missing components (Filters, Export, Bulk Actions)
3. **Testing Agent:** Implement E2E test helpers, run tests, fix failures
4. **Integration Agent:** Browser test all functionality, fix issues
5. **Verification Agent:** Final quality checks, performance testing, accessibility audit

### Parallel Execution Opportunities

**Wave 1 (Can run in parallel after database setup):**
- Frontend Agent: Build FiltersPanel component
- Frontend Agent: Build ExportDialog component
- Frontend Agent: Build BulkActionsToolbar component

**Wave 2 (Can run in parallel after Wave 1):**
- Backend Agent: Implement bulk operation endpoints
- Backend Agent: Implement export endpoints
- Frontend Agent: Integrate new components

**Wave 3 (After all features complete):**
- Testing Agent: Implement test helpers
- Testing Agent: Run E2E tests
- Integration Agent: Browser testing
- Integration Agent: Fix bugs

**Wave 4 (Final):**
- Verification Agent: Quality checks
- Verification Agent: Performance testing
- Verification Agent: Accessibility audit

---

## 🗓️ Detailed Execution Plan

### Day 1: Database Setup & Critical Testing

#### Session 1: Database Migration (2-3 hours) 🔴 CRITICAL

**Responsible:** Main Agent (Manual) or Database Agent
**Dependencies:** None
**Deliverables:**
- Migration applied to Supabase
- All tables verified
- TypeScript types generated
- Seed data created

**Steps:**
1. **Apply Migration**
   ```bash
   # Connect to Supabase
   npx supabase login

   # Apply migration
   npx supabase db push

   # OR if push doesn't work
   npx supabase migration up
   ```

2. **Verify Tables**
   ```sql
   -- Check all direct cost tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'direct_costs',
     'direct_cost_line_items',
     'budget_codes',
     'vendors',
     'direct_cost_attachments',
     'cost_code_groups',
     'direct_cost_group_assignments',
     'direct_cost_audit_log',
     'unit_of_measures'
   )
   ORDER BY table_name;

   -- Should return 9 rows
   ```

3. **Verify Views**
   ```sql
   -- Check views exist
   SELECT table_name
   FROM information_schema.views
   WHERE table_schema = 'public'
   AND table_name IN (
     'direct_costs_with_details',
     'direct_costs_summary_by_cost_code'
   );

   -- Should return 2 rows
   ```

4. **Verify RLS Policies**
   ```sql
   -- Check RLS is enabled
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename LIKE 'direct%';

   -- All should have rowsecurity = true
   ```

5. **Generate TypeScript Types**
   ```bash
   npx supabase gen types typescript \
     --project-id "lgveqfnpkxvzbnnwuled" \
     --schema public > frontend/src/types/database.types.ts

   # Verify file created
   ls -lh frontend/src/types/database.types.ts
   ```

6. **Create Seed Data Script**
   ```typescript
   // Create: scripts/seed-direct-costs.ts
   import { createClient } from '@supabase/supabase-js';

   async function seed() {
     const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

     // Insert vendors
     const { data: vendors } = await supabase.from('vendors').insert([
       { vendor_name: 'Acme Supply Co', contact_email: 'contact@acmesupply.com', phone: '555-0100' },
       { vendor_name: 'BuildMart', contact_email: 'info@buildmart.com', phone: '555-0101' },
       { vendor_name: 'Construction Depot', contact_email: 'sales@constructiondepot.com', phone: '555-0102' }
     ]).select();

     // Insert budget codes
     const { data: budgetCodes } = await supabase.from('budget_codes').insert([
       { project_id: 'test-project-id', code: '01-3120', description: 'Vice President', category: 'Labor' },
       { project_id: 'test-project-id', code: '02-5200', description: 'Subcontractor Services', category: 'External Labor' },
       { project_id: 'test-project-id', code: '03-1000', description: 'Materials', category: 'Materials' }
     ]).select();

     // Insert sample direct costs
     // ... (continue with sample data)
   }

   seed();
   ```

7. **Run Seed Script**
   ```bash
   npm run seed:direct-costs
   # OR
   tsx scripts/seed-direct-costs.ts
   ```

**Success Criteria:**
- [ ] All 9 tables exist in database
- [ ] All 2 views exist
- [ ] RLS enabled on all tables
- [ ] TypeScript types file generated and valid
- [ ] At least 3 vendors created
- [ ] At least 10 budget codes created
- [ ] At least 5 sample direct costs created

**Exit Gate:** Database migration complete and verified

---

#### Session 2: Initial Browser Testing (2-3 hours) 🔴 CRITICAL

**Responsible:** Integration Agent
**Dependencies:** Session 1 complete
**Deliverables:**
- List page tested
- Create form tested
- Issues documented

**Steps:**
1. **Start Development Server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test List Page**
   - Navigate to: `http://localhost:3000/[projectId]/direct-costs`
   - Verify page loads without errors
   - Verify PageHeader displays
   - Verify tabs display
   - Verify "New Direct Cost" button appears
   - Verify table renders (may be empty)
   - Check browser console for errors
   - Take screenshot if issues found

3. **Test Create Form**
   - Click "New Direct Cost" button
   - Verify form page loads
   - Verify Step 1 (Basic Information) displays
   - Fill in cost_type: "Expense"
   - Fill in date: today's date
   - Fill in description: "Test expense"
   - Click "Next" button
   - Verify Step 2 (Line Items) displays
   - Add a line item
   - Select budget code
   - Enter quantity: 1
   - Enter unit cost: 100
   - Verify total calculates to 100
   - Click "Next" button
   - Verify Step 3 (Additional Details) displays
   - Click "Create Direct Cost" button
   - Verify redirect happens
   - Verify direct cost appears in list
   - Check browser console for errors

4. **Test View/Edit/Delete**
   - Click on a direct cost in the list
   - Verify detail page loads
   - Note any errors
   - Test edit functionality (if available)
   - Test delete functionality (if available)

5. **Document Issues**
   Create `.claude/browser-test-issues.md` with findings:
   ```markdown
   # Browser Test Issues - Direct Costs

   ## Critical Issues
   - [ ] Issue 1: Description

   ## Medium Issues
   - [ ] Issue 2: Description

   ## Minor Issues
   - [ ] Issue 3: Description

   ## UI/UX Improvements
   - [ ] Item 1: Description
   ```

**Success Criteria:**
- [ ] List page loads without console errors
- [ ] Create form accessible
- [ ] Can navigate through all form steps
- [ ] Can create a direct cost successfully
- [ ] Created cost appears in list
- [ ] All issues documented

**Exit Gate:** Core user flows tested in browser

---

#### Session 3: Fix Critical Issues (2-4 hours) 🟡

**Responsible:** Debugger Agent or Main Agent
**Dependencies:** Session 2 complete
**Deliverables:**
- All critical issues fixed
- All TypeScript errors fixed
- All ESLint errors fixed

**Steps:**
1. **Run Quality Check**
   ```bash
   npm run quality --prefix frontend
   ```

2. **Fix TypeScript Errors**
   - Review all TypeScript errors
   - Fix type mismatches
   - Add proper type annotations
   - Re-run quality check until zero errors

3. **Fix ESLint Errors**
   - Review all ESLint errors
   - Fix code style issues
   - Update imports if needed
   - Re-run quality check until zero errors

4. **Fix Browser Test Issues**
   - Address each critical issue from Session 2
   - Re-test in browser
   - Verify fixes work
   - Update issues document

5. **Verify Core Flows**
   - Create a direct cost end-to-end
   - View created cost
   - Edit cost (if available)
   - Delete cost (if available)
   - Verify no console errors

**Success Criteria:**
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] All critical browser issues fixed
- [ ] Core flows work end-to-end

**Exit Gate:** Quality checks passing, core functionality working

---

### Day 2: Missing Features Implementation

#### Session 4: Filters Panel Component (2-3 hours) 🟡

**Responsible:** Frontend Agent
**Dependencies:** Day 1 complete
**Deliverables:**
- FiltersPanel component
- Filter integration in DirectCostTable
- Working filters in browser

**Implementation:**
```typescript
// Create: frontend/src/components/direct-costs/FiltersPanel.tsx

import { useState } from 'react';
import { Select, Input, DatePicker, Button } from '@/components/ui';
import { DirectCostFilter } from '@/lib/schemas/direct-costs';

interface FiltersPanelProps {
  filters: DirectCostFilter;
  onFiltersChange: (filters: DirectCostFilter) => void;
  onClearAll: () => void;
}

export function FiltersPanel({ filters, onFiltersChange, onClearAll }: FiltersPanelProps) {
  const handleFilterChange = (key: keyof DirectCostFilter, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <Select
          label="Status"
          value={filters.status || 'all'}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Paid">Paid</option>
        </Select>

        {/* Cost Type Filter */}
        <Select
          label="Type"
          value={filters.cost_type || 'all'}
          onChange={(e) => handleFilterChange('cost_type', e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="Expense">Expense</option>
          <option value="Invoice">Invoice</option>
          <option value="Subcontractor Invoice">Subcontractor Invoice</option>
        </Select>

        {/* Date Range */}
        <DatePicker
          label="Date From"
          value={filters.date_from}
          onChange={(date) => handleFilterChange('date_from', date)}
        />

        <DatePicker
          label="Date To"
          value={filters.date_to}
          onChange={(date) => handleFilterChange('date_to', date)}
        />

        {/* Amount Range */}
        <Input
          type="number"
          label="Min Amount"
          value={filters.amount_min || ''}
          onChange={(e) => handleFilterChange('amount_min', parseFloat(e.target.value))}
        />

        <Input
          type="number"
          label="Max Amount"
          value={filters.amount_max || ''}
          onChange={(e) => handleFilterChange('amount_max', parseFloat(e.target.value))}
        />

        {/* Search */}
        <Input
          label="Search"
          placeholder="Search description, invoice #..."
          value={filters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="md:col-span-2"
        />

        {/* Clear Button */}
        <div className="flex items-end">
          <Button variant="outline" onClick={onClearAll}>
            Clear All Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Integration:**
- Update DirectCostTable to include FiltersPanel
- Wire up filter state management
- Update API calls to include filters
- Test in browser

**Success Criteria:**
- [ ] FiltersPanel component created
- [ ] Integrated into DirectCostTable
- [ ] All filters work in browser
- [ ] API calls include filter params

---

#### Session 5: Export Dialog Component (2-3 hours) 🟡

**Responsible:** Frontend Agent
**Dependencies:** Session 4 can run in parallel
**Deliverables:**
- ExportDialog component
- Export button in PageHeader
- Download functionality

**Implementation:**
```typescript
// Create: frontend/src/components/direct-costs/ExportDialog.tsx

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  filters?: DirectCostFilter;
}

export function ExportDialog({ isOpen, onClose, projectId, filters }: ExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [includeLineItems, setIncludeLineItems] = useState(true);
  const [template, setTemplate] = useState<'standard' | 'accounting' | 'summary'>('standard');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/direct-costs/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          include_line_items: includeLineItems,
          template,
          filters,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `direct-costs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Direct Costs</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select
            label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'csv' | 'pdf')}
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </Select>

          <Select
            label="Template"
            value={template}
            onChange={(e) => setTemplate(e.target.value as any)}
          >
            <option value="standard">Standard</option>
            <option value="accounting">Accounting</option>
            <option value="summary">Summary</option>
          </Select>

          <label className="flex items-center space-x-2">
            <Checkbox
              checked={includeLineItems}
              onCheckedChange={setIncludeLineItems}
            />
            <span>Include Line Items</span>
          </label>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Backend API:**
- Create `/api/projects/[id]/direct-costs/export/route.ts`
- Implement CSV generation
- Implement PDF generation (using jsPDF or similar)

**Success Criteria:**
- [ ] ExportDialog component created
- [ ] Export button in PageHeader
- [ ] CSV export works
- [ ] PDF export works (basic)

---

#### Session 6: Bulk Actions Component (2-3 hours) 🟡

**Responsible:** Frontend Agent
**Dependencies:** Session 4, 5 can run in parallel
**Deliverables:**
- BulkActionsToolbar component
- Row selection in DirectCostTable
- Bulk operations working

**Implementation:**
```typescript
// Create: frontend/src/components/direct-costs/BulkActionsToolbar.tsx

import { Button } from '@/components/ui/button';
import { Trash, Check, X, FileDown } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onApprove,
  onReject,
  onDelete,
  onExport,
  onClearSelection
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
        </span>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={onApprove}>
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>

          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>

          <Button size="sm" variant="outline" onClick={onExport}>
            <FileDown className="h-4 w-4 mr-1" />
            Export
          </Button>

          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash className="h-4 w-4 mr-1" />
            Delete
          </Button>

          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Table Updates:**
- Add checkbox column to DirectCostTable
- Add row selection state management
- Integrate BulkActionsToolbar
- Add confirmation dialogs for bulk operations

**Backend API:**
- Create `/api/projects/[id]/direct-costs/bulk/status/route.ts`
- Create `/api/projects/[id]/direct-costs/bulk/delete/route.ts`

**Success Criteria:**
- [ ] BulkActionsToolbar created
- [ ] Row selection works
- [ ] Bulk approve works
- [ ] Bulk delete works
- [ ] Confirmation dialogs show

---

### Day 3: Testing & Verification

#### Session 7: E2E Test Implementation (4-6 hours) 🟢

**Responsible:** Testing Agent
**Dependencies:** All features complete
**Deliverables:**
- E2E test helpers implemented
- Tests running
- Failures fixed

**Steps:**
1. **Implement Helper Functions**
   ```typescript
   // Update: frontend/tests/e2e/direct-costs.spec.ts

   async function createTestDirectCosts(projectId: string, count: number = 1, options: any = {}) {
     const directCosts = [];

     for (let i = 0; i < count; i++) {
       const directCost = {
         cost_type: options.cost_type || 'Expense',
         date: options.date || new Date().toISOString().split('T')[0],
         status: options.status || 'Draft',
         description: options.description || `Test direct cost ${i + 1}`,
         line_items: [{
           budget_code_id: options.budget_code_id || 'test-budget-code-id',
           description: 'Test line item',
           quantity: 1,
           uom: 'LOT',
           unit_cost: 100,
         }],
         ...options
       };

       const response = await fetch(`/api/projects/${projectId}/direct-costs`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(directCost),
       });

       const created = await response.json();
       directCosts.push(created);
     }

     return count === 1 ? directCosts[0].id : directCosts.map(dc => dc.id);
   }
   ```

2. **Run Tests**
   ```bash
   npx playwright test tests/e2e/direct-costs.spec.ts
   ```

3. **Fix Failures**
   - Review test output
   - Fix failing tests
   - Re-run until all pass

**Success Criteria:**
- [ ] Helper functions implemented
- [ ] All E2E tests running
- [ ] All E2E tests passing
- [ ] Test coverage >80%

---

#### Session 8: Final Quality Checks (2-3 hours) 🟢

**Responsible:** Verification Agent
**Dependencies:** All previous sessions
**Deliverables:**
- Quality checks passing
- Performance verified
- Accessibility audited

**Steps:**
1. **Run Quality Checks**
   ```bash
   npm run quality --prefix frontend
   ```
   - Must return zero errors

2. **Performance Testing**
   - Create 1000+ direct costs
   - Measure list page load time
   - Must be <2 seconds

3. **Accessibility Audit**
   ```bash
   npm run lighthouse --prefix frontend
   ```
   - Must achieve WCAG AA compliance

4. **Cross-Browser Testing**
   - Test on Chrome
   - Test on Firefox
   - Test on Safari

**Success Criteria:**
- [ ] Zero quality check errors
- [ ] Page load <2s with 1000+ items
- [ ] WCAG AA compliance achieved
- [ ] Works on Chrome, Firefox, Safari

---

## 📦 Deliverables Summary

### Code Deliverables
- [ ] FiltersPanel component
- [ ] ExportDialog component
- [ ] BulkActionsToolbar component
- [ ] Bulk operations API endpoints
- [ ] Export API endpoints
- [ ] E2E test helpers
- [ ] Seed data script

### Documentation Deliverables
- [x] Updated TASKS-DIRECT-COSTS.md
- [x] Created progress-direct-costs.md
- [x] Created plans-direct-costs.md
- [ ] Browser test issues document
- [ ] Final verification report

### Testing Deliverables
- [ ] All E2E tests passing
- [ ] Quality checks passing
- [ ] Performance benchmarks met
- [ ] Accessibility audit passing

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Code Coverage | >80% | Playwright coverage report |
| TypeScript Errors | 0 | `npm run quality` |
| ESLint Errors | 0 | `npm run quality` |
| Page Load Time | <2s | Chrome DevTools |
| E2E Tests Passing | 100% | Playwright test results |
| Accessibility Score | WCAG AA | Lighthouse audit |
| Browser Compatibility | 3/3 | Manual testing |

---

## 🚨 Risk Mitigation

### Risk: Database Migration Fails
**Likelihood:** Low
**Impact:** Critical
**Mitigation:**
- Test migration on local Supabase first
- Have rollback plan ready
- Backup database before migration

### Risk: Browser Testing Reveals Major Issues
**Likelihood:** Medium
**Impact:** High
**Mitigation:**
- Allocate extra time for bug fixes
- Have debugger agent ready
- Document all issues systematically

### Risk: E2E Tests Take Longer Than Expected
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Prioritize critical flows
- Implement tests incrementally
- Can defer non-critical tests

### Risk: Missing Dependencies (Vendors, Budget Codes)
**Likelihood:** High
**Impact:** Medium
**Mitigation:**
- Create comprehensive seed data
- Test with missing data scenarios
- Add proper error handling

---

## ✅ Definition of Done

A task is considered DONE when:
1. ✅ Code is written and follows project patterns
2. ✅ TypeScript compiles with zero errors
3. ✅ ESLint passes with zero errors
4. ✅ Functionality tested in browser
5. ✅ E2E test exists and passes (if applicable)
6. ✅ Code reviewed (by another agent if parallel)
7. ✅ Documentation updated
8. ✅ Verification evidence logged

**The feature is considered COMPLETE when:**
1. ✅ All tasks marked as DONE
2. ✅ All E2E tests passing
3. ✅ Quality checks passing (zero errors)
4. ✅ Performance benchmarks met
5. ✅ Accessibility audit passing
6. ✅ User acceptance testing complete
7. ✅ Documentation complete
8. ✅ Verification report created

---

## 📞 Communication Plan

### Daily Standup (End of Day)
- What was completed today
- What's in progress
- What's blocked
- What's next

### Progress Updates
- Update progress-direct-costs.md after each session
- Log all issues found in .claude/issues.md
- Update tasks-direct-costs.md to check off completed items

### Handoff to Verification Agent
When implementation is complete, provide:
1. Link to updated tasks file
2. Link to progress file
3. List of all changes made
4. Known issues document
5. Test results

---

**Last Updated:** 2026-01-10 14:00 by Main Claude Agent
**Review Schedule:** After each session
**Final Review:** Upon completion of all tasks
