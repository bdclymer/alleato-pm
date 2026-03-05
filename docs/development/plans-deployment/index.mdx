# Deployment - Production Environment Setup

**Purpose**: This document defines the deployment strategy and production environment configuration for Alleato OS.

**Status**: Deployment infrastructure configured - ongoing refinements

**Related Plans**:

- [PLANS_DOC.md](./PLANS_DOC.md) - Master plan index
- [Testing Strategy](./plans-testing-strategy.md) - Pre-deployment testing requirements
- [Schema Modeling](./plans-schema-modeling.md) - Database deployment considerations

---

## Overview

Alleato OS uses a modern cloud deployment stack:

- **Frontend**: Vercel (Next.js optimized)
- **Backend**: Render (Python FastAPI)
- **Database**: Supabase (managed PostgreSQL)
- **Storage**: Supabase Storage (S3-compatible)
- **CI/CD**: GitHub Actions

### Deployment Philosophy

1. **Zero-downtime deployments**: Use preview environments and gradual rollouts
2. **Environment parity**: Dev, staging, and production should be identical
3. **Automated testing**: All tests must pass before deployment
4. **Observability**: Monitor performance, errors, and usage metrics
5. **Rollback ready**: Quick rollback capability for failed deployments

---

## Environment Configuration

### Environment Variables

All environments require these variables:

**Frontend (.env)**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# Environment
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```text
**Backend (.env)**:
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...

# Fireflies.ai
FIREFLIES_API_KEY=your-fireflies-key

# Environment
ENVIRONMENT=production
LOG_LEVEL=info
```diff
---

## Frontend Deployment (Vercel)

### Initial Setup

1. **Install Vercel CLI**:

```bash
npm install -g vercel
```text
2. **Link Project**:
```bash
cd frontend
vercel link
```

1. **Configure Environment Variables**:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
```markdown
### Deployment Commands

**Preview Deployment** (for testing):
```bash
cd frontend
vercel
```text
**Production Deployment**:

```bash
cd frontend
vercel --prod
```markdown
### Vercel Configuration

**File**: `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "build": {
    "env": {
      "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key",
      "OPENAI_API_KEY": "@openai-api-key"
    }
  }
}
```

### Build Optimization

**Next.js Config** (`next.config.js`):

```javascript
module.exports = {
  // Enable SWC minification for faster builds
  swcMinify: true,

  // Optimize images
  images: {
    domains: ['your-project.supabase.co'],
    formats: ['image/avif', 'image/webp']
  },

  // Reduce bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // Enable experimental features
  experimental: {
    optimizeCss: true
  }
}
```bash
---

## Backend Deployment (Render)

### Initial Setup

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Create New Web Service**:
   - Connect GitHub repository
   - Select `backend` directory as root
   - Choose Python runtime
   - Set build command: `pip install -r requirements.txt`
   - Set start command: `uvicorn src.api.main:app --host 0.0.0.0 --port $PORT`

3. **Configure Environment Variables** in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `OPENAI_API_KEY`
   - `FIREFLIES_API_KEY`
   - `ENVIRONMENT=production`

### Docker Deployment (Alternative)

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```diff
**Build and Deploy**:

```bash
docker build -t alleato-backend .
docker run -p 8000:8000 alleato-backend
```diff
---

## Database Deployment (Supabase)

### Production Database Setup

1. **Create Production Project** in Supabase dashboard

2. **Apply Migrations**:
```bash
# Link to production project
npx supabase link --project-ref your-project-ref

# Apply all migrations
npx supabase db push
```

1. **Enable Row Level Security**:

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```sql
4. **Create RLS Policies**:
```sql
-- Example: Users can only see their project data
CREATE POLICY "Users can view their project data"
  ON projects FOR SELECT
  USING (id IN (
    SELECT project_id FROM project_members
    WHERE user_id = auth.uid()
  ));
```sql
1. **Set up Backups**:
   - Enable Point-in-Time Recovery (PITR) in Supabase dashboard
   - Configure daily backups
   - Test restore procedure

### Database Performance

**Indexes**:

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_commitments_project_id ON commitments(project_id);
CREATE INDEX idx_budget_items_cost_code ON budget_items(cost_code_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
```text
**Query Optimization**:
```sql
-- Use views for complex queries
CREATE VIEW project_financial_summary AS
SELECT
  p.id,
  p.name,
  COALESCE(SUM(c.contract_value), 0) as total_contract_value,
  COALESCE(SUM(cm.commitment_value), 0) as total_commitments
FROM projects p
LEFT JOIN contracts c ON c.project_id = p.id
LEFT JOIN commitments cm ON cm.project_id = p.id
GROUP BY p.id, p.name;
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

**1. Frontend CI** (`.github/workflows/frontend-ci.yml`):

```yaml
name: Frontend CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run linter
        working-directory: frontend
        run: npm run lint

      - name: Run type check
        working-directory: frontend
        run: npm run typecheck

      - name: Run tests
        working-directory: frontend
        run: npm run test

      - name: Build
        working-directory: frontend
        run: npm run build
```yaml
**2. Playwright Tests** (`.github/workflows/playwright-tests.yml`):
```yaml
name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Install Playwright browsers
        working-directory: frontend
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        working-directory: frontend
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: frontend/test-results/
```yaml
**3. Backend CI** (`.github/workflows/backend-ci.yml`):

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        working-directory: backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run linter
        working-directory: backend
        run: flake8 src/

      - name: Run type checker
        working-directory: backend
        run: mypy src/

      - name: Run tests
        working-directory: backend
        run: pytest
```diff
---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing in CI
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No linting errors (`npm run lint`)
- [ ] Database migrations tested locally
- [ ] Environment variables configured
- [ ] Performance budgets met
- [ ] Accessibility tests passing
- [ ] Visual regression tests reviewed

### Deployment Steps

1. **Create Deployment Branch**:
```bash
git checkout -b release/v1.0.0
```

1. **Update Version**:

```bash
# Update package.json version
npm version patch  # or minor, or major
```text
3. **Tag Release**:
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```text
1. **Deploy to Staging**:

```bash
# Frontend
vercel --env=staging

# Backend
# Trigger Render deployment via dashboard or API
```bash
5. **Run Smoke Tests** on staging:
```bash
BASE_URL=https://staging.alleato.com npx playwright test tests/smoke/
```

1. **Deploy to Production**:

```bash
# Frontend
vercel --prod

# Backend
# Promote staging to production in Render dashboard
```bash
7. **Verify Production**:
```bash
BASE_URL=https://alleato.com npx playwright test tests/smoke/
```sql
### Post-Deployment

- [ ] Verify all critical pages load
- [ ] Check error tracking dashboard (Sentry/LogRocket)
- [ ] Monitor performance metrics
- [ ] Verify database queries performing well
- [ ] Check for console errors
- [ ] Validate user authentication flows

---

## Monitoring & Observability

### Error Tracking

**Recommended**: Sentry

**Setup**:

```bash
npm install @sentry/nextjs
```sql
**Configuration** (`sentry.client.config.ts`):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  }
});
```

### Performance Monitoring

**Vercel Analytics**:

- Automatically enabled for Vercel deployments
- Tracks Core Web Vitals
- Real User Monitoring (RUM)

**Custom Metrics**:

```typescript
// Track custom performance metrics
export function trackMetric(name: string, value: number) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.measure(name, {
      start: 0,
      duration: value
    });
  }
}
```javascript
### Logging

**Frontend** (client-side):
```typescript
// Use console.log only in development
const log = process.env.NODE_ENV === 'development'
  ? console.log
  : () => {};
```diff
**Backend** (server-side):

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```diff
---

## Rollback Procedures

### Frontend Rollback (Vercel)

1. **Via Vercel Dashboard**:
   - Go to Deployments
   - Find previous successful deployment
   - Click "Promote to Production"

2. **Via CLI**:
```bash
vercel rollback https://alleato-abc123.vercel.app
```

### Backend Rollback (Render)

1. **Via Render Dashboard**:
   - Go to service deployments
   - Select previous deployment
   - Click "Redeploy"

2. **Via Git**:

```bash
git revert HEAD
git push origin main
# Render auto-deploys on push
```sql
### Database Rollback (Supabase)

**Using PITR (Point-in-Time Recovery)**:
```sql
-- Restore to specific timestamp
SELECT * FROM pg_restore('2025-12-17 10:00:00');
```javascript
**Manual Rollback**:

```bash
# Revert last migration
npx supabase db reset --db-url your-production-url
```javascript
---

## Security Considerations

### SSL/TLS

- ✅ Vercel provides automatic HTTPS
- ✅ Render provides automatic HTTPS
- ✅ Supabase enforces SSL connections

### API Security

**Rate Limiting**:
```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function middleware(request: Request) {
  const { success } = await ratelimit.limit(request.ip);
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
}
```

**CORS Configuration**:

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://alleato.com" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE" }
        ]
      }
    ];
  }
};
```bash
### Environment Secrets

**Never commit**:
- API keys
- Database passwords
- Service role keys
- OAuth secrets

**Use Vercel/Render environment variables** for all secrets.

---

## Cost Optimization

### Vercel

**Free Tier Limits**:
- 100 GB bandwidth/month
- 100 hours of build time/month

**Pro Tier**: $20/month
- 1 TB bandwidth
- Unlimited builds

### Render

**Free Tier**: $0 (with limitations)
- Spins down after inactivity
- 512 MB RAM

**Starter Tier**: $7/month
- Always on
- 512 MB RAM

### Supabase

**Free Tier**:
- 500 MB database
- 1 GB file storage
- 50,000 monthly active users

**Pro Tier**: $25/month
- 8 GB database
- 100 GB file storage
- 100,000 monthly active users

---

## Disaster Recovery

### Backup Strategy

1. **Database Backups** (Supabase):
   - Daily automatic backups
   - 7-day retention on free tier
   - 30-day retention on pro tier

2. **Code Backups** (GitHub):
   - All code versioned in Git
   - Multiple branches for redundancy

3. **Asset Backups** (Supabase Storage):
   - Replicated across multiple availability zones

### Recovery Procedures

**Scenario 1: Database Corruption**
```bash
# Restore from backup
npx supabase db restore --backup-id backup-20251217
```text
**Scenario 2: Frontend Deployment Failure**

```bash
# Rollback to previous version
vercel rollback
```

**Scenario 3: Complete Outage**

1. Check status pages (Vercel, Render, Supabase)
2. Review error logs in Sentry
3. Rollback recent deployments
4. Contact support if infrastructure issue

---

**Last Updated**: 2025-12-17
**Maintained By**: Alleato Engineering Team
