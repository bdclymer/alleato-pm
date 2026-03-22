---
title: README
description: README documentation
---

# Change Orders Documentation - Standardized Structure

This directory contains the complete documentation for the Change Orders feature following the standardized 6-file structure defined in `/PLANS/TEMPLATE-STRUCTURE.md`.

## File Organization

### 📋 Core Documentation Files

1. **TASKS-ChangeOrders.md** - Complete task checklist with 9 implementation phases (15% complete)
2. **PLANS-ChangeOrders.md** - Comprehensive implementation plan with current status and file paths
3. **SCHEMA-ChangeOrders.md** - Complete database schema with 6 core tables and migrations
4. **FORMS-ChangeOrders.md** - Detailed form specifications with 8 forms and validation rules
5. **API_ENDPOINTS-ChangeOrders.md** - Complete API documentation with 25+ endpoints
6. **UI-ChangeOrders.md** - Component specifications with responsive design and accessibility

### 📁 Crawl

- **`.crawl/`** - Contains files:
  - `pages/` (original comprehensive specs)
  - `reports/` (Procore analysis data with 46 pages of reference material)

## Key Features from Procore Analysis

Based on comprehensive analysis of Procore's 46-page change orders system:

1. **Package-Based Organization** - Change orders grouped into packages (PCO-001, PCO-002, etc.)
2. **Multi-Contract Support** - Prime contracts vs Commitments with separate workflows
3. **Multi-Tier Approvals** - Configurable 1-4 tier approval hierarchy
4. **Complete Audit Trail** - Full change history and review tracking
5. **Rich Line Items** - Detailed financial breakdown with budget code integration
6. **Document Management** - File attachments with categorization
7. **Comprehensive Reporting** - Unexecuted, overdue, and analytics reports