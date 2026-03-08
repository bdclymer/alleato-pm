# Secure API Key Setup Guide

**Last Updated:** 2026-02-02
**Security Level:** Production Ready

---

## 🔐 Authentication Method

The Anthropic Claude API uses **API keys** (not OAuth) for authentication.

**API Key Format:** `sk-ant-api03-...` (starts with `sk-ant-`)

**Get your key:** https://console.anthropic.com/settings/keys

---

## ✅ Recommended Setup (Most Secure)

### Option 1: `.env.local` File (Recommended)

**Step 1: Create `.env.local`**
```bash
cp .env.local.example .env.local
```

**Step 2: Add your API key**
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

**Step 3: Verify it's gitignored**
```bash
cat .gitignore | grep .env.local
# Should see: .env*.local
```

✅ **Benefits:**
- Never committed to git (already in `.gitignore`)
- Automatically loaded by scripts
- Easy to rotate keys
- Team-friendly (each dev has their own)

### Option 2: Shell Environment Variable

**For current session:**
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-your-key"
```

**Permanent (add to `~/.zshrc` or `~/.bashrc`):**
```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-your-key"' >> ~/.zshrc
source ~/.zshrc
```

✅ **Benefits:**
- Works across all projects
- No files to manage
- Good for CI/CD

### Option 3: System Keychain (Most Secure)

**macOS Keychain:**
```bash
# Store in keychain
security add-generic-password \
  -a "$USER" \
  -s "anthropic-api-key" \
  -w "sk-ant-api03-your-key"

# Retrieve and export
export ANTHROPIC_API_KEY=$(security find-generic-password \
  -a "$USER" \
  -s "anthropic-api-key" \
  -w)
```

**Create helper script** (`scripts/load-api-key.sh`):
```bash
#!/bin/bash
export ANTHROPIC_API_KEY=$(security find-generic-password \
  -a "$USER" \
  -s "anthropic-api-key" \
  -w 2>/dev/null)

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ API key not found in keychain"
  echo "Add it with: security add-generic-password -a '$USER' -s 'anthropic-api-key' -w 'sk-ant-your-key'"
  exit 1
fi

echo "✅ API key loaded from keychain"
```

**Usage:**
```bash
source scripts/load-api-key.sh
npx tsx scripts/cache-example.ts
```

✅ **Benefits:**
- Most secure (encrypted by OS)
- No plaintext files
- Protected by system authentication

---

## 🚫 What NOT to Do

### ❌ NEVER commit API keys
```bash
# BAD - Don't do this!
const apiKey = "sk-ant-api03-hardcoded-key";
```

### ❌ NEVER put keys in code
```typescript
// BAD - Don't do this!
const client = new Anthropic({
  apiKey: "sk-ant-api03-hardcoded-key"
});
```

### ❌ NEVER commit `.env.local`
Already protected by `.gitignore`, but double-check:
```bash
git status
# Should NOT show .env.local
```

---

## ✅ How Our Scripts Handle Keys

All scripts automatically try these methods **in order**:

1. **Environment variable** `ANTHROPIC_API_KEY`
2. **`.env.local` file** (auto-loaded if exists)
3. **`.env` file** (fallback)

**You don't need to do anything** - just set the key using one of the recommended methods above.

### Example: Using `.env.local`

```bash
# 1. Create .env.local
echo "ANTHROPIC_API_KEY=sk-ant-api03-your-key" > .env.local

# 2. Run scripts (automatically loads .env.local)
npx tsx scripts/cache-example.ts
npm run cache:stats

# That's it! No export needed.
```

---

## 🔒 Security Best Practices

### 1. Rotate Keys Regularly
- Generate new API keys every 90 days
- Revoke old keys after rotation
- Update in all locations

### 2. Use Different Keys for Different Environments
```bash
# .env.local (development)
ANTHROPIC_API_KEY=sk-ant-api03-dev-key

# .env.production (production - NOT in git)
ANTHROPIC_API_KEY=sk-ant-api03-prod-key
```

### 3. Set Usage Limits
In Anthropic Console (https://console.anthropic.com):
- Set monthly spending limits
- Enable usage alerts
- Monitor unusual activity

### 4. Restrict Key Permissions
- Use separate keys for different applications
- Revoke keys you're not using
- Never share keys between team members

---

## 🧪 Verify Your Setup

### Quick Test
```bash
# Check if key is set
echo $ANTHROPIC_API_KEY | sed 's/sk-ant-api03-.*/sk-ant-api03-***REDACTED***/'

# Should output:
# sk-ant-api03-***REDACTED***
```

### Run Example
```bash
npx tsx scripts/cache-example.ts
```

**If you see:**
- ✅ API responses → Key is working!
- ❌ "Invalid API key" → Check your key
- ❌ "API key not found" → Key not set

---

## 🔄 Rotating Keys

**Step 1: Generate new key**
1. Go to https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy new key

**Step 2: Update `.env.local`**
```bash
# Update key in .env.local
sed -i '' 's/ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=sk-ant-api03-new-key/' .env.local
```

**Step 3: Test**
```bash
npx tsx scripts/cache-example.ts
```

**Step 4: Revoke old key**
1. Go to https://console.anthropic.com/settings/keys
2. Find old key
3. Click "Revoke"

---

## 🚀 CI/CD Setup

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test with Cache

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm install

      - name: Run cache tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npm run cache:stats
```

**Add secret:**
1. Go to repo Settings → Secrets → Actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your key
5. Click "Add secret"

### Vercel/Netlify
```bash
# Add environment variable in dashboard
ANTHROPIC_API_KEY=sk-ant-api03-your-key
```

---

## 📋 Checklist

Before using the cache system:

- [ ] API key obtained from console.anthropic.com
- [ ] Key stored securely (`.env.local` or keychain)
- [ ] `.env.local` is in `.gitignore`
- [ ] Never committed key to git
- [ ] Tested with `npx tsx scripts/cache-example.ts`
- [ ] Set usage limits in Anthropic Console
- [ ] Documented key rotation schedule

---

## 🆘 Troubleshooting

### "Invalid API Key"
**Cause:** Wrong key format or typo
**Fix:**
1. Check key starts with `sk-ant-`
2. Copy-paste from console (don't type manually)
3. No extra spaces or quotes

### "API Key Not Found"
**Cause:** Not set in environment
**Fix:**
```bash
# Check if set
echo $ANTHROPIC_API_KEY

# If empty, set it
export ANTHROPIC_API_KEY="sk-ant-your-key"
# OR create .env.local
```

### "Rate Limited"
**Cause:** Too many requests
**Fix:**
1. Check usage in console
2. Wait 1 minute
3. Reduce request rate
4. Contact Anthropic for limit increase

### "Insufficient Credits"
**Cause:** No credits in account
**Fix:**
1. Add payment method in console
2. Add credits
3. Verify billing is active

---

## 🔗 Resources

- **Get API Key:** https://console.anthropic.com/settings/keys
- **API Documentation:** https://docs.anthropic.com/claude/reference/getting-started-with-the-api
- **Usage Dashboard:** https://console.anthropic.com/settings/usage
- **Billing:** https://console.anthropic.com/settings/billing

---

## 📞 Support

**Security concern?** Email: security@anthropic.com
**Billing issue?** Console: https://console.anthropic.com/settings/billing
**Technical help?** Docs: https://docs.anthropic.com

---

**✅ Following these practices keeps your API keys secure while enabling convenient development!**
