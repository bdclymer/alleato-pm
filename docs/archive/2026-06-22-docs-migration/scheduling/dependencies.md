---
title: Sub-Agents
description: Complete catalog of all available sub-agents with ratings and usage guidance.
keywords: ["agents", "sub-agents", "automation", "tools"]
---

**Start implementing a feature with a single command:**

```bash
/implement-feature <feature-name>
```text
**Examples:**
```bash
/implement-feature direct-costs
/implement-feature commitments --phase implement
/implement-feature rfis
```sql
**What it does:**

1. Validates prerequisites (feature directory, crawl data)
2. Reads shared workflow from `.agents/workflows/feature-implementation.md`
3. Auto-detects current phase from `STATUS.md`
4. Executes appropriate sub-agents for current phase
5. Coordinates parallel sessions via lock files

**Related Files:**

- Shared workflow: `.agents/workflows/feature-implementation.md`
- Feature context template: `.agents/templates/feature-context.md`
- Feature status template: `.agents/templates/feature-status.md`

---

## 📋 How to Use This Index

**Spawning a Sub-Agent:**

```typescript
Task({
  subagent_type: "agent-name",
  prompt: "Specific task description with context",
  description: "Short 3-5 word summary"
})
```sql
**When to Use Sub-Agents:**
- Complex tasks requiring 3+ steps
- Tasks modifying 5+ files
- When context is getting long/degraded
- When different expertise is needed
- For independent verification

---

## Agent List Sorted by Category

| Agent | Category | When to Use | Notes |
|-------|----------|-------------|-------|
| **ai-engineer** | AI & Machine Learning | LLM apps, RAG systems, prompt pipelines | Vector search, agent orchestration, SDK usage |
| **ai-sdk-expert** | AI & Machine Learning | AI SDK questions or integrations | Streaming, providers, tool calling mastery |
| **ml-engineer** | AI & Machine Learning | Building ML pipelines or serving models | Handles TensorFlow/PyTorch and monitoring |
| **prompt-engineer** | AI & Machine Learning | Optimizing prompts or agent behavior | Crafts prompt patterns and evaluations |
| **architect-reviewer** | Architecture & Planning | After structural or API changes | Validates layering and architectural consistency |
| **backend-architect** | Architecture & Planning | Designing REST APIs or microservices | Non-database system design focus |
| **cloud-architect** | Architecture & Planning | Designing AWS/Azure/GCP infrastructure | Handles Terraform, serverless, cost planning |
| **graphql-architect** | Architecture & Planning | Designing GraphQL schemas or resolvers | Handles federation and N+1 |
| **Plan** | Architecture & Planning | Before coding; craft implementation strategy | Returns step-by-step plans and trade-offs |
| **business-analyst** | Business & Support | Analyzing metrics, KPIs, dashboards | Builds reports, investor updates, growth models |
| **customer-support** | Business & Support | Handling tickets or FAQs | Drafts troubleshooting/responses |
| **quant-analyst** | Business & Support | Financial models or trading analysis | Produces risk metrics and simulations |
| **risk-manager** | Business & Support | Assessing portfolio risk | Designs hedging and limit strategies |
| **sales-automator** | Business & Support | Crafting sales outreach or proposals | Drafts sequences, scripts, pricing stories |
| **data-engineer** | Data & Analytics | Building ETL pipelines or warehouses | Implements Spark, Airflow, Kafka |
| **data-scientist** | Data & Analytics | Ad-hoc analysis or BigQuery insights | Builds dashboards and narratives |
| **database-admin** | Database & Backend | DB ops, backups, replication | Manages permissions, monitoring, recovery |
| **database-optimizer** | Database & Backend | Improving query performance or indexes | Stats, caching, plan tuning |
| **sql-pro** | Database & Backend | Complex SQL queries or optimization | Masters CTEs, window functions, materialized views |
| **supabase-architect** | Database & Backend | All Supabase schema/migration/RLS work | Knows Alleato-Procore DB details |
| **ui-ux-designer** | Design & UI/UX | Design systems, wireframes, visual reviews | Focuses on accessibility and experience |
| **cost-optimize** | DevOps & Infrastructure | Reducing cloud spend | Right-sizes compute, trims idle resources |
| **deployment-engineer** | DevOps & Infrastructure | CI/CD, Docker, Kubernetes, GitHub Actions | Automates deployment pipelines |
| **devops-troubleshooter** | DevOps & Infrastructure | Debugging production deployment failures | Analyzes logs and health metrics |
| **incident-responder** | DevOps & Infrastructure | Production emergencies only | Coordinates rapid incident response |
| **network-engineer** | DevOps & Infrastructure | DNS, SSL, CDN, connectivity issues | Configures load balancers and TLS |
| **elixir-pro** | Development & Implementation | Building with Elixir/OTP or Phoenix | Leverages supervisors and concurrency |
| **frontend-developer** | Development & Implementation | Building React layouts, components, state | Ensures accessibility and performance |
| **ios-developer** | Development & Implementation | Native iOS (Swift/SwiftUI) | Optimizes UIKit/SwiftUI integration |
| **mobile-developer** | Development & Implementation | React Native or Flutter work | Manages native integrations and sync |
| **php-pro** | Development & Implementation | Working in PHP codebases | Uses generators, iterators, SPL |
| **python-pro** | Development & Implementation | Idiomatic Python refactors or async work | Emphasizes decorators, generators, testing |
| **typescript-pro** | Development & Implementation | Advanced TypeScript types and generics | Handles enterprise TS patterns |
| **unity-developer** | Development & Implementation | Creating Unity/C# game systems | Manages rendering, assets, cross-platform |
| **api-documenter** | Documentation & Content | Generating OpenAPI/SDK docs | Keeps versioning and examples accurate |
| **content-marketer** | Documentation & Content | Writing blogs, newsletters, social content | Optimizes SEO and calendars |
| **docs-architect** | Documentation & Content | Authoring technical docs | Owns accuracy, context, storytelling |
| **mermaid-expert** | Documentation & Content | Creating diagrams (flowcharts/ERDs/sequences) | Masters diagram syntax and styling |
| **reference-builder** | Documentation & Content | Creating exhaustive references | Documents configuration and parameters |
| **tutorial-engineer** | Documentation & Content | Writing step-by-step tutorials | Turns complex concepts into learning journeys |
| **codebase-pattern-finder** | Exploration & Analysis | Finding similar implementations | Returns code snippets with file:line references |
| **error-detective** | Exploration & Analysis | Triaging logs or anomalies | Correlates errors across systems |
| **Explore** | Exploration & Analysis | Finding files/code or answering project questions | Specify quick/medium/very thorough |
| **search-specialist** | Exploration & Analysis | External research or competitive intel | Uses advanced search operators |
| **legal-advisor** | Legal & Compliance | Drafting privacy policies, ToS, compliance | Maintains GDPR/regulatory guardrails |
| **payment-integration** | Legal & Compliance | Implementing Stripe/PayPal subscriptions | Handles checkout flows and PCI |
| **code-reviewer** | Maintenance & Optimization | After implementations or multi-file fixes | Covers quality, security, maintainability |
| **dx-optimizer** | Maintenance & Optimization | Improving tooling or workflows | Focuses on DX, onboarding, automation |
| **legacy-modernizer** | Maintenance & Optimization | Refactoring legacy code or migrating frameworks | Targets tech debt |
| **performance-engineer** | Maintenance & Optimization | Profiling, caching, and load testing | Identifies bottlenecks |
| **component-system-consistency-subagent** | Project-Specific | Refactoring for consistent components | Enforces tailwind/style standards |
| **design-system-auditor** | Project-Specific | Before committing UI changes | Blocks Alleato design system violations |
| **feature-crawler** | Project-Specific | Researching Procore features | Captures screenshots and DOM analysis |
| **project-context-resilience-subagent** | Project-Specific | Hardening projectId/context resolution | Ensures correct context across URLs |
| **PROJECT-MANAGER-AGENT** | Project-Specific | Converting brain dumps into structured plans | Creates PLANS_DOC from initiate_project prompts |
| **security-auditor** | Security & Compliance | Reviewing vulnerabilities, auth, encryption | Handles OWASP, JWT, OAuth2 |
| **debugger** | Testing & Verification | Investigating errors, test failures, unexpected behavior | Combines error detection and log analysis |
| **design-review** | Testing & Verification | UI/UX reviews and accessibility checks | Uses Playwright to validate interactions |
| **test-automator** | Testing & Verification | Running unit, integration, Playwright/browser tests | MANDATORY for testing; uses tailored prompt |
| **verifier-agent** | Testing & Verification | Before claiming feature complete | Generates HTML verification reports |
| **Bash** | Utility | Running shell commands | For Git, scripts, and terminal tasks |
| **claude-code-guide** | Utility | Questions about Claude Code tooling | Answers CLI/SDK/API usage |
| **context-manager** | Utility | Coordinating long-running workflows | Keeps >10k token context organized |
| **statusline-setup** | Utility | Configuring Claude Code status line | Uses Read/Edit tools for settings |

## Agent List Sorted Alphabetically

Use this alphabetical listing when you already know the sub-agent name; the category table above spells out when to call each flow.

| Agent | Category |
|-------|----------|
| **ai-engineer** | AI & Machine Learning |
| **ai-sdk-expert** | AI & Machine Learning |
| **api-documenter** | Documentation & Content |
| **architect-reviewer** | Architecture & Planning |
| **backend-architect** | Architecture & Planning |
| **Bash** | Utility |
| **business-analyst** | Business & Support |
| **claude-code-guide** | Utility |
| **cloud-architect** | Architecture & Planning |
| **code-reviewer** | Maintenance & Optimization |
| **codebase-pattern-finder** | Exploration & Analysis |
| **component-system-consistency-subagent** | Project-Specific |
| **content-marketer** | Documentation & Content |
| **context-manager** | Utility |
| **cost-optimize** | DevOps & Infrastructure |
| **customer-support** | Business & Support |
| **data-engineer** | Data & Analytics |
| **data-scientist** | Data & Analytics |
| **database-admin** | Database & Backend |
| **database-optimizer** | Database & Backend |
| **debugger** | Testing & Verification |
| **deployment-engineer** | DevOps & Infrastructure |
| **design-review** | Testing & Verification |
| **design-system-auditor** | Project-Specific |
| **devops-troubleshooter** | DevOps & Infrastructure |
| **docs-architect** | Documentation & Content |
| **dx-optimizer** | Maintenance & Optimization |
| **elixir-pro** | Development & Implementation |
| **error-detective** | Exploration & Analysis |
| **Explore** | Exploration & Analysis |
| **feature-crawler** | Project-Specific |
| **frontend-developer** | Development & Implementation |
| **graphql-architect** | Architecture & Planning |
| **incident-responder** | DevOps & Infrastructure |
| **ios-developer** | Development & Implementation |
| **legacy-modernizer** | Maintenance & Optimization |
| **legal-advisor** | Legal & Compliance |
| **mermaid-expert** | Documentation & Content |
| **ml-engineer** | AI & Machine Learning |
| **mobile-developer** | Development & Implementation |
| **network-engineer** | DevOps & Infrastructure |
| **payment-integration** | Legal & Compliance |
| **performance-engineer** | Maintenance & Optimization |
| **php-pro** | Development & Implementation |
| **Plan** | Architecture & Planning |
| **project-context-resilience-subagent** | Project-Specific |
| **PROJECT-MANAGER-AGENT** | Project-Specific |
| **prompt-engineer** | AI & Machine Learning |
| **python-pro** | Development & Implementation |
| **quant-analyst** | Business & Support |
| **reference-builder** | Documentation & Content |
| **risk-manager** | Business & Support |
| **sales-automator** | Business & Support |
| **search-specialist** | Exploration & Analysis |
| **security-auditor** | Security & Compliance |
| **sql-pro** | Database & Backend |
| **statusline-setup** | Utility |
| **supabase-architect** | Database & Backend |
| **test-automator** | Testing & Verification |
| **tutorial-engineer** | Documentation & Content |
| **typescript-pro** | Development & Implementation |
| **ui-ux-designer** | Design & UI/UX |
| **unity-developer** | Development & Implementation |
| **verifier-agent** | Testing & Verification |

## 🧱 Architecture & Planning

Before you write new services or APIs, consult the architecture track in the table (`Plan`, `backend-architect`, `cloud-architect`, `graphql-architect`, `architect-reviewer`). That row indicates when those agents should lead design discussions and when to bring in formal architecture reviews.

## 🧪 Testing & Verification

Every change should flow through the testing column: `test-automator` is mandatory for unit/integration/Playwright work, `verifier-agent` gates completion, and `debugger`, `design-review`, `code-reviewer`, `architect-reviewer`, and `security-auditor` cover investigation, UI validation, code quality, architecture, and vulnerabilities. The table spells out the trigger for each.

## 💻 Development & Implementation

Implementation work is handled by the development specialists such as `frontend-developer`, `elixir-pro`, `python-pro`, `php-pro`, `typescript-pro`, `mobile-developer`, `ios-developer`, and `unity-developer`; the architecture agents above can assist when scope crosses system boundaries.

## 🗄️ Database & Backend

All database work funnels through `supabase-architect`, supported by `database-admin`, `database-optimizer`, and `sql-pro`. Use `graphql-architect` for GraphQL schema changes. The table highlights when to use each.

## 🎨 Design & UI/UX

Design questions go to `ui-ux-designer` along with the design-specific helpers in the project-specific section. The table rows make it easy to spot who enforces design system rules and component consistency.

## 📚 Documentation & Content

Writing docs, API specs, tutorials, or marketing copy involves `docs-architect`, `api-documenter`, `reference-builder`, `tutorial-engineer`, `content-marketer`, and `mermaid-expert`. Refer to the table to match the work with the best fit.

## 🚀 DevOps & Infrastructure

Use `deployment-engineer`, `devops-troubleshooter`, `incident-responder`, `cloud-architect`, `network-engineer`, and `cost-optimize` for deployments, incidents, and infrastructure cost work; the table shows their operational focus.

## 🤖 AI & Machine Learning

AI/LLM work belongs to `ai-engineer`, `ai-sdk-expert`, `ml-engineer`, and `prompt-engineer`. Their rows explain the boundaries between model work, SDK questions, and prompt tuning.

## 🔍 Exploration & Analysis

When you need to locate code/patterns or investigate anomalies, call `Explore`, `search-specialist`, `codebase-pattern-finder`, or `error-detective`. Use `context-manager` to orchestrate large multi-agent investigations.

## 📊 Data & Analytics

Use `data-engineer` and `data-scientist` for analytics, BigQuery, dashboards, and data narratives.

## 💼 Business & Support

Metrics, KPIs, and outreach fall to `business-analyst`, `quant-analyst`, `risk-manager`, `sales-automator`, and `customer-support`.

## ⚖️ Legal & Compliance

Compliance work goes to `legal-advisor` and `payment-integration`, with `security-auditor` covering vulnerabilities and auth reviews.

## 🔧 Maintenance & Optimization

Maintenance tasks tap `legacy-modernizer`, `performance-engineer`, `dx-optimizer`, and `code-reviewer` for refactors, tooling improvements, and quality assurance.

## 🏗️ Project-Specific Agents (Alleato-Procore)

These dedicated helpers include `design-system-auditor`, `component-system-consistency-subagent`, `project-context-resilience-subagent`, `feature-crawler`, and `PROJECT-MANAGER-AGENT`. They are documented in the table and in `.agents/agents/*`; activate them before committing UI designs, enforcing component standards, fixing project context issues, researching Procore details, or creating project plans.

## 🛠️ Utility Agents

Use `Bash`, `claude-code-guide`, `context-manager`, and `statusline-setup` for shell tasks, Claude CLI questions, managing long-running workflows, and configuring the status line.

## 📊 Usage Statistics

| Category | Count |
|----------|-------|
| User-Level Sub-Agents | 59 |
| Project-Specific Sub-Agents | 5 |
| Specialized Prompt Templates | 1 (playwright-tester.md) |
| Total Sub-Agents | 64 |

## 🔗 Related Documentation

- **CLAUDE.md** - Main project instructions (refer back to the agent tables above for the current roster)
- **`.agents/docs/playwright/PLAYWRIGHT-PATTERNS.md`** - Playwright testing patterns
- **`.agents/rules/PLAYWRIGHT-GATE.md`** - Playwright execution gate
- **`.agents/rules/SUPABASE-GATE.md`** - Supabase database gate
- **`.agents/PLANS.md`** - PlansDoc structure and guidance

## 📝 Notes

### Key Project-Specific Patterns

1. **Always use `supabase-architect`** for ANY database work
2. **Always use `test-automator`** for ALL testing
   - For Playwright: Use with `.agents/agents/playwright-tester.md` prompt template
   - For unit/integration: Use with generic prompt
3. **Use design system agents** before committing UI changes
4. **Spawn verification agents** for independent testing after implementation

### Common Mistakes to Avoid

- ❌ Running ANY tests directly (use `test-automator` sub-agent - **MANDATORY**)
- ❌ Thinking `playwright-tester` is a separate agent (it's a prompt template)
- ❌ Making database changes without `supabase-architect` (**MANDATORY** for complex work)
- ❌ Committing UI without `design-system-auditor` review (**MANDATORY**)
- ❌ Writing code without spawning `code-reviewer` afterward (**MANDATORY**)
- ❌ Making assumptions about codebase without `Explore` (**MANDATORY**)
- ❌ Claiming "complete" without running `verifier-agent` (**MANDATORY**)
- ❌ Saying "tests pass" without HTML verification report evidence

### Best Practices

- ✅ **Check MANDATORY requirements** before claiming complete (see CLAUDE.md)
- ✅ Spawn verification agents for complex tasks
- ✅ Use specialized agents for their domain expertise
- ✅ Run agents in parallel when tasks are independent
- ✅ Provide detailed context in prompts
- ✅ Trust agent outputs (they have specialized knowledge)
- ✅ Always run quality checks (`npm run quality --prefix frontend`)
- ✅ Document verification evidence in task logs

## Quick Reference

(The tables above are the canonical agent roster; use them before falling back to these shortcuts.)

### Testing (MANDATORY)

```typescript
Task({ subagent_type: "test-automator", prompt: "...", description: "Test X" })
```

### Codebase Research

```typescript
// Quick search
Task({ subagent_type: "Explore", prompt: "quick: find auth files", description: "Find auth" })

// Find patterns to copy
Task({ subagent_type: "codebase-pattern-finder", prompt: "Show form patterns", description: "Find forms" })
```markdown
### Database (ALL Supabase work)

```typescript
Task({ subagent_type: "supabase-architect", prompt: "...", description: "DB work" })
```markdown
### Documentation (ALL docs)

```typescript
Task({ subagent_type: "docs-architect", prompt: "...", description: "Write docs" })
```markdown
### AI Work (ALL LLM/AI)

```typescript
Task({ subagent_type: "ai-engineer", prompt: "...", description: "AI feature" })
```

## Decision Tree: Which Agent?

```text
Need to run tests?
  → test-automator (MANDATORY)

Production is broken?
  → incident-responder

Something not working?
  → debugger

Need to find code?
  → Explore (codebase) or search-specialist (web)

Need to copy a pattern?
  → codebase-pattern-finder

Database work?
  → supabase-architect (ALL of it)

Write documentation?
  → docs-architect (ALL of it)

AI/LLM feature?
  → ai-engineer (ALL of it)

Design/UI work?
  → ui-ux-designer (design) or frontend-developer (code)

Review code?
  → code-reviewer (includes architecture)

Plan implementation?
  → Plan
```

## Summary

**Key Consolidations:**

1. The agent tables above are the canonical roster—use them when picking a sub-agent and rely on their "When to Use" guidance.
2. **Database** → All in `supabase-architect`
3. **Documentation** → All in `docs-architect`
4. **AI/LLM** → All in `ai-engineer`
5. **Debugging** → All in `debugger`
6. **Production issues** → All in `incident-responder`
7. **Code review** → All in `code-reviewer` (includes architecture)

---

- **Last Updated:** 2026-01-10
- **Maintained By:** Project team
- **Version:** 1.0.0
