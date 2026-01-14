# Workspace Terminology Guide

## Overview

This document explains the dual terminology system used in the WebClarity codebase: **"organization"** in code vs **"workspace"** in user-facing content.

## Core Principle

- **Code/Backend:** Use "organization" terminology everywhere
- **User-Facing:** Display "workspace" terminology everywhere users see or interact with

## Why This Approach?

This design allows us to:
- Keep backend code consistent and maintainable
- Present a user-friendly "workspace" concept to end users
- Avoid complex database migrations and API changes
- Maintain backward compatibility

## Code Examples

### ✅ Correct: Using Organization in Code

```typescript
// ✅ CORRECT - Use organization in code
import { useActiveOrganization } from '@saas/organizations/hooks/use-active-organization';
import { OrganizationSelect } from '@saas/organizations/components/OrganizationSelect';

function MyComponent() {
  const { activeOrganization } = useActiveOrganization();
  const organizationId = activeOrganization?.id;
  
  // Use organization functions
  await createOrganization({ name: "My Workspace" });
  
  return <OrganizationSelect />;
}
```

### ✅ Correct: Displaying Workspace to Users

```tsx
// ✅ CORRECT - Use translations that show "workspace"
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t("organizations.createForm.title")}</h1>
      {/* Shows: "Create a workspace" */}
      
      <p>{t("organizations.settings.title")}</p>
      {/* Shows: "Workspace" */}
    </div>
  );
}
```

### ❌ Incorrect: Don't Mix Terminology

```typescript
// ❌ WRONG - Don't rename code to "workspace"
import { useActiveWorkspace } from '@saas/workspaces/hooks/use-active-workspace';
const { activeWorkspace } = useActiveWorkspace();

// ❌ WRONG - Don't hardcode "workspace" in code
const message = "Create a workspace"; // Use translations instead!

// ❌ WRONG - Don't change API endpoints
fetch('/api/workspaces/list'); // Should be '/api/organizations/list'
```

## Terminology Mapping

### Code (Backend/Internal)

| What | Terminology | Examples |
|------|-------------|----------|
| Database Model | `Organization` | `model Organization { ... }` |
| Database Field | `organizationId` | `organizationId: String` |
| API Endpoints | `/api/organizations/*` | `/api/organizations/list` |
| Function Names | `getOrganization()` | `getOrganization(id)` |
| Variable Names | `activeOrganization` | `const activeOrganization = ...` |
| File Names | `OrganizationSelect.tsx` | `modules/saas/organizations/` |
| Folder Names | `organizations/` | `app/(organizations)/` |
| Translation Keys | `organizations.*` | `organizations.createForm.title` |
| Route Parameters | `organizationSlug` | `[organizationSlug]` |

### User-Facing (Frontend/Display)

| What | Terminology | Examples |
|------|-------------|----------|
| UI Text | "workspace" | "Create a workspace" |
| URLs (Admin) | `/admin/workspaces` | `/app/admin/workspaces` |
| Email Content | "workspace" | "Join the workspace" |
| Page Titles | "Workspace" | "Workspace Settings" |
| Button Labels | "workspace" | "Create workspace" |

## Translation Keys

All translation keys use `organizations.*` prefix, but the **values** display "workspace":

```json
{
  "organizations": {
    "createForm": {
      "title": "Create a workspace",  // ✅ Shows "workspace"
      "name": "Workspace name*"       // ✅ Shows "workspace"
    },
    "settings": {
      "title": "Workspace"            // ✅ Shows "workspace"
    }
  }
}
```

**Important:** Keep the key as `organizations.*` but update the value text to say "workspace".

## Route Structure

### Admin Routes

- **Code:** `/app/admin/organizations` (removed - no longer exists)
- **User-Facing:** `/app/admin/workspaces` ✅
- **Implementation:** Files in `app/(saas)/app/(account)/admin/workspaces/`

### Workspace Routes

- **Code:** `/app/(organizations)/[organizationSlug]`
- **User-Facing:** `/app/[workspace-slug]` (e.g., `/app/acme-corp`)
- **Implementation:** Folder name `(organizations)` doesn't appear in URL

**Note:** The route folder `(organizations)` is a Next.js route group (parentheses) and doesn't appear in the actual URL. Users see `/app/acme-corp/settings`, not `/app/organizations/acme-corp/settings`.

## Development Guidelines

### When Adding New Features

1. **Use organization functions/types:**
   ```typescript
   import { useActiveOrganization } from '@saas/organizations/hooks/use-active-organization';
   const { activeOrganization } = useActiveOrganization();
   ```

2. **Use organization translation keys:**
   ```tsx
   const t = useTranslations();
   <h1>{t("organizations.createForm.title")}</h1>
   ```

3. **Update translation values to say "workspace":**
   ```json
   {
     "organizations": {
       "newFeature": {
         "title": "New workspace feature"  // ✅ "workspace" in value
       }
     }
   }
   ```

4. **For admin routes, use `/workspaces` slug:**
   ```tsx
   <Link href="/app/admin/workspaces">Manage Workspaces</Link>
   ```

### When Writing Emails

```tsx
// ✅ CORRECT
<Text>
  {t("mail.organizationInvitation.body", { organizationName })}
</Text>
// Translation value: "You have been invited to join the workspace {organizationName}"

// ❌ WRONG - Don't hardcode
<Text>You have been invited to join the organization</Text>
```

### When Creating API Endpoints

```typescript
// ✅ CORRECT - Keep endpoint as "organizations"
export const organizationsRouter = router({
  list: procedure.query(async () => {
    // Returns organizations, but frontend displays as "workspaces"
  }),
});

// ❌ WRONG - Don't rename to "workspaces"
export const workspacesRouter = router({ ... });
```

## File Structure Reference

### Where "Organization" Appears (Code)

```
packages/
  ├── api/modules/organizations/     ✅ Keep as "organizations"
  ├── auth/lib/organization.ts       ✅ Keep as "organization"
  └── database/prisma/schema.prisma  ✅ model Organization

apps/web/modules/saas/
  └── organizations/                 ✅ Keep as "organizations"
      ├── components/
      │   ├── OrganizationSelect.tsx  ✅ Keep file name
      │   └── CreateOrganizationDialog.tsx
      └── hooks/
          └── use-active-organization.ts

apps/web/app/(saas)/
  └── app/(organizations)/            ✅ Keep folder name
      └── [organizationSlug]/        ✅ Keep param name
```

### Where "Workspace" Appears (User-Facing)

```
apps/web/app/(saas)/
  └── app/(account)/admin/
      └── workspaces/                 ✅ User-facing URL slug
          ├── page.tsx
          └── [id]/page.tsx

packages/i18n/translations/
  └── en.json                          ✅ Values say "workspace"
      └── organizations.*
```

## Common Patterns

### Pattern 1: Component with Organization Logic

```tsx
// ✅ CORRECT Pattern
"use client";

import { useActiveOrganization } from '@saas/organizations/hooks/use-active-organization';
import { useTranslations } from 'next-intl';

export function WorkspaceSettings() {
  const { activeOrganization } = useActiveOrganization(); // ✅ organization in code
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t("organizations.settings.title")}</h1>
      {/* Shows: "Workspace" */}
      <p>Managing: {activeOrganization.name}</p>
    </div>
  );
}
```

### Pattern 2: API Route Handler

```typescript
// ✅ CORRECT Pattern
import { organizationsRouter } from '@repo/api/modules/organizations/router';

export const router = router({
  organizations: organizationsRouter, // ✅ Keep as "organizations"
});
```

### Pattern 3: Database Query

```typescript
// ✅ CORRECT Pattern
import { getOrganizationById } from '@repo/database';

const organization = await getOrganizationById(id); // ✅ organization in code
// Frontend displays organization.name as "workspace name" via translations
```

## Checklist for New Features

When adding workspace-related features:

- [ ] Use `organization` functions/types from `@saas/organizations`
- [ ] Use `organizations.*` translation keys
- [ ] Update translation values to say "workspace" (not "organization")
- [ ] Use `/admin/workspaces` for admin routes (if applicable)
- [ ] Keep API endpoints as `/api/organizations/*`
- [ ] Keep database models as `Organization`
- [ ] Keep file/folder names with "organization"
- [ ] Test that users see "workspace" in UI
- [ ] Test that emails say "workspace"

## Examples from Codebase

### Example 1: Workspace Switcher Component

**File:** `apps/web/modules/saas/shared/components/WorkspaceSwitcher.tsx`

```tsx
// ✅ Uses organization in code
const { activeOrganization } = useActiveOrganization();

// ✅ Uses translations that show "workspace"
{t("organizations.organizationSelect.organizations")}
// Translation value: "Workspaces"
```

### Example 2: Admin Workspaces Page

**File:** `apps/web/app/(saas)/app/(account)/admin/workspaces/page.tsx`

```tsx
// ✅ Uses OrganizationList component (organization in code)
import { OrganizationList } from "@saas/admin/component/organizations/OrganizationList";

// ✅ Route is /admin/workspaces (workspace in URL)
export default function AdminWorkspacesPage() {
  return <OrganizationList />;
}
```

### Example 3: Email Template

**File:** `packages/mail/emails/OrganizationInvitation.tsx`

```tsx
// ✅ Uses organization translation key
{t("mail.organizationInvitation.headline", { organizationName })}

// Translation value: "Join the workspace {organizationName}"
// Users see: "Join the workspace Acme Corp"
```

## FAQ

### Q: Should I rename `OrganizationSelect` component to `WorkspaceSelect`?

**A:** No. Keep component names as `OrganizationSelect`. The component uses translations internally, so users see "workspace" text.

### Q: Can I use "workspace" in variable names?

**A:** Only for display/UI variables. Keep data variables as `organization`:
```typescript
// ✅ OK - Display variable
const workspaceName = t("organizations.createForm.name");

// ❌ Wrong - Data variable
const workspace = await getOrganization(id); // Should be "organization"
```

### Q: What about URL slugs like `/app/[organizationSlug]`?

**A:** The parameter name `organizationSlug` is fine - it's internal. Users see the actual slug value (e.g., `/app/acme-corp`), not the parameter name.

### Q: Should I update the database schema?

**A:** No. Keep the Prisma schema as `model Organization`. Only user-facing content changes.

### Q: What about API endpoint paths?

**A:** Keep API endpoints as `/api/organizations/*`. These are internal and not user-facing.

## Summary

- **Code = Organization** (variables, functions, types, files, folders, API endpoints, database)
- **Display = Workspace** (UI text, emails, admin URLs, translations)
- **Translation Keys = `organizations.*`** (but values say "workspace")
- **Admin Routes = `/admin/workspaces`** (user-facing URL slug)

This approach maintains code consistency while providing a user-friendly "workspace" experience.

