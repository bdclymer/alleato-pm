# Procore Direct Costs Tool - Development Implementation Specification

## Procore Documentation

| Title | URL |
| --- | --- |
| Create a Direct Cost | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/create-a-direct-cost |
| Delete a Direct Cost | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/delete-a-direct-cost |
| Edit a Direct Cost | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/edit-a-direct-cost |
| Email a Direct Cost | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/email-a-direct-cost |
| Export Direct Costs to CSV or PDF | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/export-direct-costs-to-csv-or-pdf |
| Import Direct Costs | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/import-direct-costs |
| Search for and Apply Filters to Direct Costs | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/search-for-and-apply-filters-to-direct-costs |
| Switch Between Views in the Direct Costs Tool | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/switch-between-views-in-the-direct-costs-tool |
| Enable the Direct Costs Tool | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/enable-the-direct-costs-tool |
| Configure Settings: Direct Costs | https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/configure-advanced-settings-direct-costs |

## Executive Summary

This is a comprehensive development specification for the Procore Direct Costs Tool, a project-level financial tracking system that manages non-contract costs for construction projects. The tool provides dual views (Summary and Summary By Cost Code), supports multiple cost types (Expense, Invoice, Subcontractor Invoice), and enables detailed cost tracking with budget code allocation.

# PHASE 1: CORE INFRASTRUCTURE & DATA LAYER

## 1.1 Implementation Checklist

- [ ]  Design and implement database schema
- [ ]  Create base data models and relationships
- [ ]  Implement core ORM mappings
- [ ]  Build data validation and business logic layer
- [ ]  Set up database migrations
- [ ]  Create seed data for cost codes and types
- [ ]  Implement audit logging for cost records
- [ ]  Build data access layer with repository pattern
- [ ]  Test all CRUD operations on core entities
- [ ]  Document schema and relationships

### 1.2 Database Schema

```
-- DIRECT_COSTS Table
CREATE TABLE direct_costs (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  cost_type ENUM('Expense', 'Invoice', 'Subcontractor Invoice') NOT NULL,
  date DATE NOT NULL,
  vendor_id UUID,
  employee_id UUID,
  invoice_number VARCHAR(255),
  status ENUM('Draft', 'Approved', 'Rejected', 'Paid') DEFAULT 'Draft',
  description TEXT,
  terms VARCHAR(255),
  received_date DATE,
  paid_date DATE,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by_user_id UUID NOT NULL,
  updated_by_user_id UUID NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id),
  INDEX idx_project_date (project_id, date),
  INDEX idx_status (status),
  INDEX idx_vendor (vendor_id)
);

-- DIRECT_COST_LINE_ITEMS Table
CREATE TABLE direct_cost_line_items (
  id UUID PRIMARY KEY,
  direct_cost_id UUID NOT NULL,
  budget_code_id UUID NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  uom VARCHAR(50),
  unit_cost DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  line_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (direct_cost_id) REFERENCES direct_costs(id) ON DELETE CASCADE,
  FOREIGN KEY (budget_code_id) REFERENCES budget_codes(id),
  INDEX idx_direct_cost (direct_cost_id),
  INDEX idx_budget_code (budget_code_id),
  UNIQUE KEY unique_dc_line (direct_cost_id, line_order)
);

-- BUDGET_CODES Table
CREATE TABLE budget_codes (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  code VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  UNIQUE KEY unique_budget_code (project_id, code),
  INDEX idx_project (project_id)
);

-- VENDORS Table
CREATE TABLE vendors (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_company (company_id)
);

-- ATTACHMENTS Table
CREATE TABLE direct_cost_attachments (
  id UUID PRIMARY KEY,
  direct_cost_id UUID NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_by_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (direct_cost_id) REFERENCES direct_costs(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
  INDEX idx_direct_cost (direct_cost_id)
);

-- COST_CODE_GROUPS Table
CREATE TABLE cost_code_groups (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  group_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  INDEX idx_project (project_id)
);

-- GROUP_ASSIGNMENTS Table
CREATE TABLE direct_cost_group_assignments (
  id UUID PRIMARY KEY,
  direct_cost_id UUID NOT NULL,
  cost_code_group_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (direct_cost_id) REFERENCES direct_costs(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_code_group_id) REFERENCES cost_code_groups(id),
  UNIQUE KEY unique_assignment (direct_cost_id, cost_code_group_id)
);

-- AUDIT_LOG Table
CREATE TABLE direct_cost_audit_log (
  id UUID PRIMARY KEY,
  direct_cost_id UUID,
  action VARCHAR(50),
  changed_fields JSON,
  user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (direct_cost_id) REFERENCES direct_costs(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_direct_cost (direct_cost_id),
  INDEX idx_created_at (created_at)
);
```

### 1.3 Data Relationships Diagram

PROJECT (parent)
  ├─→ DIRECT_COSTS (1:M)
  │    ├─→ DIRECT_COST_LINE_ITEMS (1:M)
  │    │    └─→ BUDGET_CODES (M:1)
  │    ├─→ VENDORS (M:1)
  │    ├─→ EMPLOYEES (M:1)
  │    ├─→ DIRECT_COST_ATTACHMENTS (1:M)
  │    ├─→ DIRECT_COST_GROUP_ASSIGNMENTS (1:M)
  │    │    └─→ COST_CODE_GROUPS (M:1)
  │    └─→ DIRECT_COST_AUDIT_LOG (1:M)
  └─→ BUDGET_CODES (1:M)
  └─→ COST_CODE_GROUPS (1:M)

### 1.4 Key Calculations

```
javascript// Line Item Total Calculation
line_total = quantity * unit_cost

// Direct Cost Total Calculation
direct_cost.total_amount = SUM(line_items[*].line_total)

// Summary By Cost Code Aggregation
cost_code_total = SUM(
  direct_cost_line_items
  WHERE budget_code_id = X
  AND direct_cost.status IN ('Approved', 'Paid')
)

// Status-based Filters
approved_total = SUM(direct_costs[*].total_amount WHERE status = 'Approved')
paid_total = SUM(direct_costs[*].total_amount WHERE status = 'Paid')
```

### 1.5 API Endpoints - Phase 1

#### 1.5.1 Direct Costs CRUD

POST /api/v1/projects/{projectId}/direct-costs
POST /api/v1/projects/{projectId}/direct-costs/{costId}
GET /api/v1/projects/{projectId}/direct-costs
GET /api/v1/projects/{projectId}/direct-costs/{costId}
PUT /api/v1/projects/{projectId}/direct-costs/{costId}
DELETE /api/v1/projects/{projectId}/direct-costs/{costId}

##### POST - Create Direct Cost

jsonRequest:
{
  "cost_type": "Expense",
  "date": "2025-11-29",
  "vendor_id": "550e8400-e29b-41d4-a716-446655440000",
  "employee_id": null,
  "invoice_number": null,
  "status": "Draft",
  "description": "Office supplies",
  "terms": "Net 30",
  "received_date": "2025-11-29",
  "paid_date": null,
  "line_items": [
    {
      "budget_code_id": "550e8400-e29b-41d4-a716-446655440001",
      "description": "Supplies",
      "quantity": 1,
      "uom": "LOT",
      "unit_cost": 8.75
    }
  ]
}

Response (201):
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "project_id": "562949954728542",
  "cost_type": "Expense",
  "date": "2025-11-29",
  "status": "Draft",
  "total_amount": 8.75,
  "line_items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "budget_code_id": "550e8400-e29b-41d4-a716-446655440001",
      "description": "Supplies",
      "quantity": 1,
      "uom": "LOT",
      "unit_cost": 8.75,
      "line_total": 8.75
    }
  ],
  "created_at": "2025-11-29T15:30:00Z",
  "create

GET - Fetch All Direct Costs (with Pagination)
jsonRequest:
GET /api/v1/projects/{projectId}/direct-costs?page=1&limit=150&sort=-date&filter[status]=Approved

Response (200):
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "date": "2025-11-29",
      "vendor_id": "550e8400-e29b-41d4-a716-446655440000",
      "vendor_name": "Vista Building Services",
      "cost_type": "Expense",
      "invoice_number": null,
      "status": "Approved",
      "amount": 8.75,
      "received_date": "2025-11-29",
      "paid_date": "2025-11-29"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_records": 374,
    "per_page": 150
  },
  "summary": {
    "total_amount": 555178.74,
    "approved_amount": 545000.00,
    "paid_amount": 540000.00
  }
}
PUT - Update Direct Cost
jsonRequest:
PUT /api/v1/projects/{projectId}/direct-costs/{costId}

{
  "status": "Approved",
  "paid_date": "2025-11-29",
  "line_items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "budget_code_id": "550e8400-e29b-41d4-a716-446655440001",
      "description": "Supplies",
      "quantity": 1,
      "uom": "LOT",
      "unit_cost": 8.75
    }
  ]
}

Response (200):
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "status": "Approved",
  "paid_date": "2025-11-29",
  "updated_at": "2025-11-29T16:00:00Z",
  "updated_by_user_id": "550e8400-e29b-41d4-a716-446655440200"
}

#### 1.5.2 Line Items Management

POST /api/v1/projects/{projectId}/direct-costs/{costId}/line-items
PUT /api/v1/projects/{projectId}/direct-costs/{costId}/line-items/{lineItemId}
DELETE /api/v1/projects/{projectId}/direct-costs/{costId}/line-items/{lineItemId}
GET /api/v1/projects/{projectId}/direct-costs/{costId}/line-items
POST - Add Line Item
jsonRequest:
{
  "budget_code_id": "550e8400-e29b-41d4-a716-446655440001",
  "description": "Labor costs",
  "quantity": 10,
  "uom": "HOUR",
  "unit_cost": 75.00,
  "line_order": 2
}

Response (201):
{
  "id": "550e8400-e29b-41d4-a716-446655440102",
  "direct_cost_id": "550e8400-e29b-41d4-a716-446655440100",
  "budget_code_id": "550e8400-e29b-41d4-a716-446655440001",
  "description": "Labor costs",
  "quantity": 10,
  "uom": "HOUR",
  "unit_cost": 75.00,
  "line_total": 750.00,
  "line_order": 2,
  "created_at": "2025-11-29T15:35:00Z"
}


#### 1.5.3 Budget Codes & Cost Code Groups

GET /api/v1/projects/{projectId}/budget-codes
POST /api/v1/projects/{projectId}/cost-code-groups
GET /api/v1/projects/{projectId}/cost-code-groups
GET - Fetch Budget Codes
jsonResponse (200):
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "code": "01-3120",
      "description": "Vice President",
      "category": "Labor",
      "is_active": true
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "code": "02-5200",
      "description": "Subcontractor Services",
      "category": "External Labor",
      "is_active": true
    }
  ]
}

### 1.6 Backend Logic - Phase 1

javascript// Direct Cost Service Layer

class DirectCostService {
  
  // Calculate total from line items
  calculateTotal(lineItems) {
    return lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_cost);
    }, 0);
  }

  // Validate direct cost before saving
  validateDirectCost(costData) {
    const errors = [];
    
    if (!costData.cost_type) errors.push('Cost type is required');
    if (!costData.date) errors.push('Date is required');
    if (!costData.line_items || costData.line_items.length === 0) {
      errors.push('At least one line item is required');
    }
    
    costData.line_items?.forEach((item, index) => {
      if (!item.budget_code_id) {
        errors.push(`Line item ${index + 1}: Budget code is required`);
      }
      if (item.quantity <= 0) {
        errors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.unit_cost < 0) {
        errors.push(`Line item ${index + 1}: Unit cost cannot be negative`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  // Create new direct cost
  async createDirectCost(projectId, costData, userId) {
    const validation = this.validateDirectCost(costData);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    const total = this.calculateTotal(costData.line_items);
    
    const directCost = {
      id: generateUUID(),
      project_id: projectId,
      cost_type: costData.cost_type,
      date: costData.date,
      vendor_id: costData.vendor_id || null,
      employee_id: costData.employee_id || null,
      invoice_number: costData.invoice_number || null,
      status: 'Draft',
      description: costData.description,
      terms: costData.terms,
      received_date: costData.received_date,
      paid_date: null,
      total_amount: total,
      created_by_user_id: userId,
      updated_by_user_id: userId,
      created_at: new Date(),
      updated_at: new Date()
    };

    await repository.save(directCost);
    
    // Save line items
    for (let i = 0; i < costData.line_items.length; i++) {
      const lineItem = costData.line_items[i];
      await repository.saveLineItem({
        id: generateUUID(),
        direct_cost_id: directCost.id,
        budget_code_id: lineItem.budget_code_id,
        description: lineItem.description,
        quantity: lineItem.quantity,
        uom: lineItem.uom,
        unit_cost: lineItem.unit_cost,
        line_order: i + 1,
        created_at: new Date()
      });
    }

    // Log audit
    await this.logAudit(directCost.id, 'CREATE', {}, userId);

    return directCost;
  }

  // Update direct cost
  async updateDirectCost(projectId, costId, costData, userId) {
    const existingCost = await repository.findById(costId);
    if (!existingCost) {
      throw new NotFoundError('Direct cost not found');
    }

    const validation = this.validateDirectCost(costData);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    const changedFields = {};
    const updateData = {
      status: costData.status || existingCost.status,
      paid_date: costData.paid_date || existingCost.paid_date,
      updated_by_user_id: userId,
      updated_at: new Date()
    };

    // Track changes
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== existingCost[key]) {
        changedFields[key] = {
          old: existingCost[key],
          new: updateData[key]
        };
      }
    });

    const total = this.calculateTotal(costData.line_items);
    updateData.total_amount = total;

    await repository.update(costId, updateData);

    // Update line items
    if (costData.line_items) {
      await repository.deleteLineItems(costId);
      for (let i = 0; i < costData.line_items.length; i++) {
        const lineItem = costData.line_items[i];
        await repository.saveLineItem({
          id: lineItem.id || generateUUID(),
          direct_cost_id: costId,
          budget_code_id: lineItem.budget_code_id,
          description: lineItem.description,
          quantity: lineItem.quantity,
          uom: lineItem.uom,
          unit_cost: lineItem.unit_cost,
          line_order: i + 1
        });
      }
    }

    // Log audit
    await this.logAudit(costId, 'UPDATE', changedFields, userId);

    return updateData;
  }

  // Log audit trail
  async logAudit(directCostId, action, changedFields, userId) {
    await repository.saveAuditLog({
      id: generateUUID(),
      direct_cost_id: directCostId,
      action,
      changed_fields: JSON.stringify(changedFields),
      user_id: userId,
      created_at: new Date()
    });
  }
}

###  1.7 UI Components - Phase 1

#### 1.7.1 DirectCostList Component

```
javascript// src/components/DirectCosts/DirectCostList.jsx
import React, { useState, useEffect } from 'react';
import { Table, Pagination, Button, Badge } from '../shared';
import { formatCurrency, formatDate } from '../../utils';

export const DirectCostList = ({ projectId, view = 'summary' }) => {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [summary, setSummary] = useState({});

  useEffect(() => {
    fetchDirectCosts();
  }, [projectId, page, filters, view]);

  const fetchDirectCosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 150,
        view,
        ...filters
      });
      
      const response = await fetch(
        `/api/v1/projects/${projectId}/direct-costs?${params}`
      );
      const data = await response.json();
      
      setCosts(data.data);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch direct costs', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = view === 'summary' ? [
    { key: 'date', label: 'Date', width: '10%' },
    { key: 'vendor', label: 'Vendor', width: '20%' },
    { key: 'type', label: 'Type', width: '12%' },
    { key: 'invoice_number', label: 'Invoice #', width: '15%' },
    { key: 'status', label: 'Status', width: '10%' },
    { key: 'amount', label: 'Amount', width: '12%' },
    { key: 'received_date', label: 'Received Date', width: '12%' },
    { key: 'paid_date', label: 'Paid Date', width: '12%' }
  ] : [
    { key: 'date', label: 'Date', width: '10%' },
    { key: 'employee', label: 'Employee', width: '15%' },
    { key: 'vendor', label: 'Vendor', width: '15%' },
    { key: 'type', label: 'Type', width: '10%' },
    { key: 'invoice_number', label: 'Invoice #', width: '12%' },
    { key: 'status', label: 'Status', width: '10%' },
    { key: 'description', label: 'Description', width: '20%' },
    { key: 'amount', label: 'Amount', width: '12%' }
  ];

  const renderCell = (item, column) => {
    switch (column.key) {
      case 'date':
      case 'received_date':
      case 'paid_date':
        return formatDate(item[column.key]);
      case 'amount':
        return formatCurrency(item[column.key]);
      case 'status':
        return <Badge status={item.status}>{item.status}</Badge>;
      default:
        return item[column.key];
    }
  };

  return (
    <div className="direct-cost-list">
      <div className="list-header">
        <h2>{view === 'summary' ? 'Summary' : 'Summary By Cost Code'}</h2>
        <div className="summary-stats">
          <div>Total: {formatCurrency(summary.total_amount)}</div>
          <div>Approved: {formatCurrency(summary.approved_amount)}</div>
          <div>Paid: {formatCurrency(summary.paid_amount)}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <Table
            columns={columns}
            data={costs}
            renderCell={renderCell}
            onRowClick={(item) => console.log('View cost', item.id)}
          />
          
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(summary.total_amount / 150)}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};
```

#### 1.7.2 DirectCostForm Component

javascript// src/components/DirectCosts/DirectCostForm.jsx
import React, { useState } from 'react';
import { Button, Input, Select, DatePicker } from '../shared';
import { LineItemsTable } from './LineItemsTable';
import { validateDirectCost } from '../../services/directCostService';

export const DirectCostForm = ({ projectId, costId = null, onSubmit }) => {
  const [formData, setFormData] = useState({
    cost_type: 'Expense',
    date: new Date(),
    vendor_id: null,
    employee_id: null,
    status: 'Draft',
    description: '',
    terms: '',
    received_date: new Date(),
    paid_date: null,
    line_items: []
  });

  const [errors, setErrors] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLineItemsChange = (items) => {
    setFormData(prev => ({
      ...prev,
      line_items: items
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validation = validateDirectCost(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors([error.message]);
    }
  };

  return (
    <form className="direct-cost-form" onSubmit={handleSubmit}>
      <section className="form-section">
        <h3>General Information</h3>
        
        <div className="form-grid">
          <Select
            label="Type"
            name="cost_type"
            value={formData.cost_type}
            onChange={handleInputChange}
            options={[
              { value: 'Expense', label: 'Expense' },
              { value: 'Invoice', label: 'Invoice' },
              { value: 'Subcontractor Invoice', label: 'Subcontractor Invoice' }
            ]}
          />
          
          <DatePicker
            label="Date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
          />
          
          <Select
            label="Vendor"
            name="vendor_id"
            value={formData.vendor_id}
            onChange={handleInputChange}
            options={[]} // Load from API
          />
          
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Approved', label: 'Approved' }
            ]}
          />
        </div>

        <LineItemsTable
          items={formData.line_items}
          onChange={handleLineItemsChange}
        />
      </section>

      {errors.length > 0 && (
        <div className="form-errors">
          {errors.map((error, idx) => (
            <div key={idx} className="error-message">{error}</div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <Button type="submit" variant="primary">Save</Button>
        <Button type="button" variant="secondary">Cancel</Button>
      </div>
    </form>
  );
};

#### 1.7.3 LineItemsTable Component

javascript// src/components/DirectCosts/LineItemsTable.jsx
import React, { useState } from 'react';
import { Input, Select, Button } from '../shared';
import { formatCurrency } from '../../utils';

export const LineItemsTable = ({ items, onChange }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAddLine = () => {
    onChange([
      ...items,
      {
        budget_code_id: null,
        description: '',
        quantity: 1,
        uom: 'LOT',
        unit_cost: 0
      }
    ]);
  };

  const handleUpdateLine = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    onChange(updated);
  };

  const handleRemoveLine = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="line-items-table">
      <table>
        <thead>
          <tr>
            <th>Budget Code</th>
            <th>Description</th>
            <th>Qty</th>
            <th>UOM</th>
            <th>Unit Cost</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty-state">
                You Have No Line Items Yet
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={index}>
                <td>
                  <Input
                    type="text"
                    value={item.budget_code_id || ''}
                    onChange={(e) => handleUpdateLine(index, 'budget_code_id', e.target.value)}
                    placeholder="Select code"
                  />
                </td>
                <td>
                  <Input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateLine(index, 'description', e.target.value)}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdateLine(index, 'quantity', parseFloat(e.target.value))}
                  />
                </td>
                <td>
                  <Input
                    type="text"
                    value={item.uom}
                    onChange={(e) => handleUpdateLine(index, 'uom', e.target.value)}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={item.unit_cost}
                    onChange={(e) => handleUpdateLine(index, 'unit_cost', parseFloat(e.target.value))}
                  />
                </td>
                <td className="total-cell">
                  {formatCurrency(item.quantity * item.unit_cost)}
                </td>
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveLine(index)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Button onClick={handleAddLine} variant="primary" className="add-line-btn">
        Add Line
      </Button>

      <div className="total-row">
        <strong>Total:</strong>
        <span className="total-amount">
          {formatCurrency(
            items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
          )}
        </span>
      </div>
    </div>
  );
};

#### 1.7.4 FiltersPanel Component

```
javascript// src/components/DirectCosts/FiltersPanel.jsx
import React, { useState } from 'react';
import { Select, DatePicker, Button, Input } from '../shared';

export const FiltersPanel = ({ onFiltersChange, onClearAll }) => {
  const [filters, setFilters] = useState({
    status: null,
    cost_type: null,
    vendor_id: null,
    date_from: null,
    date_to: null,
    search: ''
  });

  const handleChange = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    onFiltersChange(updated);
  };

  return (
    <div className="filters-panel">
      <Input
        placeholder="Search"
        name="search"
        value={filters.search}
        onChange={(e) => handleChange('search', e.target.value)}
      />

      <Select
        label="Status"
        name="status"
        value={filters.status}
        onChange={(e) => handleChange('status', e.target.value)}
        options={[
          { value: 'Draft', label: 'Draft' },
          { value: 'Approved', label: 'Approved' },
          { value: 'Paid', label: 'Paid' }
        ]}
      />

      <Select
        label="Type"
        name="cost_type"
        value={filters.cost_type}
        onChange={(e) => handleChange('cost_type', e.target.value)}
        options={[
          { value: 'Expense', label: 'Expense' },
          { value: 'Invoice', label: 'Invoice' },
          { value: 'Subcontractor Invoice', label: 'Subcontractor Invoice' }
        ]}
      />

      <DatePicker
        label="Date From"
        name="date_from"
        value={filters.date_from}
        onChange={(e) => handleChange('date_from', e.target.value)}
      />

      <DatePicker
        label="Date To"
        name="date_to"
        value={filters.date_to}
        onChange={(e) => handleChange('date_to', e.target.value)}
      />

      <Button
        variant="danger"
        onClick={onClearAll}
      >
        Clear All
      </Button>
    </div>
  );
};
```

### 1.8 Testing Requirements - Phase 1

#### Unit Tests

```
javascript// tests/services/directCostService.test.js
describe('DirectCostService', () => {
  let service;

  beforeEach(() => {
    service = new DirectCostService();
  });

  describe('calculateTotal', () => {
    it('should calculate total from line items', () => {
      const items = [
        { quantity: 2, unit_cost: 50 },
        { quantity: 3, unit_cost: 25 }
      ];
      expect(service.calculateTotal(items)).toBe(175);
    });

    it('should handle empty line items', () => {
      expect(service.calculateTotal([])).toBe(0);
    });
  });

  describe('validateDirectCost', () => {
    it('should validate required fields', () => {
      const result = service.validateDirectCost({});
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate line items', () => {
      const result = service.validateDirectCost({
        cost_type: 'Expense',
        date: '2025-01-01',
        line_items: [
          { quantity: -1, unit_cost: 50 }
        ]
      });
      expect(result.isValid).toBe(false);
    });

    it('should accept valid direct cost', () => {
      const result = service.validateDirectCost({
        cost_type: 'Expense',
        date: '2025-01-01',
        line_items: [
          {
            budget_code_id: '123',
            quantity: 1,
            unit_cost: 50
          }
        ]
      });
      expect(result.isValid).toBe(true);
    });
  });
});
```

#### Integration Tests
// tests/api/directCosts.integration.test.js
describe('Direct Costs API', () => {
  let projectId;
  let costId;

  beforeAll(async () => {
    // Setup test project
    projectId = await createTestProject();
  });

  describe('POST /api/v1/projects/:projectId/direct-costs', () => {
    it('should create a direct cost', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/direct-costs`)
        .send({
          cost_type: 'Expense',
          date: '2025-01-01',
          description: 'Test expense',
          line_items: [
            {
              budget_code_id: 'test-code-1',
              quantity: 1,
              unit_cost: 100
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.total_amount).toBe(100);
      
      costId = response.body.id;
    });
  });

  describe('GET /api/v1/projects/:projectId/direct-costs/:costId', () => {
    it('should fetch a direct cost', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/direct-costs/${costId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(costId);
    });
  });

  describe('PUT /api/v1/projects


# PHASE 2: ADVANCED UI & USER INTERACTIONS
Overview
Phase 2 focuses on building a rich, interactive user interface with sophisticated data visualization, inline editing, drag-and-drop functionality, real-time filtering, and export capabilities. This phase transforms the basic components from Phase 1 into a production-grade, enterprise-level interface.

2.1 Implementation Checklist

 Build interactive data table with column management
 Implement inline editing for direct costs and line items
 Add drag-and-drop reordering for line items
 Create advanced filtering system with saved filters
 Implement search functionality with debouncing
 Build export-to-CSV/PDF functionality
 Create modal dialogs for create/edit workflows
 Add file attachment upload interface
 Implement data validation with visual feedback
 Build keyboard shortcuts for common actions
 Create responsive mobile layouts
 Add loading states, error handling, and retry logic
 Implement infinite scroll or optimized pagination
 Build summary statistics dashboard
 Create cost code grouping visualization
 Test all interactive components
 Optimize performance with memoization and lazy loading
 Add accessibility features (ARIA labels, keyboard navigation)


2.2 Form Enhancements & Interactions
2.2.1 Direct Cost Form Enhanced Workflow
Key Tasks:

Transform the basic form into a multi-step wizard with validation at each step
Implement auto-save functionality to persist draft states as users type (with debouncing to avoid excessive API calls)
Add dropdown suggestions for vendor selection with search-as-you-type capability
Create date picker with date range presets (Today, Last 7 days, Last 30 days, Custom)
Build conditional field visibility based on cost type selection (e.g., show employee field only for Expense type, show invoice number for Invoice type)
Implement field dependency logic (e.g., if cost_type = "Subcontractor Invoice", require vendor_id and invoice_number)
Add real-time calculation display showing running total as user modifies line items
Create attachment upload zone with drag-and-drop support and file preview
Implement file size validation and format restrictions
Add progress indicator showing form completion percentage

2.2.2 Line Items Inline Editing
Key Tasks:

Replace static table with inline-editable cells using contentEditable or input overlays
Implement real-time validation feedback (red borders for invalid entries, green checkmarks for valid)
Add quantity/unit_cost change event handlers that trigger total recalculation immediately
Create editable budget code selector with autocomplete and dropdown search
Build quantity increment/decrement buttons (±1, ±10 buttons)
Implement unit selection dropdown with common construction units (LOT, HOUR, DAY, SQFT, LF, etc.)
Add row deletion with undo functionality (store deleted items in a trash stack for 5 seconds)
Create row duplication feature for quickly copying line items
Build row reordering via drag handles (visual drag indicator showing position)
Implement keyboard navigation (Tab to move between cells, Enter to add new row, Delete to remove row)

2.2.3 Attachment Management
Key Tasks:

Build file upload component with progress bars showing upload status
Implement drag-and-drop zone for multiple file uploads
Create file preview functionality (thumbnails for images, icons for documents)
Add file metadata display (filename, size, upload date, uploaded by)
Build delete attachment functionality with confirmation modal
Implement file size validation with user-friendly error messages
Create virus scan integration placeholder (for future antivirus scanning)
Add duplicate file detection to prevent uploading same file twice
Implement file download functionality with access logging


2.3 Advanced Data Table Features
2.3.1 Dynamic Column Management
Key Tasks:

Build column visibility toggle (checkboxes to show/hide columns)
Implement column reordering via drag-and-drop
Create column pinning (freeze left/right columns for horizontal scrolling)
Build column width adjustment (drag column edges to resize)
Implement sort functionality on all columns (asc/desc indicators)
Create multi-column sort (hold Ctrl+click to add secondary sorts)
Add column-specific filtering dropdowns
Build header context menu with options (Sort, Filter, Hide, Pin, Export)
Create column preset profiles (e.g., "Summary View", "Detailed View", "Accounting View")
Implement column preferences persistence in local storage

2.3.2 Row Selection & Bulk Operations
Key Tasks:

Add checkbox column for row selection with select-all/deselect-all in header
Implement shift+click for range selection
Build bulk status update (change multiple items from Draft to Approved simultaneously)
Create bulk delete with confirmation warning showing count of items to delete
Implement bulk email functionality (send selected costs to email recipients)
Build bulk export (export selected items to CSV/PDF)
Create bulk tag/group assignment for selected items
Add selection counter showing "X of Y selected"
Build quick action toolbar that appears when rows are selected
Implement selection persistence when filtering/searching

2.3.3 Sorting & Pagination
Key Tasks:

Implement server-side sorting to handle large datasets efficiently
Create sort direction indicators (up/down arrows in column headers)
Build multi-column sort UI with sort priority display
Implement pagination with options for rows per page (25, 50, 100, 150, 200)
Create page jump input (type page number to jump directly)
Build "Load More" infinite scroll alternative to pagination
Implement cursor-based pagination for large result sets
Create total record count display
Build navigation buttons (First, Previous, Next, Last)
Add keyboard shortcuts for pagination (← → for previous/next page)


2.4 Advanced Filtering System
2.4.1 Filter UI Components
Key Tasks:

Build filter dropdown panel with multiple filter types (Select, Date Range, Numeric Range, Text Search)
Implement status filter with pill-style selection (visual chips showing selected filters)
Create vendor filter with autocomplete search
Build date range picker with preset options (This Month, Last 30 Days, Last Quarter, Last Year, Custom)
Create amount range filter with min/max sliders
Implement cost type filter with icons
Build employee filter for labor costs
Create "Add Filter" button to add multiple independent filter conditions
Implement AND/OR logic toggle for multiple filters
Build filter counter badge showing active filter count

2.4.2 Saved Filters & Smart Filters
Key Tasks:

Create "Save Filter" feature allowing users to name and persist custom filter combinations
Build saved filters list in dropdown menu with edit/delete options
Implement one-click "Approved Costs Only" quick filter
Create one-click "Pending Review" smart filter (Draft + Submitted statuses)
Build "This Month Only" temporal filter
Create "High Value Costs" filter (amounts > $10,000)
Implement "My Costs Only" filter (created by current user)
Build "Needs Follow-up" filter (no paid_date set)
Create filter history showing recently used filters
Implement filter sharing (share filter combinations with team members)

2.4.3 Search Functionality
Key Tasks:

Build global search box with debouncing (wait 300ms after user stops typing before API call)
Implement search across multiple fields (vendor name, description, invoice number, employee name)
Create search results preview showing matched fields highlighted
Build advanced search modal with field-specific search operators
Implement full-text search on descriptions
Create search history dropdown showing recent searches
Build "Clear Search" button
Implement search performance optimization for large datasets
Add search result count display
Create "Did you mean?" suggestions for typos


2.5 Export & Reporting
2.5.1 CSV Export
Key Tasks:

Build export to CSV feature with all visible columns
Create column selection modal allowing users to choose which columns to export
Implement custom column order export (export in displayed order)
Build export filtered results option (export only items matching current filters)
Create export selected rows option (if rows are selected)
Implement date format standardization for CSV exports
Build currency formatting in exported data
Create filename auto-generation with date stamp (e.g., "direct-costs-2025-01-06.csv")
Implement large dataset handling for CSV (show progress bar for large exports)
Build export template selection (Standard, Accounting, Project Manager templates)

2.5.2 PDF Export
Key Tasks:

Build PDF export with professional layout and branding
Create multi-page PDF handling for large datasets
Implement page header/footer with project name, date, page numbers
Build summary section at top of PDF (totals, approved vs paid breakdown)
Create PDF export with selected columns only
Implement chart generation for PDF (summary by cost code, trend over time)
Build PDF password protection option
Create signed PDF option (for audit trail)
Implement custom logo/company branding in PDF header
Build email PDF directly option (PDF export + email in one action)

2.5.3 Email Export
Key Tasks:

Build email composer modal with recipient field
Implement template selection (Summary Report, Detailed Report, Cost Analysis)
Create email preview before sending
Build attachment format selection (CSV, PDF, or both)
Implement scheduled email option (send at specific time/recurring)
Create email recipient autocomplete from company directory
Build email body customization with template variables
Implement CC/BCC fields
Create email delivery status tracking
Build email history log showing previous exports


2.6 Summary Views & Visualizations
2.6.1 Summary Dashboard
Key Tasks:

Create prominent statistics cards showing:

Total Direct Costs (all records)
Approved Amount (sum of approved statuses)
Paid Amount (sum of paid statuses)
Pending Amount (Draft + submitted not yet approved)


Build trend mini-chart showing costs over time (last 30 days)
Create top vendors by cost display (list top 5-10 vendors)
Build cost type distribution visualization (pie chart: Expense vs Invoice vs Subcontractor)
Create cost code breakdown table showing costs aggregated by budget code
Implement status breakdown pie chart (Draft, Approved, Paid percentages)
Build average cost per transaction metric
Create month-over-month comparison
Implement cost per employee metrics (for labor expenses)
Build forecasting indicator (projected costs based on trend)

2.6.2 Summary By Cost Code View
Key Tasks:

Build grouped table where rows are grouped by cost code with subtotals
Implement collapsible cost code sections (expand/collapse to show/hide line items)
Create cost code header rows showing:

Cost code identifier (01-3120)
Cost code description (Vice President)
Total for that cost code
Item count


Build individual line items under each cost code with details
Implement cost code subtotal row with bold formatting
Create grand total row at bottom of table
Build sorting by cost code, by total, by item count
Implement filtering at cost code level
Create cost code-level edit actions (edit all items in a cost code)
Build cost code comparison view (show multiple cost codes side-by-side)

2.6.3 Custom Reports
Key Tasks:

Build report builder allowing users to select metrics and dimensions
Create preset reports:

Daily Cost Summary
Weekly Cost Analysis
Monthly Budget Variance
Vendor Performance
Cost Code Analysis
Labor Cost Tracking


Implement date range selection for reports
Build grouping options (by Date, by Vendor, by Cost Code, by Employee)
Create sorting options within reports
Implement subtotals at multiple levels (by group, by cost code, grand total)
Build percentage calculations (% of total, % of budget)
Create variance analysis (actual vs. budget comparison)
Implement report scheduling (run report automatically on schedule)
Build report distribution (email report to stakeholders)


2.7 Status Workflow & Approval System
2.7.1 Status Transitions
Key Tasks:

Map out valid status transitions:

Draft → Approved (requires approval permission)
Approved → Paid (requires payment confirmation)
Draft → Rejected (with reason required)
Any status → Draft (revert for editing)


Build status change buttons in detail view
Create status transition modals for approval (show cost details, require approval reason/notes)
Implement payment confirmation modal (confirm paid date, payment method)
Build rejection reason dialog (require comment explaining rejection)
Create batch status updates (change multiple items at once)
Implement status change history in audit log
Build approval workflow notifications (notify relevant users of status changes)
Create undo functionality (revert last status change within time window)
Implement status change permissions enforcement

2.7.2 Approval Workflow Integration
Key Tasks:

Build approval request feature (send cost for approval to designated users)
Create approval notification system (in-app notifications, email notifications)
Implement approval queue for managers showing pending approvals
Build approval comments/notes functionality
Create approval history tracking
Implement escalation (if approval delayed, escalate to higher level)
Build approval delegation (assign approvals to another user temporarily)
Create batch approval UI for reviewing multiple items at once
Implement approval analytics (average approval time, approval rates by user)
Build approval deadline warnings


2.8 Mobile & Responsive Design
2.8.1 Mobile Interface
Key Tasks:

Build mobile-optimized table layout (stack columns vertically on small screens)
Create card-based view for costs on mobile (swipeable cards showing key info)
Implement mobile search and filter interface (simplified filter options)
Build mobile attachment upload with camera integration
Create simplified form for creating costs on mobile
Implement mobile-friendly modals (full-screen on mobile)
Build mobile navigation (bottom navigation bar or hamburger menu)
Create mobile-optimized pagination (simplified with prev/next only)
Implement touch-friendly interactions (larger tap targets, 44px minimum)
Build offline capability (cache recent data, sync when online)

2.8.2 Responsive Breakpoints
Key Tasks:

Design for mobile (< 480px): Single column layout, stacked elements
Design for tablet (480px - 1024px): Two-column layout, simplified tables
Design for desktop (> 1024px): Full multi-column layout, detailed tables
Implement CSS media queries and responsive utilities
Test layout at multiple breakpoints
Optimize images for different screen sizes (responsive images)
Build responsive typography (font sizes scale with viewport)
Implement responsive grid system (12-column or similar)
Test touch interactions on actual devices
Build responsive modal sizing


2.9 Performance & Optimization
2.9.1 Front-end Performance
Key Tasks:

Implement virtual scrolling for large tables (render only visible rows)
Build component memoization to prevent unnecessary re-renders
Implement lazy loading for images and heavy components
Build code splitting (separate bundle for each major feature)
Implement route-based code splitting
Create performance monitoring (track render times, API response times)
Build bundle size analysis and optimization
Implement caching strategy for API responses
Build service worker for offline support and caching
Optimize CSS (remove unused styles, minify)

2.9.2 Table Performance
Key Tasks:

Implement server-side pagination (fetch only current page from API)
Build server-side sorting (API returns pre-sorted data)
Build server-side filtering (API applies filters, returns filtered results)
Implement request debouncing (wait before sending filter/search requests)
Create request cancellation (cancel previous requests when new one issued)
Build result caching (cache previous search results to avoid redundant API calls)
Implement scroll-based data loading (load more data as user scrolls)
Build skeleton loading states (show loading placeholder while fetching)
Optimize table cell rendering (use pure functions, avoid complex logic)
Implement data virtualization for very large tables (10K+ rows)


2.10 Error Handling & User Feedback
2.10.1 Error States & Messages
Key Tasks:

Build error boundary component (catch React errors, show fallback UI)
Create user-friendly error messages (avoid technical jargon)
Implement error recovery options (Retry button, Go Back, Contact Support)
Build error logging (log errors to monitoring service)
Create validation error display (show which fields have errors)
Implement field-level error messages (display error below/beside invalid field)
Build form-level error summary (list all errors at top of form)
Create network error handling (show offline message, retry when online)
Build API error code mapping (translate error codes to user messages)
Implement error notification system (toast/snackbar for transient errors)

2.10.2 Loading States
Key Tasks:

Build skeleton loaders for table rows and form sections
Create loading spinners for async operations
Implement loading state buttons (disable during submission, show spinner)
Build progress bars for long-running operations
Create loading text that updates (e.g., "Loading... 30%")
Implement loading state for pagination
Build loading state for filtered results
Create estimated time remaining for uploads
Build cancellable loading states (allow user to cancel ongoing operation)
Implement loading timeouts (show error if request takes too long)

2.10.3 Success Feedback
Key Tasks:

Build success toast notifications for actions (cost created, updated, deleted)
Create success modals for important operations
Implement success animations (checkmark animation, green highlight)
Build undo functionality with time window (undo last action within 5 seconds)
Create success page after workflow completion
Build confirmation messages before destructive actions
Implement change indicators (highlight changed fields)
Create audit trail display (show history of changes)
Build notification center (collect all notifications in one place)
Implement notification preferences (user controls which notifications to receive)


2.11 Accessibility & Internationalization
2.11.1 Accessibility (A11y)
Key Tasks:

Add ARIA labels to all interactive elements
Implement keyboard navigation (Tab, Shift+Tab, Arrow keys, Enter, Escape)
Build focus indicators (visible focus ring on all interactive elements)
Create semantic HTML (use proper heading hierarchy, form labels)
Implement screen reader support (text alternatives for icons, skip links)
Build color contrast compliance (WCAG AA standard 4.5:1 for text)
Create accessible modals (focus trap, restore focus on close)
Implement accessible tables (header associations, scope attributes)
Build accessible forms (labels, error messages, required indicators)
Test with screen readers (NVDA, JAWS, VoiceOver)

2.11.2 Internationalization (i18n)
Key Tasks:

Build translation key system (externalize all strings)
Create locale selection dropdown
Implement date/currency formatting per locale
Build right-to-left (RTL) language support
Create translation file structure (JSON or similar)
Implement plural handling (singular vs. plural forms)
Build contextual translations (same word, different translations)
Create translation key namespace organization
Implement fallback to English if translation missing
Build translation coverage reporting (which keys are translated)


2.12 Testing Strategy
2.12.1 Component Testing
Key Tasks:

Write tests for each UI component (rendering, user interactions)
Test component props and state management
Implement snapshot testing for UI components
Build tests for prop validation
Create tests for edge cases (empty state, loading state, error state)
Implement accessibility testing (axe-core)
Build performance tests (render time benchmarks)
Create visual regression tests (compare screenshots)
Test responsive behavior at multiple breakpoints
Implement component integration tests

2.12.2 User Interaction Testing
Key Tasks:

Write tests for form submission workflows
Test filter application and clearing
Implement tests for inline editing
Create tests for drag-and-drop reordering
Test keyboard navigation paths
Implement tests for modal dialogs
Create tests for multi-select operations
Test pagination and infinite scroll
Implement tests for file uploads
Create tests for status transitions

2.12.3 E2E Testing
Key Tasks:

Build end-to-end tests for complete workflows (create → approve → pay)
Test filter → export workflow
Create tests for multi-user scenarios (concurrent editing)
Implement tests for error recovery flows
Test navigation between views
Create tests for permission enforcement
Implement tests for mobile interactions
Build tests for data persistence
Create tests for real-time updates
Implement tests for large dataset handling


2.13 API Endpoints - Phase 2
2.13.1 Filter & Search Endpoints
GET /api/v1/projects/{projectId}/direct-costs/search
GET /api/v1/projects/{projectId}/direct-costs/filters/saved
POST /api/v1/projects/{projectId}/direct-costs/filters/saved
DELETE /api/v1/projects/{projectId}/direct-costs/filters/saved/{filterId}
2.13.2 Export Endpoints
POST /api/v1/projects/{projectId}/direct-costs/export/csv
POST /api/v1/projects/{projectId}/direct-costs/export/pdf
POST /api/v1/projects/{projectId}/direct-costs/export/email
2.13.3 Bulk Operation Endpoints
PUT /api/v1/projects/{projectId}/direct-costs/bulk/status
DELETE /api/v1/projects/{projectId}/direct-costs/bulk/delete
POST /api/v1/projects/{projectId}/direct-costs/bulk/email
2.13.4 Approval Workflow Endpoints
POST /api/v1/projects/{projectId}/direct-costs/{costId}/approve
POST /api/v1/projects/{projectId}/direct-costs/{costId}/reject
POST /api/v1/projects/{projectId}/direct-costs/{costId}/mark-paid
GET /api/v1/projects/{projectId}/direct-costs/approval-queue
2.13.5 Summary & Reporting Endpoints
GET /api/v1/projects/{projectId}/direct-costs/summary
GET /api/v1/projects/{projectId}/direct-costs/summary-by-cost-code
GET /api/v1/projects/{projectId}/direct-costs/reports/{reportType}
POST /api/v1/projects/{projectId}/direct-costs/reports/custom
2.13.6 File Management Endpoints
POST /api/v1/projects/{projectId}/direct-costs/{costId}/attachments
GET /api/v1/projects/{projectId}/direct-costs/{costId}/attachments
DELETE /api/v1/projects/{projectId}/direct-costs/{costId}/attachments/{attachmentId}
GET /api/v1/projects/{projectId}/direct-costs/{costId}/attachments/{attachmentId}/download

2.14 UI Components - Phase 2
2.14.1 Data Table Components
Advanced Table Component

Purpose: Main data display component with sorting, filtering, pagination
Features: Column management, row selection, inline editing, drag-drop reordering
Props: data, columns, onSort, onFilter, onRowClick, onBulkAction
States: loading, error, selected rows, sort configuration, filter configuration

Column Header Component

Purpose: Render individual column headers with sort/filter controls
Features: Sort indicator, filter icon, context menu, resize handles
Props: column definition, sort state, filter state
Events: onSort, onFilter, onResize, onContextMenu

Row Component

Purpose: Render individual table rows with selection checkbox
Features: Hover effects, inline edit mode, context menu, drag handle
Props: row data, columns, isSelected, isEditing
Events: onSelect, onEdit, onContextMenu, onDrag

Cell Component

Purpose: Render individual cells with support for different data types
Features: Format display (currency, date), inline editing, validation feedback
Props: value, cellType, isEditing
Events: onChange, onBlur, onKeyDown

2.14.2 Filter Components
Filter Panel Component

Purpose: Container for filter controls
Features: Add filter button, clear all button, active filter display
Props: filters, onAddFilter, onRemoveFilter, onClearAll
Events: onFiltersChange

Filter Input Component

Purpose: Individual filter control (dropdown, date range, numeric range, etc.)
Features: Filter type selection, value input, operator selection, remove button
Props: filter definition, value, operators
Events: onChange, onRemove

Date Range Picker Component

Purpose: Specialized input for date range filters
Features: Calendar UI, preset buttons, validation
Props: startDate, endDate, presets
Events: onChange

2.14.3 Modal & Dialog Components
Cost Detail Modal

Purpose: Full-size modal for viewing/editing cost details
Features: Tabs for details/attachments/history, form fields, action buttons
Props: cost data, isOpen, mode (view/edit)
Events: onClose, onSave, onApprove, onReject

Approval Modal

Purpose: Modal for approving costs with notes
Features: Cost summary, approval reason field, approval button
Props: cost data, isOpen
Events: onApprove, onCancel

Bulk Operation Modal

Purpose: Confirmation modal for bulk actions
Features: Item count, action description, confirmation button
Props: action type, item count, isOpen
Events: onConfirm, onCancel

Export Options Modal

Purpose: Modal for configuring export settings
Features: Format selection, column selection, date range, template selection
Props: availableColumns, formats, isOpen
Events: onExport, onCancel

2.14.4 Summary Components
Statistics Card Component

Purpose: Display key metric with title and value
Features: Icon, trend indicator, tooltip, click to filter
Props: title, value, icon, trend, onClick
Events: onClick

Summary Dashboard Component

Purpose: Container showing all summary statistics
Features: Multiple statistics cards, mini charts, recent items
Props: summary data, onFilter
Events: onCardClick, onChartClick

Cost Code Breakdown Component

Purpose: Table showing costs aggregated by cost code
Features: Collapsible rows, subtotals, percentage display
Props: costCodeData, onExpand, onFilter
Events: onRowClick, onSort

2.14.5 Form Components
Multi-step Form Wizard Component

Purpose: Break form into logical steps
Features: Step indicator, prev/next buttons, step validation
Props: steps, currentStep, onStepChange, onSubmit
Events: onNext, onPrevious, onSubmit

Attachment Upload Component

Purpose: File upload with drag-drop and preview
Features: Drag-drop zone, file preview, progress bar, validation
Props: maxFileSize, acceptedFormats, onUpload, isLoading
Events: onFileSelect, onRemove, onUpload

Auto-save Status Component

Purpose: Show auto-save status (saving, saved, error)
Features: Status indicator, timestamp, retry button
Props: status, lastSavedTime, onRetry
Events: onRetry


2.15 Key UI/UX Considerations
Micro-interactions

Button hover states with subtle animations
Form field focus states with color change
Loading spinners with smooth rotation
Toast notifications sliding in from edge
Row hover highlighting for better affordance
Smooth transitions when filtering/sorting results

Empty States

Placeholder messaging when no costs exist
Illustration or icon for visual interest
Call-to-action button (Create Direct Cost)
Helpful message explaining how to populate data

Dark Mode Support

Theme toggle in settings
Color scheme variables for light/dark modes
Proper contrast for both modes
Icon adjustments for dark backgrounds

Keyboard Shortcuts

Ctrl+K or Cmd+K to open search
Ctrl+N or Cmd+N to create new cost
Escape to close modals/dropdowns
Ctrl+S or Cmd+S to save form
Ctrl+P or Cmd+P to print/export
Arrow keys for table navigation


2.16 Summary
Phase 2 transforms the basic Phase 1 implementation into a sophisticated, production-ready interface with:

Advanced interactivity through inline editing, drag-drop, multi-select
Powerful data management via filtering, searching, sorting, pagination
Enterprise export capabilities supporting CSV, PDF, and email workflows
Rich visualizations showing summaries, trends, and cost code breakdowns
Approval workflow with status transitions and notifications
Mobile responsiveness supporting all device sizes
Accessibility standards compliance for inclusive design
Comprehensive error handling with user-friendly feedback
Performance optimization for handling large datasets
Complete test coverage for reliability

This phase represents 70-80% of the user-facing functionality and provides the foundation for Phase 3 (Advanced Analytics & Integrations).