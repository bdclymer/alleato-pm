# Procore Direct Costs Crawler

This crawler captures comprehensive screenshots and data from Procore's Direct Costs functionality.

## Purpose

To document and analyze the Direct Costs feature in Procore, including:
- UI layout and components
- Data structures and table formats
- Available actions and workflows
- Export and reporting capabilities
- Integration points with budget and vendors

## Prerequisites

- Node.js installed
- Playwright browser automation library
- Valid Procore credentials (already configured in the script)

## Running the Crawler

From the `scripts/screenshot-capture` directory:

```bash
cd /Users/meganharrison/Documents/github/alleato-procore/scripts/screenshot-capture
node scripts/crawl-direct-costs-comprehensive.js
```

## What It Does

1. **Logs into Procore** using configured credentials
2. **Navigates to the starting URL**: https://us02.procore.com/562949954728542/project/direct_costs
3. **Captures each page**:
   - Full-page screenshot (PNG)
   - Complete DOM structure (HTML)
   - Metadata (JSON) including:
     - Links found
     - Clickable elements
     - Dropdown menus
     - Table structures
     - UI components
4. **Explores dropdowns and menus**:
   - Clicks on "More" menus, export buttons, etc.
   - Captures the opened state
   - Records menu items
5. **Follows links** to related pages (up to 50 pages total)
6. **Generates reports**:
   - Sitemap table (Markdown)
   - Detailed report (JSON)
   - Link graph (JSON)

## Output Structure

```
procore-direct-costs-crawl/
├── pages/
│   ├── direct_costs/
│   │   ├── screenshot.png
│   │   ├── dom.html
│   │   └── metadata.json
│   ├── direct_costs_dropdown_0/
│   │   ├── screenshot.png
│   │   └── metadata.json
│   └── [more pages...]
└── reports/
    ├── sitemap-table.md
    ├── detailed-report.json
    └── link-graph.json
```

## Configuration

Key settings in the script:

- `OUTPUT_DIR`: `./procore-direct-costs-crawl`
- `START_URL`: https://us02.procore.com/562949954728542/project/direct_costs
- `WAIT_TIME`: 2000ms (2 seconds between actions)
- `maxPages`: 50 (safety limit to prevent infinite crawling)

## Safety Features

- Maximum page limit (50 pages)
- Visited URL tracking (no duplicate crawling)
- Error recovery (continues on failures)
- Timeout protection (60-second maximum per page)

## Credentials

The script uses hardcoded Procore credentials:
- Email: bclymer@alleatogroup.com
- Password: [configured in script]

**Note:** These credentials are for the development/testing Procore environment.

## After Crawling

1. Review the generated screenshots in `pages/`
2. Check the reports in `reports/`
3. Update `DIRECT-COSTS-CRAWL-STATUS.md` with findings
4. Use the captured data to inform feature implementation

## Using the Data

### For UI Development
- Reference screenshots for layout and styling
- Identify components needed (tables, modals, dropdowns)
- Understand user workflows and interactions

### For Data Modeling
- Review table structures in metadata JSON files
- Identify required database fields
- Understand relationships between entities

### For Feature Planning
- Analyze available actions and workflows
- Document export and reporting capabilities
- Map integration points with other systems

## Troubleshooting

### Browser doesn't open
- Check that Playwright browsers are installed: `npx playwright install`

### Login fails
- Verify credentials are correct
- Check if 2FA is required
- Ensure network access to Procore

### Pages timeout
- Increase `WAIT_TIME` or page timeout values
- Check internet connection
- Verify Procore service is available

### Too many/few pages captured
- Adjust `maxPages` limit
- Review URL filtering logic in `extractLinks()`
- Check if authentication was successful

## Related Crawlers

- Change Orders: `crawl-change-orders-comprehensive.js`
- Commitments: `crawl-commitments-comprehensive.js`
- Budget: `crawl-budget-comprehensive.js`
- Prime Contracts: `crawl-prime-contracts-comprehensive.js`

## Next Steps

After running the crawler:

1. Analyze the captured pages
2. Document the Direct Costs feature structure
3. Create database schema based on findings
4. Design API endpoints
5. Build frontend components
6. Implement integrations with budget system


# Direct Costs README.md

## Procore Documentation Links

- Direct Costs Tutorials	https://support.procore.com/products/online/user-guide/project-level/direct-costs#chapt2
- Create a Direct Cost	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/create-a-direct-cost
- Configure Advanced Settings: Direct Costs	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/configure-advanced-settings-direct-costs
- Enable the Direct Costs Tool	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/enable-the-direct-costs-tool
- Switch Between Views in the Direct Costs Tool	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/switch-between-views-in-the-direct-costs-tool
- Search for and Apply Filters to Direct Costs	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/search-for-and-apply-filters-to-direct-costs
- Import Direct Costs	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/import-direct-costs
- Export Direct Costs to CSV or PDF	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/export-direct-costs-to-csv-or-pdf
- Email a Direct Cost	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/email-a-direct-cost
- Edit a Direct Cost	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/edit-a-direct-cost
- Delete a Direct Cost	https://support.procore.com/products/online/user-guide/project-level/direct-costs/tutorials/delete-a-direct-cost



## TASK

Read documentation/*project-mgmt/in-progress/DIRECT-COSTS/CLAUDE.md for workflow instructions.

The TASKS.md and PLANS.md files have already been created (Phase 2 complete).

PHASE 3 - CODEBASE ANALYSIS:
You MUST spawn an Explore agent to analyze the codebase. Do NOT do this analysis yourself.

Use this exact Task call:
Task({
  subagent_type: "Explore",
  prompt: "Analyze codebase against TASKS.md. Read documentation/*project-mgmt/in-progress/commitments/TASKS.md. For each item, check if code exists. Update TASKS.md marking [x] for complete items. Check: frontend/src/app/[projectId]/commitments/, frontend/src/components/commitments/, frontend/src/hooks/use-commitments.ts, frontend/src/config/tables/commitments.config.tsx, frontend/tests/e2e/commitment*.spec.ts"
})

After the Explore agent returns, continue through Phases 4-7 following CLAUDE.md exactly.

MANDATORY: Spawn sub-agents for each phase. Do NOT do implementation/testing/verification yourself.