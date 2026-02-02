# Claude Code Permissions Configuration Guide

**Last Updated:** 2026-01-08

## Summary of Changes Made

Your Claude Code settings have been updated to dramatically reduce approval notifications while maintaining safety for critical operations.

### Configuration File
**Location:** `~/.claude/settings.json`

---

## What Was Changed

### 1. ✅ Added `defaultMode: "acceptEdits"`
This enables automatic acceptance of file edit permissions for the session.

### 2. ✅ Created Comprehensive Permission Rules

#### **ALLOW (Auto-Approved) - No Prompts:**
- ✅ All file reads (`Read(**)`), searches (`Glob`, `Grep`)
- ✅ Edit/Write for common file types (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.html`, `.yaml`)
- ✅ Safe npm/pnpm/npx commands
- ✅ Git info commands (`status`, `diff`, `log`, `branch`)
- ✅ Safe bash utilities (`ls`, `pwd`, `cd`, `find`, `grep`, `cat`, `echo`, `mkdir`, `touch`, etc.)

#### **ASK (Still Prompt) - Safety First:**
- ⚠️ Git write operations (`push`, `commit`, `merge`, `rebase`, `reset`)
- ⚠️ File system changes (`rm`, `mv`, `cp`)
- ⚠️ Network requests (`curl`, `wget`, `WebFetch`)

#### **DENY (Always Block) - Security:**
- 🚫 Sudo commands
- 🚫 Dangerous deletions (`rm -rf /`)
- 🚫 Insecure permissions (`chmod 777`)
- 🚫 Environment files (`.env*`)
- 🚫 Secrets directory
- 🚫 Credentials files

---

## Expected Behavior After These Changes

### ✅ **No More Prompts For:**
- Reading any file
- Searching/grepping codebase
- Editing TypeScript, JavaScript, JSON, Markdown, CSS files
- Running npm/pnpm scripts
- Running tests or builds
- Checking git status, diffs, logs
- Basic bash commands (ls, cd, pwd, mkdir, etc.)

### ⚠️ **Still Get Prompts For (Intentional):**
- Git commits and pushes
- File deletions (rm)
- Moving/copying files
- Network requests
- Any git operations that modify history

### 🚫 **Always Blocked:**
- Sudo commands
- Reading secrets/credentials
- Dangerous system operations

---

## Dangerously Permissions Status

**Answer:** ❌ **NOT SET** - Dangerously permissions are NOT enabled

Your configuration is **safe** and uses granular permission rules instead of bypassing all permissions. This is the recommended approach.

If you need to temporarily bypass all permissions (emergency only), you can:
```bash
claude --dangerously-skip-permissions
```

But this is **not recommended** for regular use.

---

## How to Test Your New Settings

After restarting Claude Code (or reloading the window in VSCode):

1. **Test auto-approved operations:**
   ```
   "Read the package.json file"
   "Search for all TypeScript files"
   "Edit this component to add a new prop"
   "Run npm test"
   "Show me git status"
   ```

   **Expected:** No approval prompts

2. **Test ask-before operations:**
   ```
   "Commit these changes"
   "Push to remote"
   "Delete this file"
   ```

   **Expected:** Approval prompt appears

3. **Test denied operations:**
   ```
   "Read the .env file"
   "Run sudo npm install"
   ```

   **Expected:** Blocked/denied

---

## Further Customization

### Add More Auto-Approved Commands

Edit `~/.claude/settings.json` and add to the `"allow"` array:

```json
{
  "permissions": {
    "allow": [
      "Bash(docker ps)",           // Docker commands
      "Bash(kubectl *)",           // Kubernetes
      "Edit(**/*.sql)",            // SQL files
      "Bash(python *)"             // Python scripts
    ]
  }
}
```

### Project-Specific Overrides

Create `.claude/settings.local.json` in your project (not committed to git):

```json
{
  "permissions": {
    "allow": [
      "Bash(supabase *)",
      "Edit(supabase/**)"
    ]
  }
}
```

### Check Active Permissions

In Claude Code, use the command:
```
/permissions
```

This shows all active permission rules and their precedence.

---

## Troubleshooting

### Still Getting Too Many Prompts?

1. **Check if settings loaded:**
   - Restart Claude Code / Reload VSCode window
   - Run `/permissions` to verify rules are active

2. **Add specific commands to allow list:**
   - When you get a prompt, note the exact command
   - Add it to the `"allow"` array with wildcards

3. **Use hooks for auto-approval:**
   ```json
   {
     "hooks": {
       "PermissionRequest": [
         {
           "matcher": "tool:Bash(npm run test*)",
           "hooks": [
             {
               "type": "command",
               "command": "exit 0"
             }
           ]
         }
       ]
     }
   }
   ```

### Not Getting Enough Prompts?

If you feel the settings are too permissive:

1. **Move commands from `allow` to `ask`:**
   ```json
   "allow": [
     // Remove: "Bash(npm install*)"
   ],
   "ask": [
     "Bash(npm install*)"  // Move here instead
   ]
   ```

2. **Add more to deny list:**
   ```json
   "deny": [
     "Read(config/secrets.json)",
     "Bash(npx prisma migrate*)"
   ]
   ```

---

## Security Best Practices

✅ **DO:**
- Use granular `allow`, `ask`, `deny` rules
- Keep git operations in the `ask` list
- Protect secrets and credentials in `deny` list
- Review permissions periodically

❌ **DON'T:**
- Use `--dangerously-skip-permissions` in production
- Allow `sudo` commands
- Auto-approve file deletions
- Skip permission rules for convenience

---

## Settings File Hierarchy

**Remember the precedence order:**

1. Managed settings (system-wide, admin-deployed)
2. Command line arguments (temporary)
3. `.claude/settings.local.json` (project, not in git)
4. `.claude/settings.json` (project, in git)
5. `~/.claude/settings.json` ← **Your updated file**

Project-level settings override user settings, so you can always tighten permissions per-project.

---

## Quick Reference Card

| Operation | Approval? | Why? |
|-----------|-----------|------|
| Read files | ✅ Auto | Safe, read-only |
| Edit code | ✅ Auto | `acceptEdits` mode |
| Run tests | ✅ Auto | Safe npm script |
| Git status | ✅ Auto | Read-only info |
| Git commit | ⚠️ Ask | Writes to repo |
| Git push | ⚠️ Ask | Remote changes |
| Delete file | ⚠️ Ask | Destructive |
| Read .env | 🚫 Deny | Security |
| Sudo | 🚫 Deny | Dangerous |

---

## Support & Documentation

- **Official Docs:** [Claude Code IAM Documentation](https://code.claude.com/docs/en/iam.md)
- **Settings Guide:** [Claude Code Settings](https://code.claude.com/docs/en/settings.md)
- **Check permissions:** Run `/permissions` in Claude Code
- **View this guide:** `documentation/CLAUDE-CODE-PERMISSIONS-GUIDE.md`

---

## Changelog

### 2026-01-08 - Initial Configuration
- Added `defaultMode: "acceptEdits"`
- Created comprehensive allow/ask/deny rules
- Configured safe defaults for development workflow
- Protected secrets and credentials
- Maintained safety for git operations and deletions

---

**You should now experience significantly fewer approval prompts for routine development tasks while maintaining safety for critical operations!**

To apply these changes, **restart Claude Code** or **reload the VSCode window**.
