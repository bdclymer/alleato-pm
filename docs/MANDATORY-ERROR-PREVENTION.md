# 🚨 MANDATORY ERROR PREVENTION SYSTEM

## **CRITICAL: Read This Before EVERY Action**

This system is **MANDATORY** and **NON-NEGOTIABLE**. Claude Code must follow these steps before taking any action to prevent repeating documented errors.

---

## 🔴 **STOP! Pre-Action Validation Required**

Before ANY code change, database operation, API development, or problem-solving:

### 1. Check Learning System

- Read relevant pattern documentation in `/docs/patterns/`
- Search for similar issues in documented patterns
- Review solutions for comparable problems

### 2. Validate Against Known Failures

- ✅ Authentication: Check users_auth links exist before permission operations
- ✅ Database: Generate fresh types with `npm run db:types` before ANY database work
- ✅ API Routes: Use specific parameter names ([projectId], not [id])
- ✅ Permissions: Validate PermissionService checks in all protected routes
- ✅ Frontend: Confirm component patterns match existing codebase

### 3. Apply Prevention Measures

- Use documented solutions for known pattern categories
- Follow established debugging checklists
- Implement validation steps from pattern documentation

---

## 📋 **Mandatory Pre-Action Checklist**

**For Authentication Issues:**

- [ ] Check if users_auth record exists linking auth user to person
- [ ] Verify person has active project membership
- [ ] Confirm permission template grants required access
- [ ] Test permission query before assuming access

**For Database Operations:**

- [ ] Run `npm run db:types` to get fresh schema
- [ ] Read database.types.ts to verify table/column names
- [ ] Check foreign key types match primary key types
- [ ] Use exact column names from schema (snake_case)

**For API Development:**

- [ ] Use specific route parameter names ([projectId], [companyId], [userId])
- [ ] Include authentication and permission checks in protected routes
- [ ] Properly await params in Next.js App Router
- [ ] Handle request body parsing and validation

**For Frontend Development:**

- [ ] Check existing component patterns before creating new ones
- [ ] Verify prop types match backend API responses
- [ ] Test responsive design on mobile viewports
- [ ] Follow established UI/UX patterns

---

## 🎯 **Pattern-Specific Validations**

### Authentication Patterns

**Before any permission-related work:**

```sql
-- Validate users_auth link exists
SELECT ua.*, p.first_name, p.last_name
FROM users_auth ua
JOIN people p ON ua.person_id = p.id
WHERE ua.auth_user_id = '[auth_user_id]';
```
### Database Patterns
**Before any schema/query work:**
```bash
# MANDATORY: Generate fresh types
npm run db:types
```
### API Patterns

**Before creating/modifying routes:**

- Use specific parameter names: `[projectId]`, `[companyId]`, `[userId]`
- Include permission validation template
- Test with authentication tokens

### Frontend Patterns

**Before UI development:**

- Review existing components in same category
- Check responsive design requirements
- Validate against accessibility standards

---

## 🚫 **Forbidden Actions**

**NEVER do these without validation:**

1. **Assume database schema** - Always check types file first
2. **Use generic [id] parameters** - Always use specific names
3. **Skip permission checks** - Every protected route needs validation
4. **Guess column names** - Copy exact names from schema
5. **Create routes without authentication** - Security is mandatory
6. **Modify tables without FK validation** - Check type compatibility
7. **Deploy without testing** - Verify functionality works end-to-end

---

## 📚 **Required Reading Before Action**

**For Authentication Issues:**

- Read: `/docs/patterns/authentication-errors.md`
- Focus: Missing users_auth link pattern

**For Database Work:**

- Read: `/docs/patterns/database-issues.md`
- Focus: Foreign key type mismatch and missing types patterns

**For API Development:**

- Read: `/docs/patterns/api-routing-errors.md`
- Focus: Generic parameter conflicts and missing permission checks

**For Any Bug:**

- Read: `/docs/patterns/claude-code-learning-system/index.mdx`
- Apply: Mandatory documentation process

---

## ✅ **Success Validation**

**After implementing any solution:**

1. **Test the fix works** - Don't just assume it's correct
2. **Document the pattern** - If new, add to relevant pattern file
3. **Update prevention measures** - If preventable, add to checklist
4. **Verify no regression** - Ensure fix doesn't break other functionality

---

## 🔄 **Learning Loop Process**

### When Encountering Any Issue:

1. **Immediate Response:**
   - Check if pattern already documented
   - Apply known solution if available
   - Document new pattern if novel

2. **Solution Implementation:**
   - Follow documented debugging steps
   - Use established validation methods
   - Test thoroughly before claiming success

3. **Knowledge Update:**
   - Update pattern documentation if needed
   - Enhance prevention checklist
   - Share learnings with team

### Error Documentation Template:

```markdown
## Bug: [Title] - [Date]

### Pattern Match
- [ ] Matches existing pattern: [link]
- [ ] New pattern requiring documentation

### Root Cause
Technical explanation of why it occurred

### Solution Applied
Exact steps taken to resolve

### Prevention Added
How this will be caught in future
```
---

## 🎖️ **Quality Standards**

**Every interaction must demonstrate:**

1. **Pattern Awareness** - Clear evidence of checking existing patterns
2. **Validation Compliance** - Following pre-action checklists
3. **Learning Integration** - Applying documented solutions
4. **Prevention Focus** - Adding safeguards to prevent recurrence

**Failure to follow this system is unacceptable and must be corrected immediately.**

---

## 🛠️ **Quick Reference Commands**

```bash
# Generate database types (MANDATORY before DB work)
npm run db:types

# Check for route conflicts
find app -name "*[*]*" | sort

# Search for authentication patterns
grep -r "users_auth" docs/patterns/

# Find API routes without permission checks
grep -r "export async function" app/api/ | xargs grep -L "PermissionService"
```

---

**This system is mandatory. No exceptions. Every bug prevented saves hours of debugging time.**

**Last Updated:** 2026-01-31
**Enforcement:** Immediate
**Compliance:** Required
