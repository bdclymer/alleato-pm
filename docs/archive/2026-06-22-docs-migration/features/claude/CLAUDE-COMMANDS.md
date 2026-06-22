# Commands Reference

Complete reference for all Claude slash commands, npm scripts, and shell utilities in the Alleato-Procore project.

---

## Table of Contents

1. [Claude / Commands](#claude-slash-commands)
   - [Design System](#design-system)
   - [Verification](#verification)
   - [Documentation](#documentation)
   - [Workflow](#workflow)
   - [PRPs](#prps-product-requirement-prompts)
   - [Supabase](#supabase)
   - [Development](#development)
2. [Plugin Commands](#plugin-commands)
3. [npm Scripts](#npm-scripts)
   - [Root Scripts](#root-scripts)
   - [Frontend Scripts](#frontend-scripts)
4. [Shell Scripts](#shell-scripts)

---

## Claude / Commands

### Design System

Commands for design system management and UI development.

| Command | Description | Usage |
|---------|-------------|-------|
| `/designer` | Create distinctive, production-grade frontend interfaces | `/designer` |
| `/design-alleato` | Create Alleato-specific frontend components with design system | `/design-alleato` |
| `/design-audit` | Comprehensive design system audit | `/design-audit` |
| `/design-check` | Quick design system check | `/design-check` |
| `/design-fix` | Fix design system violations | `/design-fix` |
| `/design-fix-loop` | Autonomous design system fix loop | `/design-fix-loop` |
| `/design-verify` | Verify design system compliance | `/design-verify` |
| `/design-report` | Generate design system report | `/design-report` |

### Verification

Commands for verifying implementations and testing.

| Command | Description | Usage |
|---------|-------------|-------|
| `/verify` | Verify current task completion | `/verify` |
| `/verify-task` | Comprehensive task verification | `/verify-task` |
| `/verify-layout` | Verify layout implementation | `/verify-layout` |
| `/verify-api-routes` | Verify all API routes for common issues | `/verify-api-routes` |
| `/check-patterns` | Check for code pattern violations | `/check-patterns` |

### Documentation

Commands for documentation management and maintenance.

| Command | Description | Usage |
|---------|-------------|-------|
| `/doc-check` | Pre-documentation creation check | `/doc-check` |
| `/audit-docs` | Verify documentation files for accuracy | `/audit-docs` |
| `/fix-docs` | Automatically fix documentation issues | `/fix-docs` |
| `/fix-docs-implementation` | Fix documentation implementation issues | `/fix-docs-implementation` |
| `/documentation-workflow` | Documentation maintenance workflow | `/documentation-workflow` |

### Workflow

Commands for feature development and project workflows.

| Command | Description | Usage |
|---------|-------------|-------|
| `/create-feature` | Create complete feature with validation | `/create-feature <FeatureName>` |
| `/implement-feature` | Execute standardized feature implementation | `/implement-feature` |
| `/feature-implementation` | Feature implementation workflow | `/feature-implementation` |
| `/feature-implementation-live` | Live feature implementation workflow | `/feature-implementation-live` |
| `/scaffold` | Generate feature from templates | `/scaffold <EntityName>` |
| `/feature-crawl` | Automated Procore feature crawling | `/feature-crawl` |
| `/complete-task` | Complete task with verification | `/complete-task` |
| `/complete-directory` | Finish directory system implementation | `/complete-directory` |

### PRPs (Product Requirement Prompts)

Commands for creating and managing Product Requirement Prompts.

| Command | Description | Usage |
|---------|-------------|-------|
| `/prp-create` | Research and create comprehensive PRP | `/prp-create` |
| `/prp-execute` | Execute a completed PRP | `/prp-execute` |
| `/prp-validate` | Run final validation checklist after PRP | `/prp-validate` |
| `/prp-quality` | Validate PRP quality before execution | `/prp-quality` |

### Supabase

Commands for Supabase database operations.

| Command | Description | Usage |
|---------|-------------|-------|
| `/generate-supabase-types` | Generate types for API and Supabase | `/generate-supabase-types` |
| `/supabase-migration` | Create and apply Supabase migration | `/supabase-migration` |
| `/supabase-table-automation` | Automate Supabase table page generation | `/supabase-table-automation` |
| `/infinite-query` | React hook for infinite lists from Supabase | `/infinite-query` |

### Development

General development commands.

| Command | Description | Usage |
|---------|-------------|-------|
| `/component` | Create component with Design System enforcement | `/component <ComponentName>` |
| `/api-endpoint` | Add API endpoint to existing entity | `/api-endpoint` |
| `/create-pr` | Create well-structured pull request | `/create-pr` |
| `/debug-rca` | Systematically debug with root cause analysis | `/debug-rca` |
| `/create-codex-task` | Create Codex task | `/create-codex-task` |
| `/delegate-audit-tasks` | Route documentation audit findings to agents | `/delegate-audit-tasks` |

---

## Plugin Commands

Commands provided by installed Claude plugins.

### Feature Development

- `/feature-dev` - Feature development workflow

### Code Review

- `/code-review` - Comprehensive code review
- `/review-pr` - Review pull request

### Plugin Development

- `/create-plugin` - Create new Claude plugin

### Commit Commands

- `/commit` - Create git commit
- `/commit-push-pr` - Commit, push, and create PR
- `/clean_gone` - Clean gone git branches

### Hookify

- `/hookify` - Configure git hooks
- `/hookify-help` - Hookify help
- `/hookify-list` - List configured hooks
- `/hookify-configure` - Configure hook settings

### Testing

- `/test-forms` - Comprehensive form testing

### Ralph Wiggum (Debug Assistant)

- `/ralph-loop` - Start Ralph debugging loop
- `/cancel-ralph` - Cancel Ralph debugging
- `/ralph-help` - Ralph help

### Agent SDK Development

- `/new-sdk-app` - Create new Claude Agent SDK application

---

## npm Scripts

### Root Scripts

Development and testing commands from root `package.json`.

#### Development

```bash
npm run dev                    # Run both frontend and backend concurrently
npm run dev:frontend           # Run frontend only (Next.js on port 3000)
npm run dev:backend            # Run backend only (Python/FastAPI)
npm run build                  # Build frontend for production
npm start                      # Start production frontend server
npm run install:all            # Install dependencies for root and frontend
```

#### Testing

```bash
npm test                       # Run frontend and backend tests
npm run test:frontend          # Run frontend unit tests
npm run test:backend           # Run backend pytest tests
npm run test:all               # Run all tests (script)
npm run test:coverage          # Run tests with coverage
npm run test:frontend:coverage # Frontend coverage
npm run test:backend:coverage  # Backend coverage with HTML report
```

#### Database Seeding

```bash
npm run seed:sync              # Sync Snaplet seed
npm run seed:db                # Seed database with test data
npm run seed:db:dry            # Dry run seeding (preview)
npm run seed:db:reset          # Reset and seed database
npm run seed:financial         # Seed financial data
npm run seed:project           # Seed project financial data
```

#### Schema and Utilities

```bash
npm run schema:extract         # Extract schema from types
npm run schema:docs            # Generate schema documentation
npm run check:routes           # Check for Next.js route conflicts
```

### Frontend Scripts

Frontend-specific commands from `frontend/package.json`.

#### Development

```bash
npm run dev                    # Start Next.js dev server (port 3000)
npm run build                  # Build Next.js for production
npm start                      # Start production server
npm run typecheck              # TypeScript type checking
npm run lint                   # Run ESLint
npm run lint:fix               # Run ESLint with auto-fix
npm run quality                # Run typecheck + lint
npm run quality:fix            # Run typecheck + lint with fix
```

#### Database (Supabase)

```bash
npm run db:types               # Generate Supabase types
npm run db:scan                # Check Supabase patterns
npm run db:generate            # Generate Drizzle migrations
npm run db:migrate             # Run Drizzle migrations
npm run db:push                # Push Drizzle schema changes
npm run db:studio              # Open Drizzle Studio
npm run db:introspect          # Introspect database schema
```

#### E2E Testing (Playwright)

```bash
npm run test                   # Run Playwright tests
npm run test:ui                # Open Playwright UI mode
npm run test:headed            # Run tests with browser visible
npm run test:report            # View Playwright test report
npm run test:screenshots       # Run screenshot tests
npm run test:auth              # Run auth verification tests
```

#### Visual Regression Testing

```bash
npm run test:visual            # Run visual regression tests
npm run test:visual:update     # Update visual snapshots
npm run test:visual:report     # View visual regression report
```

#### Video Testing

```bash
npm run test:video             # Run video recording tests
npm run test:video:ui          # Run video tests in UI mode
```

#### Performance Testing

```bash
npm run test:performance       # Run performance metrics tests
npm run test:performance:report # View performance report
```

#### Accessibility Testing

```bash
npm run test:a11y              # Run accessibility tests
npm run test:a11y:report       # View accessibility report
```

#### Form Testing

```bash
npm run test:forms             # Run comprehensive form tests
npm run test:forms:ui          # Run form tests in UI mode
npm run test:forms:headed      # Run form tests with browser visible
```

#### Submittal Testing

```bash
npm run test:submittals:smoke        # Run submittal smoke tests
npm run test:submittals:smoke:serve  # Start dev server and run smoke tests
```

#### Unit Testing (Jest)

```bash
npm run test:unit              # Run Jest unit tests
npm run test:unit:watch        # Run Jest in watch mode
npm run test:unit:coverage     # Run Jest with coverage report
npm run test:unit:ci           # Run Jest in CI mode
```

#### Allure Reports

```bash
npm run test:allure:report     # Generate Allure report
npm run test:allure:open       # Open Allure report in browser
```

#### Test Data Seeding

```bash
npm run seed:test              # Seed test data (JavaScript)
npm run seed:test:full         # Seed test data (TypeScript)
npm run seed:test:clear        # Clear test data
```

#### Utilities

```bash
npm run set-admin              # Set user as admin
npm run log:ts-errors          # Log TypeScript errors to file
npm run prepare                # Setup Husky git hooks
```

---

## Shell Scripts

Utility shell scripts in the `scripts/` directory.

### Route Validation

```bash
bash scripts/check-route-conflicts.sh
# Check for Next.js dynamic route naming conflicts
```

### API Verification

```bash
bash scripts/verify-api-routes.sh
# Verify all API routes for common issues (auth, async params, etc.)
```

### Phase Verification

```bash
bash scripts/verify-phase1-fixes.sh
# Verify Phase 1 implementation fixes
```

### Migration Commands

```bash
npm run db:push
# Push Supabase migrations and regenerate frontend database types
```

```bash
npm run db:migrations:verify-clean
# Verify local/remote migration ledger state
```

```bash
npm run db:types
# Regenerate Supabase types after migration changes
```

Do not use one-off root migration scripts for database changes. Current
migrations must go through `supabase/migrations/**`, `npm run db:push`, and the
ledger/type verification commands above.

### Utility Scripts

```bash
node scripts/wait-for-http.js <url>
# Wait for HTTP endpoint to be available (used in CI/CD)
```

### Type Generation

```bash
./scripts/gen-types.sh
# Generate Supabase TypeScript types (alias for db:types)
```

### Pattern Checking

```bash
./scripts/check-supabase-patterns.sh
# Check for Supabase pattern violations (alias for db:scan)
```

---

## Quick Reference

### Most Common Commands

**Start Development:**

```bash
npm run dev                    # Start both frontend and backend
```

**Run Tests:**

```bash
npm run test:unit              # Unit tests
npm run test                   # E2E tests
```

**Database Operations:**

```bash
npm run db:types               # Generate types (REQUIRED before DB work)
npm run seed:db                # Seed database
```

**Code Quality:**

```bash
npm run quality                # Typecheck + lint
npm run quality:fix            # Typecheck + lint with auto-fix
```

**Design System:**

```bash
/design-check                  # Quick design check
/verify                        # Verify current task
```

**Feature Development:**

```bash
/create-feature <Name>         # Create new feature with validation
/verify-task                   # Verify implementation
```

---

## Command Aliases

Common shorthand commands:

| Alias | Full Command | Description |
|-------|--------------|-------------|
| `db:types` | `./scripts/gen-types.sh` | Generate Supabase types |
| `db:scan` | `./scripts/check-supabase-patterns.sh` | Check Supabase patterns |
| `quality` | `typecheck && lint` | Run quality checks |
| `quality:fix` | `typecheck && lint:fix` | Fix quality issues |

---

## Notes

- **ALWAYS run `npm run db:types`** before any database work (see [SUPABASE-GATE.md](../../.claude/rules/SUPABASE-GATE.md))
- Use specific parameter names in routes: `[projectId]`, NOT `[id]` (see [CRITICAL-NEXTJS-ROUTING-RULES.md](../../.claude/rules/CRITICAL-NEXTJS-ROUTING-RULES.md))
- Run `npm run check:routes` before creating dynamic routes
- Use `/verify-task` after implementing features to ensure all requirements are met
- Design system commands require live preview environment (localhost:3000)

---

## Adding New Commands

### Adding a Claude Slash Command

1. Create markdown file in `.claude/commands/<category>/<command-name>.md`
2. Add frontmatter with metadata
3. Document command usage and examples
4. Update this COMMANDS.md file

### Adding an npm Script

1. Add script to `package.json` (root or frontend)
2. Use semantic naming (e.g., `test:unit`, `db:types`)
3. Document in this file
4. Add to `.husky` hooks if needed

### Adding a Shell Script

1. Create script in `scripts/` directory
2. Make executable: `chmod +x scripts/your-script.sh`
3. Add shebang: `#!/bin/bash`
4. Document in this file
5. Consider adding npm script alias

---

## See Also

- [CLAUDE.md](../../CLAUDE.md) - Project instructions for Claude
- [PATTERNS.md](../../.claude/PATTERNS.md) - Code patterns and conventions
- [WORKFLOW.md](../../.claude/WORKFLOW.md) - Development workflows
- [E2E-TESTING-STANDARDS.md](../../.claude/rules/E2E-TESTING-STANDARDS.md) - Testing standards
