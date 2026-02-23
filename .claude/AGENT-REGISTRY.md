# AGENT REGISTRY

Find any agent, command, or skill regardless of which system it lives in.

| System | Location | How to invoke |
|--------|----------|--------------|
| Subagents | `.claude/agents/` | Mention by name or let Claude auto-delegate |
| Skills | `.agents/skills/` | `/skill-name` or mention by name |
| Commands | `.claude/commands/` | `/command-name` |
| BMAD | `.claude/commands/bmad-*` | `/bmad-*` |

---

## Subagents

### Categories

| Category | Location |
|----------|----------|
| Bug Team | `.claude/agents/bug-team/` |
| Design | `.claude/agents/design/` |
| Database | `.claude/agents/database/` |
| Development | `.claude/agents/development/` |
| Documentation | `.claude/agents/documentation/` |
| Project-Specific | `.claude/agents/` (root) |
| Standard Library | `.claude/agents/` (root) |

### All Agents

| Agent | Category | Model | Purpose |
|-------|----------|-------|---------|
| `investigation-orchestrator` | Bug Team | — | Coordinates multi-agent bug investigations |
| `code-auditor` | Bug Team | — | Audits code for bugs and anti-patterns |
| `live-tester` | Bug Team | — | Tests bugs in the live browser environment |
| `procore-feature-expert` | Bug Team | — | Expert on Procore-specific features and quirks |
| `design-review-agent` | Design | — | Reviews UI/design consistency and standards |
| `ui-ux-designer` | Design | Sonnet | Interface design, wireframes, design systems |
| `data-engineer` | Database | Sonnet | ETL pipelines and data architecture |
| `data-scientist` | Database | Haiku | Data analysis, SQL queries |
| `database-admin` | Database | Sonnet | Operations, backups, replication, monitoring |
| `database-optimizer` | Database | Sonnet | Query optimization, indexing, migrations |
| `graphql-architect` | Database | Sonnet | GraphQL schema design and federation |
| `ai-sdk-expert` | Development | — | Vercel AI SDK, streaming, tool calling, RAG |
| `code-reviewer` | Development | Sonnet | Code quality, security, production reliability |
| `context-manager` | Development | Opus | Multi-agent coordination for 10k+ token tasks |
| `debugger` | Development | Sonnet | Error investigation, test failures |
| `deployment-engineer` | Development | Sonnet | CI/CD, Docker, GitHub Actions |
| `devops-troubleshooter` | Development | Sonnet | Production debugging, log analysis |
| `elixir-pro` | Development | Sonnet | Elixir/OTP, supervision trees, Phoenix |
| `error-detective` | Development | Sonnet | Log search, error patterns, root cause |
| `frontend-developer` | Development | Sonnet | React, responsive layouts, state management |
| `ios-developer` | Development | Sonnet | Swift/SwiftUI, UIKit, native iOS |
| `mobile-developer` | Development | Sonnet | React Native/Flutter, offline sync |
| `payment-integration` | Development | Sonnet | Stripe, PayPal, webhooks, PCI compliance |
| `php-pro` | Development | Sonnet | Modern PHP, generators, SPL, OOP |
| `python-pro` | Development | Sonnet | Advanced Python, async, decorators |
| `test-automator` | Development | Sonnet | Unit, integration, E2E test suites |
| `typescript-pro` | Development | Sonnet | Advanced types, generics, strict TS |
| `api-documenter` | Documentation | Haiku | OpenAPI/Swagger specs, developer docs |
| `docs-architect` | Documentation | Opus | Long-form technical manuals, architecture guides |
| `mermaid-expert` | Documentation | Sonnet | Flowcharts, ERDs, sequence diagrams |
| `architect-reviewer` | Standard Library | Opus | Architectural consistency, SOLID principles |
| `backend-architect` | Standard Library | Sonnet | REST APIs, microservices, database schemas |
| `business-analyst` | Standard Library | Haiku | KPIs, reports, dashboards, growth projections |
| `claude-tools-expert` | Project-Specific | — | Claude Code features, skills, MCP questions |
| `cloud-architect` | Standard Library | Opus | AWS/Azure/GCP, Terraform, cost optimization |
| `codex-prp-create` | Project-Specific | — | PRP generation |
| `component-system-consistency-subagent` | Project-Specific | — | Design system compliance checks |
| `content-marketer` | Standard Library | Haiku | Blog posts, SEO, social media, newsletters |
| `customer-support` | Standard Library | Haiku | Support tickets, FAQs, help docs |
| `design-system-auditor` | Project-Specific | — | Design system standards enforcement |
| `documentation-auditor` | Project-Specific | — | Documentation accuracy verification |
| `dx-optimizer` | Standard Library | Sonnet | Developer tooling, setup, workflow friction |
| `elite-design` | Project-Specific | — | High-quality design direction and styling |
| `feature-crawler` | Project-Specific | — | Automated Procore feature exploration |
| `feature-crawler-v2` | Project-Specific | — | Enhanced Procore feature crawler |
| `incident-responder` | Standard Library | Opus | Production incidents, post-mortems |
| `legal-advisor` | Standard Library | Haiku | Privacy policies, ToS, GDPR, compliance |
| `legacy-modernizer` | Standard Library | Sonnet | Framework migrations, technical debt |
| `markdown-formatter` | Project-Specific | — | Markdown formatting and standards |
| `ml-engineer` | Standard Library | Sonnet | ML pipelines, TensorFlow/PyTorch serving |
| `network-engineer` | Standard Library | Sonnet | DNS, SSL/TLS, load balancers, CDN |
| `page-title-compliance-subagent` | Project-Specific | — | Page title SEO/accessibility compliance |
| `performance-engineer` | Standard Library | Opus | Profiling, caching, load testing |
| `playwright-tester` | Project-Specific | — | E2E testing specialist |
| `project-context-resilience-subagent` | Project-Specific | — | Context persistence across sessions |
| `prompt-engineer` | Standard Library | Opus | LLM prompt optimization, agent systems |
| `quant-analyst` | Standard Library | Opus | Financial models, backtesting, risk metrics |
| `reference-builder` | Standard Library | Haiku | API references, config guides |
| `risk-manager` | Standard Library | Opus | Portfolio risk, hedging, stop-losses |
| `sales-automator` | Standard Library | Haiku | Cold emails, proposals, lead nurturing |
| `search-specialist` | Standard Library | Haiku | Web research, competitive analysis |
| `security-auditor` | Standard Library | Opus | Vulnerabilities, OWASP, auth flows |
| `sql-pro` | Standard Library | Sonnet | Complex queries, execution plans, schema design |
| `supabase-architect` | Project-Specific | — | Supabase DB, RLS, migrations, type generation |
| `tutorial-engineer` | Standard Library | Opus | Step-by-step tutorials, learning paths |
| `verifier-agent` | Project-Specific | — | Quality verification before completion |
| `ai-engineer` | Standard Library | Opus | LLM apps, RAG, vector search, agents |

---

## Skills

| Skill | Category | Invoke | Purpose |
|-------|----------|--------|---------|
| `ai-sdk` | Custom | `/ai-sdk` | Vercel AI SDK — streaming, tool calling, RAG |
| `context7` | Custom | `/context7` | Up-to-date docs for any library/framework |
| `data-storytelling` | Custom | `/data-storytelling` | Transform data into narratives and visualizations |
| `protocol-reverse-engineering` | Custom | `/protocol-reverse-engineering` | Network protocol analysis |
| `supabase-postgres-best-practices` | Custom | `/supabase-postgres-best-practices` | Postgres performance and Supabase optimization |
| `verification-before-completion` | Custom | `/verification-before-completion` | Quality gate before claiming work is done |
| `prp-create` | PRP | `/prp-create` | Create a Product Requirements Plan |
| `prp-execute` | PRP | `/prp-execute` | Execute a PRP step-by-step |
| `prp-quality` | PRP | `/prp-quality` | Validate PRP quality (8/10+ confidence) |
| `prp-validate` | PRP | `/prp-validate` | Validate PRP was executed as planned |
| `figma` | Curated | `/figma` | Read Figma designs, generate code from designs |
| `figma-implement-design` | Curated | `/figma-implement-design` | Implement a Figma design as code |
| `gh-address-comments` | Curated | `/gh-address-comments` | Respond to GitHub PR review comments |
| `gh-fix-ci` | Curated | `/gh-fix-ci` | Debug and fix CI pipeline failures |
| `playwright` | Curated | `/playwright` | Playwright browser automation |
| `vercel-deploy` | Curated | `/vercel-deploy` | Deploy to Vercel |
| `netlify-deploy` | Curated | `/netlify-deploy` | Deploy to Netlify |
| `cloudflare-deploy` | Curated | `/cloudflare-deploy` | Deploy to Cloudflare |
| `render-deploy` | Curated | `/render-deploy` | Deploy to Render |
| `linear` | Curated | `/linear` | Linear issue management |
| `sentry` | Curated | `/sentry` | Error monitoring and issue tracking |
| `pdf` | Curated | `/pdf` | PDF reading and generation |
| `spreadsheet` | Curated | `/spreadsheet` | Spreadsheet operations |
| `screenshot` | Curated | `/screenshot` | Page screenshot capture |
| `transcribe` | Curated | `/transcribe` | Audio/video transcription |
| `security-best-practices` | Curated | `/security-best-practices` | Security review and hardening |
| `security-threat-model` | Curated | `/security-threat-model` | Threat modeling for features |
| `security-ownership-map` | Curated | `/security-ownership-map` | Security ownership map |
| `notion-knowledge-capture` | Curated | `/notion-knowledge-capture` | Save knowledge to Notion |
| `notion-meeting-intelligence` | Curated | `/notion-meeting-intelligence` | Meeting notes to Notion |
| `skill-creator` | System | `/skill-creator` | Create a new custom skill |
| `skill-installer` | System | `/skill-installer` | Install skills from external sources |

---

## Commands

| Command | Category | Invoke | Purpose |
|---------|----------|--------|---------|
| `create-feature` | Feature Dev | `/workflow:create-feature` | Full CRUD feature (hooks, service, API, page, migration) |
| `implement-feature` | Feature Dev | `/workflow:implement-feature` | Procore feature implementation workflow |
| `api-endpoint` | Feature Dev | `/api-endpoint` | Add API endpoint + service + hook |
| `component` | Feature Dev | `/component` | Create UI component with design system enforcement |
| `scaffold` | Feature Dev | `/workflow:scaffold` | Generate from templates (prefer `create-feature`) |
| `supabase-migration` | Supabase | `/supabase-migration` | Create and apply migration with type verification |
| `generate-supabase-types` | Supabase | `/supabase:generate-supabase-types` | Generate TypeScript types from schema |
| `create-table-page` | Supabase | `/supabase:create-table-page` | Generate a (tables) page for a Supabase table |
| `infinite-query` | Supabase | `/supabase:infinite-query` | React hook for infinite lists |
| `designer` | Design | `/design:designer` | Create production-grade frontend UI |
| `design-alleato` | Design | `/design:design-alleato` | Alleato-specific design patterns |
| `design-audit` | Design | `/design:design-audit` | Full design system audit |
| `design-check` | Design | `/design:design-check` | Quick design system check |
| `design-fix` | Design | `/design:design-fix` | Fix design system issues |
| `design-fix-loop` | Design | `/design:design-fix-loop` | Autonomous design fix loop |
| `design-report` | Design | `/design:design-report` | Generate design system report |
| `design-verify` | Design | `/design:design-verify` | Verify design implementation |
| `verify` | Verification | `/verification:verify` | Verify current task |
| `verify-task` | Verification | `/verification:verify-task` | Comprehensive task verification |
| `verify-layout` | Verification | `/verification:verify-layout` | Verify layout implementation |
| `verify-api-routes` | Verification | `/verification:verify-api-routes` | Check all API routes for common issues |
| `doc-check` | Documentation | `/documenation:doc-check` | Pre-check before creating docs |
| `audit-docs` | Documentation | `/documenation:audit-docs` | Audit docs for accuracy/completeness |
| `fix-docs` | Documentation | `/documenation:fix-docs` | Fix documentation issues |
| `documentation-workflow` | Documentation | `/documenation:documentation-workflow` | Full documentation maintenance |
| `prp-create` | PRPs | `/PRPs:prp-create` | Research and create a PRP |
| `prp-execute` | PRPs | `/PRPs:prp-execute` | Execute a PRP with progressive validation |
| `prp-quality` | PRPs | `/PRPs:prp-quality` | Validate PRP quality (8/10+ gate) |
| `prp-validate` | PRPs | `/PRPs:prp-validate` | Validate PRP was executed as planned |
| `prp-test` | PRPs | `/PRPs:prp-test` | Run all feature tests, fix failures |
| `prp-audit` | PRPs | `/PRPs:prp-audit` | Audit existing feature |
| `prp-pipeline` | PRPs | `/PRPs:prp-pipeline:prp-pipeline` | Automated PRP pipeline |
| `complete-task` | Workflow | `/workflow:complete-task` | Complete a task with verification gates |
| `feature-crawl` | Workflow | `/workflow:feature-crawl` | Crawl Procore feature with screenshots |
| `investigate` | Workflow | `/workflow:investigate` | Run bug investigation team |
| `complete-directory` | Workflow | `/workflow:complete-directory` | Finish remaining directory system work |
| `create-pr` | Workflow | `/create-pr` | Create a well-structured PR |
| `create-codex-task` | Workflow | `/create-codex-task` | Create a Codex task |
| `check-patterns` | Workflow | `/check-patterns` | Check documented error patterns |
| `debug-rca` | Workflow | `/debug-rca` | Systematic debugging with root cause analysis |
| `delegate-audit-tasks` | Workflow | `/delegate-audit-tasks` | Route audit findings to specialists |

---

## BMAD System

### Role Agents

**Enter a persistent role persona with `/bmad-agent-<name>`.**

| Agent | Invoke | Role |
|-------|--------|------|
| `bmad-master` | `/bmad-agent-bmad-master` | Master orchestrator — routes to other BMAD agents |
| `dev` | `/bmad-agent-bmm-dev` | Developer |
| `pm` | `/bmad-agent-bmm-pm` | Product manager |
| `qa` | `/bmad-agent-bmm-qa` | QA engineer |
| `architect` | `/bmad-agent-bmm-architect` | Solution architect |
| `analyst` | `/bmad-agent-bmm-analyst` | Business analyst |
| `sm` | `/bmad-agent-bmm-sm` | Scrum master |
| `tech-writer` | `/bmad-agent-bmm-tech-writer` | Technical writer |
| `ux-designer` | `/bmad-agent-bmm-ux-designer` | UX designer |
| `quick-flow-solo-dev` | `/bmad-agent-bmm-quick-flow-solo-dev` | Rapid solo dev flow |
| `agent-builder` | `/bmad-agent-bmb-agent-builder` | Create and edit BMAD agents |
| `module-builder` | `/bmad-agent-bmb-module-builder` | Create and edit BMAD modules |
| `workflow-builder` | `/bmad-agent-bmb-workflow-builder` | Create and edit BMAD workflows |
| `brainstorming-coach` | `/bmad-agent-cis-brainstorming-coach` | Brainstorming facilitation |
| `creative-problem-solver` | `/bmad-agent-cis-creative-problem-solver` | Creative problem solving |
| `design-thinking-coach` | `/bmad-agent-cis-design-thinking-coach` | Design thinking process |
| `innovation-strategist` | `/bmad-agent-cis-innovation-strategist` | Innovation strategy |
| `presentation-master` | `/bmad-agent-cis-presentation-master` | Presentations |
| `storyteller` | `/bmad-agent-cis-storyteller` | Narrative and storytelling |
| `tea` | `/bmad-agent-tea-tea` | Testing architecture |

### Workflows

**Single-purpose commands, no persistent role.**

| Command | Category | Invoke | Purpose |
|---------|----------|--------|---------|
| `create-prd` | PM | `/bmad-bmm-create-prd` | Create a Product Requirements Document |
| `edit-prd` | PM | `/bmad-bmm-edit-prd` | Edit an existing PRD |
| `validate-prd` | PM | `/bmad-bmm-validate-prd` | Validate PRD completeness |
| `create-product-brief` | PM | `/bmad-bmm-create-product-brief` | Create product brief |
| `create-architecture` | PM | `/bmad-bmm-create-architecture` | Create technical architecture doc |
| `create-epics-and-stories` | PM | `/bmad-bmm-create-epics-and-stories` | Break PRD into epics and stories |
| `create-story` | PM | `/bmad-bmm-create-story` | Write a single user story |
| `dev-story` | PM | `/bmad-bmm-dev-story` | Create a developer-facing story |
| `create-ux-design` | PM | `/bmad-bmm-create-ux-design` | Create UX design document |
| `sprint-planning` | PM | `/bmad-bmm-sprint-planning` | Facilitate sprint planning |
| `sprint-status` | PM | `/bmad-bmm-sprint-status` | Report sprint status |
| `retrospective` | PM | `/bmad-bmm-retrospective` | Run sprint retrospective |
| `check-implementation-readiness` | PM | `/bmad-bmm-check-implementation-readiness` | Pre-implementation readiness gate |
| `correct-course` | PM | `/bmad-bmm-correct-course` | Mid-project course correction |
| `code-review` | PM | `/bmad-bmm-code-review` | Structured code review |
| `quick-dev` | PM | `/bmad-bmm-quick-dev` | Rapid development workflow |
| `quick-spec` | PM | `/bmad-bmm-quick-spec` | Quick specification generation |
| `document-project` | PM | `/bmad-bmm-document-project` | Document the entire project |
| `generate-project-context` | PM | `/bmad-bmm-generate-project-context` | Generate project context file |
| `market-research` | Research | `/bmad-bmm-market-research` | Market research |
| `domain-research` | Research | `/bmad-bmm-domain-research` | Domain/industry research |
| `technical-research` | Research | `/bmad-bmm-technical-research` | Technical research |
| `qa-generate-e2e-tests` | Research | `/bmad-bmm-qa-generate-e2e-tests` | Generate E2E test suite |
| `bmb-create-agent` | Builder | `/bmad-bmb-create-agent` | Create a new BMAD agent |
| `bmb-edit-agent` | Builder | `/bmad-bmb-edit-agent` | Edit an existing BMAD agent |
| `bmb-validate-agent` | Builder | `/bmad-bmb-validate-agent` | Validate a BMAD agent |
| `bmb-create-module` | Builder | `/bmad-bmb-create-module` | Create a new BMAD module |
| `bmb-edit-module` | Builder | `/bmad-bmb-edit-module` | Edit an existing BMAD module |
| `bmb-validate-module` | Builder | `/bmad-bmb-validate-module` | Validate a BMAD module |
| `bmb-create-workflow` | Builder | `/bmad-bmb-create-workflow` | Create a new BMAD workflow |
| `bmb-edit-workflow` | Builder | `/bmad-bmb-edit-workflow` | Edit an existing BMAD workflow |
| `bmb-validate-workflow` | Builder | `/bmad-bmb-validate-workflow` | Validate a BMAD workflow |
| `bmb-rework-workflow` | Builder | `/bmad-bmb-rework-workflow` | Rework workflow to V6 compliance |
| `brainstorming` | Creative | `/bmad-brainstorming` | Structured brainstorming session |
| `cis-design-thinking` | Creative | `/bmad-cis-design-thinking` | Design thinking workshop |
| `cis-innovation-strategy` | Creative | `/bmad-cis-innovation-strategy` | Innovation strategy session |
| `cis-problem-solving` | Creative | `/bmad-cis-problem-solving` | Creative problem solving |
| `cis-storytelling` | Creative | `/bmad-cis-storytelling` | Storytelling for communication |
| `tea-atdd` | Testing | `/bmad-tea-testarch-atdd` | Acceptance Test-Driven Development |
| `tea-automate` | Testing | `/bmad-tea-testarch-automate` | Test automation strategy |
| `tea-ci` | Testing | `/bmad-tea-testarch-ci` | CI/CD testing configuration |
| `tea-framework` | Testing | `/bmad-tea-testarch-framework` | Test framework selection |
| `tea-nfr` | Testing | `/bmad-tea-testarch-nfr` | Non-functional requirements testing |
| `tea-test-design` | Testing | `/bmad-tea-testarch-test-design` | Test design patterns |
| `tea-test-review` | Testing | `/bmad-tea-testarch-test-review` | Test suite review |
| `tea-trace` | Testing | `/bmad-tea-testarch-trace` | Test traceability |
| `editorial-prose` | Editorial | `/bmad-editorial-review-prose` | Review and improve prose quality |
| `editorial-structure` | Editorial | `/bmad-editorial-review-structure` | Review document structure |
| `review-adversarial` | Editorial | `/bmad-review-adversarial-general` | Adversarial/red-team review |
| `shard-doc` | Editorial | `/bmad-shard-doc` | Split large docs into shards |
| `index-docs` | Editorial | `/bmad-index-docs` | Index documentation |
| `help` | System | `/bmad-help` | BMAD system help |

## Quick Lookup

| I want to... | Use this |
|-------------|---------|
| Build a new CRUD feature | `/workflow:create-feature <EntityName>` |
| Implement a Procore feature | `/workflow:implement-feature` |
| Create a UI component | `/component` |
| Design a new page/UI | `/design:designer` or `/design:design-alleato` |
| Audit the design system | `/design:design-audit` |
| Fix a design issue | `/design:design-fix` or `/design:design-fix-loop` |
| Add an API endpoint | `/api-endpoint` |
| Create a database migration | `/supabase-migration` |
| Generate Supabase types | `/supabase:generate-supabase-types` |
| Debug a bug | `/debug-rca` or `debugger` subagent |
| Investigate a production issue | `/workflow:investigate` or `incident-responder` |
| Review code | `code-reviewer` subagent |
| Write E2E tests | `playwright-tester` subagent or `/PRPs:prp-test` |
| Create a PRP | `/PRPs:prp-create` |
| Execute a PRP | `/PRPs:prp-execute` |
| Audit an existing feature | `/PRPs:prp-audit` |
| Create a PR | `/create-pr` |
| Document a feature | `docs-architect` subagent |
| Crawl a Procore feature | `/workflow:feature-crawl` |
| Verify task completion | `/verification:verify-task` |
| Optimize database queries | `database-optimizer` subagent |
| Create a product spec | `/bmad-bmm-create-prd` |
| Sprint planning | `/bmad-bmm-sprint-planning` |
| Get up-to-date library docs | `/context7` |
| Work with Figma | `/figma` (curated skill) |
| Fix CI failures | `/gh-fix-ci` (curated skill) |
| Security audit | `security-auditor` subagent |
| Build AI/LLM features | `ai-engineer` subagent or `/ai-sdk` |
