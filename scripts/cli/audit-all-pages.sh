#!/bin/bash

# Comprehensive page layout audit
# Generates detailed tracking document

OUTPUT_FILE="documentation/docs/archive/2026-06-22-docs-migration/development/PAGE-MIGRATION-TRACKER.md"

cat > "$OUTPUT_FILE" << 'HEADER'
# Page Layout Migration Tracker

**Generated:** $(date +%Y-%m-%d\ %H:%M:%S)
**Total Pages:** $(find frontend/src/app -name "page.tsx" | wc -l | xargs)

## Status Summary

HEADER

# Count pages by layout type
echo "| Layout Type | Count | Status |" >> "$OUTPUT_FILE"
echo "|-------------|-------|--------|" >> "$OUTPUT_FILE"

table_count=$(grep -r "import.*TableLayout" frontend/src/app --include="page.tsx" | wc -l | xargs)
form_count=$(grep -r "import.*FormLayout" frontend/src/app --include="page.tsx" | wc -l | xargs)
dash_count=$(grep -r "import.*DashboardLayout" frontend/src/app --include="page.tsx" | wc -l | xargs)
exec_count=$(grep -r "import.*ExecutiveLayout" frontend/src/app --include="page.tsx" | wc -l | xargs)
total_pages=$(find frontend/src/app -name "page.tsx" | wc -l | xargs)
no_layout=$((total_pages - table_count - form_count - dash_count - exec_count))

echo "| TableLayout | $table_count | ✅ |" >> "$OUTPUT_FILE"
echo "| FormLayout | $form_count | ✅ |" >> "$OUTPUT_FILE"
echo "| DashboardLayout | $dash_count | ✅ |" >> "$OUTPUT_FILE"
echo "| ExecutiveLayout | $exec_count | ✅ |" >> "$OUTPUT_FILE"
echo "| **NO LAYOUT** | **$no_layout** | ❌ **NEEDS MIGRATION** |" >> "$OUTPUT_FILE"
echo "| **TOTAL** | **$total_pages** | - |" >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'SECTION1'

---

## Pages Needing Migration

### Category: Table Pages (High Priority)

SECTION1

# Table pages without layout
echo "| Page | Path | Expected Layout | Status |" >> "$OUTPUT_FILE"
echo "|------|------|-----------------|--------|" >> "$OUTPUT_FILE"

for file in frontend/src/app/\(tables\)/*/page.tsx; do
    if [ -f "$file" ]; then
        page_name=$(basename $(dirname "$file"))
        has_layout=$(grep -q "import.*Layout" "$file" && echo "✅" || echo "❌")
        if [ "$has_layout" = "❌" ]; then
            echo "| $page_name | \`$file\` | TableLayout | ❌ TODO |" >> "$OUTPUT_FILE"
        fi
    fi
done

cat >> "$OUTPUT_FILE" << 'SECTION2'

### Category: Project Tool Pages (High Priority)

| Page | Path | Expected Layout | Status |
|------|------|-----------------|--------|
SECTION2

# Project pages
for dir in budget commitments home invoices drawings contracts emails setup admin daily-log reporting schedule tasks specifications; do
    file="frontend/src/app/[projectId]/$dir/page.tsx"
    if [ -f "$file" ]; then
        has_layout=$(grep -q "import.*Layout" "$file" && echo "✅" || echo "❌")
        current_layout=$(grep -o "TableLayout\|FormLayout\|DashboardLayout" "$file" | head -1)
        if [ "$has_layout" = "❌" ]; then
            expected="TableLayout"
            echo "| $dir | \`$file\` | $expected | ❌ TODO |" >> "$OUTPUT_FILE"
        fi
    fi
done

cat >> "$OUTPUT_FILE" << 'SECTION3'

### Category: Form Pages (Should be complete)

| Page | Path | Expected Layout | Status |
|------|------|-----------------|--------|
SECTION3

# Form pages
for file in frontend/src/app/\(forms\)/*/page.tsx; do
    if [ -f "$file" ]; then
        page_name=$(basename $(dirname "$file"))
        has_layout=$(grep -q "FormLayout" "$file" && echo "✅" || echo "❌")
        echo "| $page_name | \`$file\` | FormLayout | $has_layout |" >> "$OUTPUT_FILE"
    fi
done

cat >> "$OUTPUT_FILE" << 'SECTION4'

### Category: New/Edit Pages (Forms)

| Page | Path | Expected Layout | Status |
|------|------|-----------------|--------|
SECTION4

# New/edit pages under projectId
for file in frontend/src/app/\[projectId\]/*/new/page.tsx frontend/src/app/\[projectId\]/*/*/page.tsx; do
    if [ -f "$file" ]; then
        rel_path="${file#frontend/src/app/}"
        has_layout=$(grep -q "FormLayout" "$file" && echo "✅" || echo "❌")
        if [ "$has_layout" = "❌" ]; then
            echo "| $(basename $(dirname $file)) | \`$file\` | FormLayout | ❌ TODO |" >> "$OUTPUT_FILE"
        fi
    fi
done

cat >> "$OUTPUT_FILE" << 'SECTION5'

### Category: Other Pages

| Page | Path | Current Layout | Status |
|------|------|----------------|--------|
SECTION5

# All other pages
for file in $(find frontend/src/app -name "page.tsx" -type f); do
    # Skip already categorized
    if [[ "$file" == *"(tables)"* ]] || [[ "$file" == *"(forms)"* ]] || [[ "$file" == *"[projectId]"* ]]; then
        continue
    fi

    has_layout=$(grep -q "import.*Layout" "$file" && echo "✅" || echo "❌")
    current_layout=$(grep -o "TableLayout\|FormLayout\|DashboardLayout\|ExecutiveLayout" "$file" | head -1)
    current_layout=${current_layout:-"NONE"}

    if [ "$has_layout" = "❌" ]; then
        rel_path="${file#frontend/src/app/}"
        echo "| ${rel_path%/page.tsx} | \`$file\` | $current_layout | ❌ TODO |" >> "$OUTPUT_FILE"
    fi
done

cat >> "$OUTPUT_FILE" << 'FOOTER'

---

## Migration Process

Each page migration requires:

1. Import the correct layout component
2. Import PageHeader component
3. Wrap content in layout
4. Add PageHeader with proper breadcrumbs
5. Remove any custom container/padding
6. Verify in browser
7. Mark as complete ✅

## Layout Guide

- **TableLayout**: Data tables, list views, index pages
- **FormLayout**: Create/edit forms, settings pages
- **DashboardLayout**: Dashboard/home pages with widgets
- **ExecutiveLayout**: Executive summary pages

FOOTER

echo "Audit complete: $OUTPUT_FILE"
