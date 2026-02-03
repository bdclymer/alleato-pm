# Procore Module: submittals

## Purpose

This directory contains **crawler output and reports** for the Procore **submittals** tool.

This module is part of a larger system designed to:

- Observe Procore functionality
- Extract UI and behavioral intelligence
- Ingest structured data into Supabase
- Enable accurate rebuilding and parity analysis

---

## Directory Structure

```text
submittals/
├── screenshots/              # One screenshot per page, named to match
│   ├── <page-name>.png
│   └── ...
├── dom/                      # DOM snapshots + metadata per page
│   └── <page-name>/
│       ├── dom.html
│       └── metadata.json
├── reports/
│   ├── sitemap-table.md
│   ├── detailed-report.json
│   └── link-graph.json
├── README.md
```

---

## How This Module Is Used

1. A Playwright crawler targets the Procore **submittals** tool
2. Screenshots are saved to `screenshots/` (one .png per page, named to match the page)
3. DOM snapshots and metadata are saved to `dom/<page-name>/`
4. Reports are generated into `reports/`
5. The ETL script ingests this data into Supabase using:

   ```bash
   PROCORE_MODULE=submittals node etl/etl_ingest_procore_crawl.js
   ```

---

## Notes

- This folder represents **explicit intent** to crawl and model this Procore tool
- Structure should not be modified by ETL scripts
- Add tool-specific notes here as discoveries are made
