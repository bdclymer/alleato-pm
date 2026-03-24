# Prompt Caching Quick Reference

**For full details, see:** [docs/CLAUDE-CACHING-STRATEGY.md](../docs/CLAUDE-CACHING-STRATEGY.md)

---

## TL;DR

Cache these in EVERY request (in this order):

1. **CLAUDE.md** (~4.5K tokens) - Core instructions
2. **Rules** (~15K tokens) - Mandatory gates
3. **database.types.ts** (~136K tokens) - Schema (if doing DB work)

**Total cache:** ~155K tokens
**Cost per request after first:** $0.05 instead of $4.74 (90% savings)

---

## Quick Decision Tree

```
Is this DB-related work?
├─ YES → Cache: CLAUDE.md + Rules + DB Types
└─ NO  → Cache: CLAUDE.md + Rules only

Is this a multi-step workflow?
├─ YES → Add 4th breakpoint on conversation history
└─ NO  → Stop at 2-3 breakpoints

Is this feature implementation from PRP?
├─ YES → Cache: CLAUDE.md + Rules + DB Types + PRP
└─ NO  → See above
```

---

## Cache Placement (JSON)

```json
{
  "system": [
    {
      "type": "text",
      "text": "<CLAUDE.md content>",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<.claude/rules/*.md concatenated>",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<database.types.ts content>",
      "cache_control": {"type": "ephemeral"}
    }
  ]
}
```

---

## What to Cache

| Content | Cache? | Why |
|---------|--------|-----|
| CLAUDE.md | ✅ ALWAYS | Core instructions, changes rarely |
| .claude/rules/*.md | ✅ ALWAYS | Mandatory gates |
| database.types.ts | ✅ IF DB WORK | Huge (546KB), changes on migration only |
| PRPs | ✅ IF IMPLEMENTING | Stable during implementation |
| Scaffolds | ✅ IF MULTI-FILE | Reused across generation |
| Git status | ❌ NEVER | Changes every commit |
| Current code | ❌ NEVER | Changes constantly |
| Test results | ❌ NEVER | Ephemeral output |

---

## Cost Breakdown (Sonnet 4.5)

| Operation | Cost per Million Tokens |
|-----------|------------------------|
| Base input | $3.00 |
| Cache write (5-min) | $3.75 (+25%) |
| Cache read | $0.30 (-90%) |

**Example (155K token cache):**
- First request: $0.58 (write)
- Next 9 requests: $0.43 total (reads)
- **Total for 10 requests: $1.01** (vs $4.74 without caching)

---

## Gotchas

1. **Content must be 100% identical** - even whitespace matters
2. **Minimum 1024 tokens** to cache (Sonnet 4.5)
3. **5-minute TTL** - refreshes on each use
4. **20-block lookback** - add explicit breakpoints if >20 blocks
5. **Cache invalidation:** Changing tools, images, or thinking settings breaks cache

---

## Monitoring

```typescript
// Check if cache hit
if (response.usage.cache_read_input_tokens > 0) {
  console.log('✅ Cache HIT:', response.usage.cache_read_input_tokens, 'tokens');
} else {
  console.log('❌ Cache MISS - creating new cache');
}
```

---

## When to Use 1-Hour Cache

Only if:
- Requests are >5 min apart (user interaction delays)
- Long-running agent workflows
- Batch processing with delays

**Cost:** $6/MTok write (+60% vs 5-min) but same read cost

---

## Files to Load (TypeScript Example)

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

// Always cache these
const CLAUDE_MD = readFileSync(join(projectRoot, 'CLAUDE.md'), 'utf-8');

const RULES = [
  'SUPABASE-GATE.md',
  'CRITICAL-NEXTJS-ROUTING-RULES.md',
  'E2E-TESTING-STANDARDS.md',
  'AUTHENTICATION-NEVER-ASK-AGAIN.md',
  'FILE-ORGANIZATION-GATE.md',
  'ROOT-CAUSE-GATE.md',
  'NEXTJS-DEBUG-PROTOCOL.md'
].map(f => readFileSync(join(projectRoot, '.claude/rules', f), 'utf-8')).join('\n\n---\n\n');

// Cache if DB work
const DB_TYPES = readFileSync(
  join(projectRoot, 'frontend/src/types/database.types.ts'),
  'utf-8'
);
```

---

## Checklist

Before sending cached request:

- [ ] Content is static (no timestamps, random IDs, etc.)
- [ ] cache_control on LAST block of each section
- [ ] Each cached section is ≥1024 tokens
- [ ] Files are read in consistent order
- [ ] Monitoring is in place to track hits/misses
