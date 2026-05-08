# MSAL Node.js + Dataverse API Reference

> This document contains practical implementation details for the MS Project integration.
> Source: Research conducted 2026-03-16.

## Key Facts

1. **Use `@azure/msal-node@2.x`** (NOT `@azure/msal-browser` or `@azure/msal-react`)
2. **MSAL does NOT expose refresh tokens directly** — serialize the entire cache blob via `cca.getTokenCache().serialize()`
3. **OperationSet is asynchronous** — `ExecuteOperationSetV1` returns immediately, changes persist in background (wait 3-5s)
4. **Project license required** — only users with a Microsoft Project license can call Schedule APIs
5. **Dataverse rate limits**: 6,000 requests per 5-minute window per user, 52 concurrent requests

## Token Management Pattern

```typescript
// MSAL token cache approach (NOT direct refresh token storage):
// 1. After OAuth callback:
const serializedCache = cca.getTokenCache().serialize();
const encrypted = encryptToken(serializedCache); // AES-256-GCM
// Store `encrypted` in database

// 2. For subsequent API calls:
const decrypted = decryptToken(storedEncryptedCache);
cca.getTokenCache().deserialize(decrypted);
const account = await cca.getTokenCache().getAccountByHomeId(homeAccountId);
const response = await cca.acquireTokenSilent({ account, scopes: [...] });
// MSAL handles refresh internally from the deserialized cache

// 3. After successful silent acquisition, re-serialize and store updated cache
const updatedCache = encryptToken(cca.getTokenCache().serialize());
// Update database with new cache (refresh token rotation)
```

## AES-256-GCM Token Encryption

```typescript
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) throw new Error("TOKEN_ENCRYPTION_KEY not set");
  return Buffer.from(keyHex, "hex"); // Must be 32 bytes (64 hex chars)
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// Generate key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Global Discovery Service

```typescript
// Discover user's Dataverse org URL after OAuth
const res = await fetch(
  "https://globaldisco.crm.dynamics.com/api/discovery/v2.0/Instances",
  {
    headers: {
      Authorization: `Bearer ${accessToken}`, // scoped to globaldisco.crm.dynamics.com
      "OData-MaxVersion": "4.0",
      Accept: "application/json",
    },
  }
);
const data = await res.json();
// data.value[0].ApiUrl = "https://contoso.crm.dynamics.com"
```

## OperationSet Batching

```typescript
// Limit: 200 operations per OperationSet
// If > 200 tasks, split into batches:
const BATCH_SIZE = 200;
for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
  const batch = tasks.slice(i, i + BATCH_SIZE);
  const opSetId = await client.createOperationSet(projectId, `Batch ${i / BATCH_SIZE + 1}`);
  for (const task of batch) {
    await client.addPssCreate(opSetId, taskEntity);
  }
  await client.executeOperationSet(opSetId);
  await new Promise(r => setTimeout(r, 3000)); // Wait for async persistence
}
```

## Dataverse Required Headers

Every request to Dataverse Web API MUST include:
```
Authorization: Bearer {token}
OData-MaxVersion: 4.0
OData-Version: 4.0
Accept: application/json
Content-Type: application/json; charset=utf-8
```

## Azure AD Scopes

```
# Delegated (user auth) — required for Schedule APIs:
https://{org}.crm.dynamics.com/user_impersonation

# Discovery service:
https://globaldisco.crm.dynamics.com/.default

# Standard OIDC (always include):
openid profile offline_access
```

## Multi-Tenant Setup

- Authority: `https://login.microsoftonline.com/common` (not specific tenant)
- Each user has different org URL — discover via Global Discovery Service
- Store `homeAccountId` per user for cache lookup
- Token cache is per-user (never mix users' caches)

## Retry Pattern for 429

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as { statusCode?: number };
      if (e.statusCode === 429 && attempt < maxRetries) {
        attempt++;
        await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
        continue;
      }
      throw err;
    }
  }
}
```
