# WebClarity Web App

> A production-ready SaaS application for website analysis and optimization insights.

WebClarity is a modern SaaS platform built with Next.js 16, TypeScript, and a monorepo architecture. The application provides comprehensive website analysis tools.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Push database schema
pnpm --filter database push

# Generate Prisma client
pnpm --filter database generate

# Start development server
pnpm dev

# Open http://localhost:3000
```

## 📁 Project Structure

This is a **monorepo** powered by **Turborepo** and **pnpm workspaces**:

```
web-app/
├── apps/
│   └── web/                    # Main Next.js application (SaaS only)
│       ├── app/                # Next.js App Router
│       │   ├── (saas)/         # SaaS application routes
│       │   ├── api/            # API routes
│       │   ├── auth/           # Authentication pages
│       │   └── page.tsx        # Root redirect
│       ├── modules/            # Feature modules
│       │   ├── saas/           # SaaS components & features
│       │   ├── shared/         # Shared components
│       │   └── ui/             # UI component library
│       ├── public/             # Static assets
│       └── tests/              # E2E tests
│
├── packages/                   # Shared packages
│   ├── api/                    # API procedures (oRPC)
│   │   └── modules/            # API endpoints
│   │       ├── admin/          # Admin operations
│   │       ├── organizations/  # Organization management
│   │       ├── payments/       # Payment operations
│   │       └── users/          # User operations
│   ├── auth/                   # Authentication (Better Auth)
│   ├── database/               # Database layer (Prisma)
│   ├── storage/                # File storage (S3/Supabase)
│   ├── mail/                   # Email templates & providers
│   ├── payments/               # Payment processing (Stripe)
│   ├── i18n/                   # Internationalization
│   ├── logs/                   # Logging utilities
│   └── utils/                  # Shared utilities
│
├── config/                     # Application configuration
├── tooling/                    # Build tooling
│   ├── tailwind/               # Tailwind CSS config
│   ├── typescript/             # TypeScript configs
│   └── scripts/                # Build scripts
│
└── [Configuration Files]
    ├── package.json            # Root package with scripts
    ├── pnpm-workspace.yaml     # Workspace configuration
    ├── turbo.json              # Turborepo configuration
    ├── tsconfig.json           # TypeScript config
    └── biome.json              # Linter/formatter config
```

## 🛠️ Tech Stack

### Core Technologies

-   **Next.js 16** - React framework with App Router
-   **React 19** - UI library
-   **TypeScript 5.9** - Type-safe JavaScript
-   **Turborepo** - Monorepo build system
-   **pnpm** - Fast, efficient package manager

### Backend & Database

-   **Prisma** - Type-safe ORM
-   **PostgreSQL** - Database (Neon/Supabase)
-   **Better Auth** - Authentication system
-   **oRPC** - Type-safe API layer

### Frontend & UI

-   **Tailwind CSS v4** - Utility-first styling
-   **Shadcn UI** - Component library
-   **Radix UI** - Accessible primitives
-   **Lucide Icons** - Icon library
-   **Next Themes** - Dark mode support

### Features & Integrations

-   **Stripe** - Payment processing
-   **Cloudflare R2** - File storage
-   **Email Providers** - Transactional emails (Plunk/Resend)

## 🎯 Key Features

### Authentication & Authorization

✅ Email/password authentication  
✅ Google OAuth (social login)  
✅ Two-factor authentication (2FA)  
✅ Email verification  
✅ Password reset flow  
✅ Role-based access control (User, Admin)

### Workspace Management

✅ Multi-tenant workspaces  
✅ Workspace invitations  
✅ Role-based permissions (Owner, Admin, Member)  
✅ Workspace billing  
✅ Logo uploads

**Note:** In the codebase, this feature is implemented using "organization" terminology (variables, functions, database models, API endpoints). However, all user-facing content (UI text, emails, URLs) displays as "workspace". See [Terminology Guide](doc/WORKSPACE_TERMINOLOGY.md) for details.

### Billing & Payments

✅ Subscription plans (monthly/yearly)  
✅ One-time payments  
✅ Stripe integration  
✅ Customer portal  
✅ Seat-based pricing

### User Experience

✅ Responsive design (mobile-first)  
✅ Dark mode support  
✅ Loading states & skeletons  
✅ Toast notifications  
✅ Internationalization (English, German)

## ⚙️ Configuration

### Main Configuration File

All application settings are in `config/index.ts`:

```typescript
export const config = {
	appName: "WebClarity",

	// UI Configuration
	ui: {
		enabledThemes: ["light", "dark"],
		defaultTheme: "light",
		saas: {
			enabled: true,
			useSidebarLayout: true,
		},
		marketing: {
			enabled: false, // Marketing pages disabled
		},
	},

	// Workspace Settings (internally uses "organizations" in code)
	organizations: {
		enable: true,
		enableBilling: true,
		hideOrganization: false,
	},

	// User Settings
	users: {
		enableBilling: false,
		enableOnboarding: true,
	},

	// Authentication
	auth: {
		enableSignup: true,
		redirectAfterSignup: "/app",
		redirectAfterLogin: "/app",
		redirectAfterLogout: "/auth/login",
	},

	// Internationalization
	i18n: {
		locales: ["en", "de"],
		defaultLocale: "en",
	},

	// Payment Plans
	payments: {
		plans: {
			pro: {
				monthly: { priceId: "..." },
				yearly: { priceId: "..." },
			},
		},
	},
} as const satisfies Config;
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database (Neon/Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_SECRET="generate-with-openssl-rand-base64-32"
BETTER_AUTH_URL="http://localhost:3000"

# Storage (Cloudflare R2 / Supabase)
STORAGE_PROVIDER="s3"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_ENDPOINT="https://...r2.cloudflarestorage.com"
S3_REGION="auto"
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
NEXT_PUBLIC_LOGOS_BUCKET_NAME="logos"

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email Provider
MAIL_PROVIDER="plunk"
PLUNK_API_KEY="..."

# Payment Provider
PAYMENT_PROVIDER="stripe"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_PRICE_ID_PRO_MONTHLY="price_..."
NEXT_PUBLIC_PRICE_ID_PRO_YEARLY="price_..."

# Cron Jobs (for scheduled cleanup tasks)
# Currently uses Vercel Cron Jobs (configured in vercel.json)
# The endpoint /api/cron/cleanup-shares is vendor-agnostic and can be called by any HTTP scheduler
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

Generate the auth secret:

```bash
openssl rand -base64 32
```

**Note on Scheduled Cleanup**:

-   Currently configured for **Vercel Cron Jobs** (weekly schedule in `vercel.json`)
-   The cleanup endpoint (`/api/cron/cleanup-shares`) is vendor-agnostic and works with any HTTP scheduler
-   **Lazy deletion** (on user visits) will always work regardless of hosting provider
-   If moving away from Vercel, scheduled weekly cleanup will stop, but the system won't break - only orphaned images may persist longer until manually cleaned or a new scheduler is configured

## 🔧 Available Commands

### Development

```bash
# Start development server (all packages)
pnpm dev

# Start only the web app
pnpm --filter web dev

# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

### Database Operations

```bash
# Push schema changes to database
pnpm --filter database push

# Generate Prisma client
pnpm --filter database generate

# Create a new migration
pnpm --filter database migrate

# Open Prisma Studio (database GUI)
pnpm --filter database studio

# Reset database (caution!)
pnpm --filter database reset
```

### Building

```bash
# Build all packages
pnpm build

# Build only the web app
pnpm --filter web build

# Start production server
pnpm start
```

### Testing

```bash
# Run E2E tests
pnpm --filter web e2e

# Run E2E tests with UI
pnpm --filter web e2e:ui

# Run specific test
pnpm --filter web e2e -- tests/home.spec.ts
```

### Scripts

```bash
# Create a new admin user
pnpm --filter scripts create:user
```

## 🗄️ Database Schema

Key database models (Prisma):

```prisma
model User {
  id              String
  email           String
  name            String
  role            String         // "user" | "admin"
  emailVerified   Boolean
  image           String?
  sessions        Session[]
  accounts        Account[]
  members         Member[]
  // ... more fields
}

model Organization {
  id              String
  name            String
  slug            String
  logo            String?
  members         Member[]
  purchases       Purchase[]
  // ... more fields
}

model Member {
  id              String
  userId          String
  organizationId  String
  role            String         // "owner" | "admin" | "member"
  user            User
  organization    Organization
}

model Purchase {
  id              String
  provider        String
  productId       String
  organizationId  String?
  userId          String?
  // ... more fields
}
```

## 🚀 Deployment

### Production Checklist

-   [ ] Set up production database (Neon/Supabase)
-   [ ] Configure production environment variables
-   [ ] Set up Stripe webhooks for production
-   [ ] Configure Google OAuth production URLs
-   [ ] Set up custom domain (app.stepcaptor.com)
-   [ ] Enable error tracking (Sentry)
-   [ ] Set up monitoring & analytics
-   [ ] Configure CDN & caching
-   [ ] Test all authentication flows
-   [ ] Test payment flows

### Recommended Platforms

**Vercel** (Recommended)

-   Optimal for Next.js
-   Automatic deployments
-   Edge network
-   Environment variables management

**Alternatives:**

-   Netlify
-   Railway
-   Fly.io
-   Self-hosted (Docker)

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Configure custom domain
# Set up production webhooks
```

## 🧪 Testing Strategy

### E2E Testing (Playwright)

Tests are located in `apps/web/tests/`:

```typescript
// Example: Home page test
test("should redirect to login", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL(/.*\/auth\/login/);
});
```

Run tests:

```bash
pnpm --filter web e2e
```

### Type Safety

TypeScript ensures type safety across:

-   API calls (oRPC)
-   Database queries (Prisma)
-   Component props
-   Environment variables

## 📚 Package Details

### `@repo/api`

Type-safe API layer using oRPC.

**Key Modules:**

-   `admin/` - Admin operations (user/workspace management)
-   `organizations/` - Workspace management (code uses "organization", UI shows "workspace")
-   `payments/` - Billing operations
-   `users/` - User operations

### `@repo/auth`

Authentication system using Better Auth.

**Features:**

-   Email/password auth
-   Google OAuth
-   2FA (TOTP)
-   Email verification
-   Password reset
-   Workspace invitations

### `@repo/database`

Database layer using Prisma ORM.

**Includes:**

-   Type-safe queries
-   Zod schema generation
-   Migration management

### `@repo/mail`

Email system with React templates.

**Templates:**

-   Email verification
-   Password reset
-   Workspace invitations (user-facing)
-   New user welcome

### `@repo/payments`

Payment processing with Stripe.

**Features:**

-   Subscription management
-   Customer portal
-   Webhook handling

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
echo $DATABASE_URL

# Regenerate Prisma client
pnpm --filter database generate
```

### Module Not Found Errors

```bash
# Clean and reinstall
pnpm clean
rm -rf node_modules
pnpm install
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm dev
```

### Build Errors

```bash
# Clean build cache
pnpm clean

# Remove all node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reinstall
pnpm install

# Rebuild
pnpm build
```

## 🔐 Security Best Practices

✅ Environment variables never committed  
✅ CSRF protection enabled  
✅ SQL injection prevention (Prisma)  
✅ XSS protection (React)  
✅ Rate limiting (configurable)  
✅ Secure session management  
✅ Email verification required  
✅ 2FA available for enhanced security

## 📖 Documentation

### Official Resources

-   [Next.js Documentation](https://nextjs.org/docs)
-   [Prisma Documentation](https://www.prisma.io/docs)
-   [Better Auth Documentation](https://better-auth.com)
-   [Stripe Documentation](https://stripe.com/docs)

### Learning Resources

-   [Turborepo Handbook](https://turbo.build/repo/docs)
-   [TypeScript Handbook](https://www.typescriptlang.org/docs/)
-   [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 📋 Important: Organization vs Workspace Terminology

**Critical for Developers:** This codebase uses a dual terminology system:

-   **Code/Backend:** Everything uses "organization" terminology

    -   Database models: `Organization`, `organizationId`
    -   API endpoints: `/api/organizations/*`
    -   Functions: `getOrganization()`, `createOrganization()`
    -   Variables: `activeOrganization`, `organizationSlug`
    -   File/folder names: `organizations/`, `OrganizationSelect.tsx`

-   **User-Facing:** Everything displays as "workspace"
    -   UI text: "Create workspace", "Workspace settings"
    -   URLs: `/app/admin/workspaces` (admin routes only)
    -   Emails: "You've been invited to join a workspace"
    -   Translations: All `organizations.*` keys show "workspace" text

**When Developing:**

-   ✅ Use `organization` functions, types, and variables in code
-   ✅ Use `organizations.*` translation keys
-   ✅ Display user-facing text as "workspace" via translations
-   ❌ Don't rename code variables/functions to "workspace"
-   ❌ Don't change database schema or API endpoints

See [Workspace Terminology Guide](doc/WORKSPACE_TERMINOLOGY.md) for complete details.

## 🤝 Contributing

When contributing to this project:

1. Follow the existing code style (enforced by Biome)
2. Write TypeScript (no JavaScript files)
3. Use functional components (no classes)
4. Add proper type definitions
5. Write descriptive commit messages
6. Test thoroughly before committing
7. **Use "organization" in code, "workspace" in user-facing content** (see [Terminology Guide](doc/WORKSPACE_TERMINOLOGY.md))

## 📝 License

This project is built on [supastarter for Next.js](https://supastarter.dev).

---

**WebClarity** - Built with Next.js, TypeScript, and modern web technologies.

For questions or issues, please open an issue on GitHub.
