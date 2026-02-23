---
title: TEMPLATE STRUCTURE
description: TEMPLATE STRUCTURE documentation
---

# Standardized Tool Documentation Structure

## Overview

This template defines the standardized structure for documenting all tools/features in Alleato PM. Each tool should have exactly 6 documentation files following this pattern to ensure consistency and prevent redundancy.

## File Structure Template

```text
PLANS/[tool-name]/
├── TASKS-[Tool].md          # Pure checklist only
├── PLANS-[Tool].md          # Implementation plan + current status + file paths
├── SCHEMA-[Tool].md         # Database design
├── FORMS-[Tool].md          # Form specifications
├── API_ENDPOINTS-[Tool].md  # API documentation
└── UI-[Tool].md             # Component breakdown
```markdown
## File Specifications

### 1. TASKS-[Tool].md

**Purpose**: Pure task checklist with completion status
**Content**:

- Phase-based task breakdown
- Clear ✅ ❌ ⏳ status indicators
- Implementation phases (1-9 typical)
- Success criteria checklist
- Current completion percentage

**Template Structure**:

```markdown
# [Tool] Implementation - Complete Task Checklist

## Phase 1: Database Foundation
- [ ] Task 1
- [ ] Task 2

## Phase 2: Backend Services
- [ ] Task 1
- [ ] Task 2

...

## Current Status: X% Complete
```markdown
### 2. PRP-[Tool].md
**Purpose**: Comprehensive implementation plan with current status and file paths
**Content**:
- Executive summary with current status
- Project scope (in/out of scope)
- Architecture overview
- Current implementation status (% complete)
- Detailed implementation phases
- File structure & deliverables
- Production readiness assessment
- Technical implementation details
- User experience flows
- Testing strategy
- Risk management

**Template Structure**:
```markdown
# PRP - [Tool]

## Executive Summary
[Brief description + Current Status: X% Complete]

## Current Implementation Status (X% Complete)
### ✅ COMPLETED PHASES
### ⚠️ REMAINING WORK

## Implementation Phases Detail
[Detailed phase breakdown]

## File Structure & Deliverables
[Specific file paths and completion status]

## Production Readiness Assessment
[Quality metrics and verification status]
```

### 3. SCHEMA-[Tool].md

**Purpose**: Complete database schema documentation
**Content**:

- Table overview and relationships
- Full SQL CREATE statements
- Indexes and constraints
- RLS policies
- Data migration scripts
- Views and helper functions
- Performance considerations

**Template Structure**:

```markdown
# [Tool] Database Schema

## Database Tables Overview
[List of tables and relationships]

## Table Definitions
### 1. table_name
[Full SQL with indexes and policies]

## Data Migration Scripts
[Migration from existing structure]

## Views and Helper Functions
[Useful database utilities]
```markdown
### 4. FORMS-[Tool].md
**Purpose**: Detailed form specifications and validation
**Content**:
- Form list with purposes
- Field specifications with validation rules
- Form layouts (ASCII art or description)
- Conditional logic
- Error handling patterns
- Accessibility requirements

**Template Structure**:
```markdown
# [Tool] Forms Specification

## Form List
1. FormName - Purpose
2. FormName - Purpose

## Form Specifications
### 1. FormName
#### Form Fields
| Field | Type | Required | Validation | Description |

#### Form Layout
[ASCII art or detailed description]
```markdown
### 5. API_ENDPOINTS-[Tool].md

**Purpose**: Complete API documentation
**Content**:

- Endpoint list with methods
- Request/response specifications
- Authentication requirements
- Error codes and handling
- Rate limiting
- Example requests/responses

**Template Structure**:

```markdown
# [Tool] API Endpoints Specification

## Endpoint Overview
[List of all endpoints]

## Detailed Specifications
### 1. Endpoint Name
**Method**: GET/POST/etc
**URL**: /api/path
**Purpose**: Description

#### Request
[Request format]

#### Response
[Response format]
```markdown
### 6. UI-[Tool].md
**Purpose**: Component breakdown and UI specifications
**Content**:
- Component hierarchy
- Layout specifications
- Responsive design details
- State management patterns
- Screenshot references
- Accessibility features
- Performance considerations

**Template Structure**:
```markdown
# [Tool] UI Components Specification

## Component Specifications
### 1. ComponentName
**File**: path/to/component
**Purpose**: Description
**Screenshot**: path/to/screenshot

#### Props Interface
[TypeScript interface]

#### Layout Structure
[ASCII art or description]
```

## Guidelines for Content

### Content Organization

1. **Single Source of Truth**: Each type of information has ONE file location
2. **No Redundancy**: Don't repeat information across files
3. **Cross-References**: Use links between files when needed
4. **Specific Paths**: Always include exact file paths and line numbers
5. **Current Status**: Always update completion status

### Writing Style

- **Concise but complete**: Include all necessary details
- **Actionable**: Tasks should be specific and measurable
- **Technical accuracy**: Include exact code snippets and paths
- **Future-proof**: Write for someone implementing months later

### Status Indicators

- ✅ **Complete**: Fully implemented and tested
- 🚧 **In Progress**: Currently being worked on
- ⏳ **Not Started**: Planned but not yet begun
- ⚠️ **Blocked**: Cannot proceed due to dependencies
- ❌ **Cancelled**: No longer planned

## Benefits of This Structure

### For Claude Code

- **Predictable structure** across all tools
- **No confusion** about where to find information
- **Complete context** in logical places
- **Easy to maintain** and update

### For Developers

- **Clear roadmap** of what's implemented vs. planned
- **Exact file paths** for quick navigation
- **Complete specifications** for implementation
- **No duplicate documentation** to maintain

### For Project Management

- **Clear progress tracking** with completion percentages
- **Risk identification** through status indicators
- **Resource planning** with detailed task breakdowns
- **Quality assurance** with verification checklists

## Implementation Guidelines

### Creating New Tool Documentation

1. Copy this template structure
2. Replace `[Tool]` with actual tool name (e.g., Budget, Contracts)
3. Fill out each file according to specifications
4. Ensure no redundant information between files
5. Update completion status regularly

### Maintaining Existing Documentation

1. Update completion percentages as work progresses
2. Move tasks from one status to another
3. Add new file paths to PLANS-[Tool].md
4. Keep all files synchronized with actual implementation

### Quality Checklist

- [ ] All 6 files exist and follow naming convention
- [ ] No redundant information across files
- [ ] All file paths are accurate and current
- [ ] Completion percentages reflect actual status
- [ ] Cross-references work correctly
- [ ] Information is technically accurate

## Examples

## Migration Strategy

For existing tools that don't follow this structure:

1. **Audit existing documentation** - identify what exists
2. **Categorize content** - sort into the 6 file types
3. **Eliminate duplicates** - consolidate redundant information
4. **Fill gaps** - identify missing documentation
5. **Standardize format** - apply consistent structure
6. **Verify accuracy** - ensure all paths and status are current

This standardized structure ensures Claude Code can efficiently work with any tool documentation and prevents the confusion that comes from inconsistent or redundant documentation.
