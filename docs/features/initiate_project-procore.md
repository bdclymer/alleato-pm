# Initiate Project

# **initiate_project.md (copy/paste this exact content)**

- complete supabase schema
- component development list
- pages to develop list

The ultimate goal is to develop a complete clone of the Procore app and incorporate a lot more AI. To start I want to begin with the financial components of Procore.

In order to do this its extremely important that You create a very detailed and accurate database schema for all of the tables that need to be created in Superbase. We need a list of all the tables and then each table will need a list of the columns included within that table. The most important part is how all the tables relate to each other, so it needs to clearly be identified which our relational fields.

I started listing the pages included in the financialcomponents below but this may not be all of them.

As you create the exact plan, one of the tasks probably should be to use a web scraping tool such as crawl for AI to get a completely accurate site map so we know nothing is missed.

The schema must support every piece of real functionality represented in these Procore financial pages.

In addition to the schema, there also needs to be a development plan that lists every component and page that needs to be created.

Include strategies for creating the table pages and form pages in the most efficient manner.

Review the outputs from the procore capture script, and add tasks to make changes to the script if additional content is needed./Users/meganharrison/Documents/github/alleato-procore/scripts/procore-screenshot-capture

- Budget
- Budget Details
- Budgeting Report
- Change Events
- Change Orders
- Change Orders – Commitments
- Change Orders – Prime Contract
- Commitment Items
- Commitments
- Committed Costs
- Direct Costs
- Form – Create Billing Period
- Form – Create Change Event
- Form – Create Commitment
- Form – Create Direct Cost
- Form – Create Prime Contract
- Invoicing
- Prime Contracts

My end goals:

1. I want the Plans Doc to tell Codex CLI how to use these files as “source evidence” to extract entities, fields, and relationships.
2. I want a complete, correct Supabase schema that is logically equivalent to the actual Procore financial backend.
3. I want the Plans Doc to break down the steps for:

   - Understanding the UI evidence (DOM + screenshots).
   - Inferring all tables, columns, enums, relationships, constraints, and views.
   - Designing normalized tables: budgets, budget line items, commitments, commitment items, prime contracts, prime contract line items, all change event and change order tables, invoicing, billing periods, direct costs, cost codes, vendors, and all relational glue.
   - Identifying derived/reporting views (like Budgeting Report or Committed Cost Summaries).
   - Writing migrations and ensuring foreign keys are consistent and designed intelligently.
4. I want the Plans Doc to explicitly map page → underlying schema entities.
   The PM should build a traceable connection between UI pages and database structures.
5. I want downstream developers to be able to build every page, form, and financial workflow using this schema alone.
6. The Plans Doc should end with a development implementation plan but NOT implement any code at this stage.
7. The result must be something a coding agent can turn into full migrations and an actual working schema.

Additional constraints and details:

- I want the Plans Doc anchored in the Codex cookbook methodology.
- I want it broken down into a structured multi-section plan exactly how PLANS.md requires.
- The Project Manager should reference the DOM and screenshots as the authoritative truth for discovering:

  - Entities
  - Fields
  - Relationships
  - Derived values
  - Edge cases
- The plan should define each module:

  - Budgeting
  - Contracting (Prime + Commitments)
  - Change Management (Change Events → Change Orders)
  - Cost Tracking (Committed, Direct)
  - Billing and Invoicing (Billing Periods + Invoices)
- It must include a “Plan of Work” that is concrete, step-by-step, showing how Codex CLI should inspect the files and generate the schema.
- It must explain how to build views for Budget Summary, Forecasts, Committed Cost Reports.
- It must cover multi-entity cascading structures, like:

  - A Change Event → multiple Change Event Items → multiple downstream Change Orders → affecting both contracts.
- It must include enough clarity so a dev could build front-end UI pages and API layers.

Success looks like:

- The Plans Doc helps Codex generate an accurate database schema and all necessary migrations.
- The schema supports real-world construction finance workflows.
- The developer experience is clean: one can instantly understand the database, build endpoints, and render each page.
- No missing tables, no circular relationships, thoughtful normalization, meaningful indexes, and clear naming conventions.
- Everything is grounded in the scraped DOM + screenshots, not guesses.

This is the full scope I want the Project Manager to turn into PLANS_DOC.md.

---

If you want, I can also produce an expanded or more chaotic “stream of consciousness” version — but the above is clean, direct, and optimized for the PM agent to translate into a perfect Plans Doc.

# TO DO

## /company/home

<http://localhost:3001/company/home>

![Create Project reference](frontend/public/SCR-20251207-mrxg.png)

### Checklist

- [x] <http://localhost:3002/company/home> when you click on a project it needs to link to the project home page: /Users/meganharrison/Documents/github/alleato-procore/frontend/app/company/home/[projectId]/home
- [x] Sidebar background white  
- [ ] Prevent **entire page** from horizontally scrolling. Only the **project table** should allow horizontal scrolling when necessary.
- [ ]  the first colomn should be frozen so it stays in place when horizontally scrolled.
- [x] Project dropdown functional  
- [x] Table uses live Supabase data from projects table  
- [x] Make column headers clickable for sorting
- [x] Export button working  
- [x] Create Project links to /create-project  
- [x] Search functional  
- [x] Filters functional  
- [x] Status toggle functional  
- [x] View modes working  
- [x] Table only scrolls horizontally  
- [x] No layout breaking at any screen width
- [ ] Test and confirm that Create project form adds a new project to supabase
- [ ] Current tab is extending past page width

## /company/home/[projectId]

- [ ] Title dynamic (job number project name) instead of placeholder 24-104 - Goodwill Bart

## Top Site Header

- [ ] Project tools dropdown - nav links routed
- [ ] Select project dropdown - nav links
- [ ] Chat icon
- [ ] Search
- [ ] Notification
- [ ] Avatar - function like the avatar at the bottom of the sidebar

## Improve Procore Screenshot Capture

- [ ] First use a web scraper to get a full sitemap And then provide this to the Procore capture script so it knows exactly which pages need to be crawled and screenshot saved.

- Supabase auth
- Allow subcontractors to submit commitments, change orders, ect
