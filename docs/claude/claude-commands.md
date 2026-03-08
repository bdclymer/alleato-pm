# Claude Slash Commands Reference

This document provides a quick reference for all available slash commands in the Alleato-Procore project.

## Overview

Slash commands are special directives that invoke pre-configured workflows and specialized agents. They provide quick access to common development tasks and automated processes.

**Location:** `.claude/commands/`

---

## Available Commands

### `/feature-crawl` - Procore Feature Crawler

**Purpose:** Automated comprehensive crawling and analysis of Procore features

**Usage:**

```bash
/feature-crawl <feature-name> <start-url> [project-id]
```text
**Examples:**
```bash
/feature-crawl submittals https://us02.procore.com/562949954728542/project/submittals
/feature-crawl rfis https://us02.procore.com/562949954728542/project/rfis
/feature-crawl punch-list https://us02.procore.com/562949954728542/project/punch_list
```typescript
**What it does:**

- Generates custom Playwright crawl script for the feature
- Creates standardized output directory structure
- Captures 40-50+ screenshots with full-page renders
- Extracts DOM snapshots for all pages
- Analyzes metadata (links, buttons, tables, forms)
- Generates comprehensive reports (sitemap, link graph, status)
- Provides implementation insights (database schema, API endpoints, components)

**Output Location:**

```typescript
documentation/*project-mgmt/in-progress/<feature>/crawl-<feature>/
```

**Documentation:**

- Definition: `.claude/commands/feature-crawl.md`
- Subagent: `.agents/agents/feature-crawler.md`
- Quick Start Guide: `scripts/screenshot-capture/FEATURE-CRAWL-GUIDE.md`
- Implementation Summary: `.claude/feature-crawl-implementation-summary.md`

---

### `/designer` - Frontend Designer

**Purpose:** Create distinctive, production-grade frontend interfaces with high design quality

**Usage:**

```bash
/designer [optional design description]
```diff
**What it does:**
- Guides creation of distinctive, production-grade frontend interfaces
- Avoids generic "AI slop" aesthetics
- Implements real working code with exceptional attention to aesthetic details
- Makes creative, unexpected design choices

**Key Features:**
- Bold aesthetic direction selection
- Distinctive typography choices
- Cohesive color themes with CSS variables
- Motion and micro-interactions
- Unexpected layouts and spatial composition
- Creative backgrounds and visual details

**Documentation:**
- Definition: `.claude/commands/designer.md`

---

### `/verify-task` - Comprehensive Task Verification

**Purpose:** Launch specialized verification agent to review completed work against original requirements

**Usage:**
```bash
/verify-task [original_task_description] [implementation_summary_path]
```diff
**What it does:**

1. **Requirement Analysis** - Maps original requirements to delivered components
2. **Code Review** - Evaluates implementation quality and completeness
3. **Testing Assessment** - Reviews all testing aspects (unit, integration, E2E, browser)
4. **Quality Gates** - Verifies standards compliance and best practices
5. **Risk Assessment** - Identifies production readiness and potential issues

**Output:**

- Executive summary of verification status
- Detailed requirement mapping
- Testing coverage analysis
- Quality assessment scores
- Risk analysis and mitigation recommendations
- Go/No-go recommendation with conditions

**Documentation:**

- Definition: `.claude/commands/verify-task.md`

---

### `/verify` - Verify Current Task

**Purpose:** Quick verification of the current task against requirements

**Usage:**

```bash
/verify
```diff
**What it does:**
- Verifies current task completion
- Checks against requirements
- Ensures quality standards are met

**Documentation:**
- Definition: `.claude/commands/verify.md`

---

### `/verify-layout` - Verify Layout Implementation

**Purpose:** Verify layout implementation matches design specifications

**Usage:**
```bash
/verify-layout
```

**What it does:**

- Checks layout implementation
- Verifies responsive design
- Ensures design consistency

**Documentation:**

- Definition: `.claude/commands/verify-layout.md`

---

### `/complete-task` - Complete Task with Verification

**Purpose:** Mark task as complete with full verification

**Usage:**

```bash
/complete-task
```diff
**What it does:**
- Runs final verification
- Updates task status
- Logs completion evidence

**Documentation:**
- Definition: `.claude/commands/complete-task.md`

---

### `/doc-check` - Documentation Standards Check

**Purpose:** Verify documentation follows project standards before creation

**Usage:**
```bash
/doc-check
```diff
**What it does:**

- Reviews documentation placement rules
- Checks against `documentation/DOCUMENTATION-STANDARDS.md`
- Prevents files in incorrect locations
- Validates documentation structure

**Critical Rules:**

- Never place files in `/documentation` root (except meta-docs)
- Use proper subdirectories: `database/`, `development/`, `plans/`, etc.
- Run validation: `node scripts/docs/validate-doc-structure.cjs`

**Documentation:**

- Definition: `.claude/commands/doc-check.md`

---

### Design System Commands

#### `/component` - Create Component (Design System Enforced)

**Purpose:** Create new UI components with design system enforcement

**Usage:**

```bash
/component
```diff
**Documentation:**
- Definition: `.claude/commands/component.md`

---

#### `/design-check` - Design System Check (Quick)

**Purpose:** Quick design system compliance check

**Usage:**
```bash
/design-check
```

**Documentation:**

- Definition: `.claude/commands/design-check.md`

---

#### `/design-audit` - Design System Audit

**Purpose:** Comprehensive design system audit

**Usage:**

```bash
/design-audit
```diff
**Documentation:**
- Definition: `.claude/commands/design-audit.md`

---

#### `/design-verify` - Design System Verify

**Purpose:** Verify design system compliance

**Usage:**
```bash
/design-verify
```diff
**Documentation:**

- Definition: `.claude/commands/design-verify.md`

---

#### `/design-fix` - Design System Fix

**Purpose:** Fix design system violations

**Usage:**

```bash
/design-fix
```diff
**Documentation:**
- Definition: `.claude/commands/design-fix.md`

---

#### `/design-report` - Design System Report

**Purpose:** Generate design system compliance report

**Usage:**
```bash
/design-report
```

**Documentation:**

- Definition: `.claude/commands/design-report.md`

---

#### `/design-fix-loop` - Design System Fix Loop (Autonomous)

**Purpose:** Autonomous loop to fix all design system violations

**Usage:**

```bash
/design-fix-loop
```yaml
**Documentation:**
- Definition: `.claude/commands/design-fix-loop.md`

---

## Command Categories

### 🔍 Analysis & Crawling
- `/feature-crawl` - Comprehensive Procore feature analysis

### 🎨 Design & UI
- `/designer` - Frontend interface creation
- `/component` - Component creation
- `/design-check` - Quick design check
- `/design-audit` - Full design audit
- `/design-verify` - Design verification
- `/design-fix` - Fix design violations
- `/design-report` - Design compliance report
- `/design-fix-loop` - Autonomous design fixing

### ✅ Verification & Quality
- `/verify-task` - Comprehensive task verification
- `/verify` - Quick task verification
- `/verify-layout` - Layout verification
- `/complete-task` - Task completion

### 📝 Documentation
- `/doc-check` - Documentation standards check

---

## Creating New Slash Commands

To create a new slash command:

1. **Create command file** in `.claude/commands/<command-name>.md`

2. **Add frontmatter:**
```yaml
---
description: Brief description of what the command does
argument-hint: "<required-arg> [optional-arg]"
---
```text
1. **Write command instructions:**

```markdown
# Command Name

## What It Does
[Description]

## Usage
[Examples]

## Agent Instructions
[Detailed instructions for Claude]
```text
4. **Update this index:**
Add entry to this file with description and examples

5. **Test the command:**
```bash
/<command-name> [args]
```

---

## Related Documentation

- **Subagents Index:** `documentation/claude/SUBAGENTS-INDEX.md`
- **Main Documentation Index:** `documentation/INDEX-DOCS.md`
- **Project Instructions:** `CLAUDE.md`

---

**Last Updated:** 2026-01-10
**Total Commands:** 15
**Maintained by:** Alleato Development Team
