# Custom Domain Environment Variables

Copy these variables to your `.env.local` file:

```bash
# =============================================================================
# CUSTOM DOMAIN CONFIGURATION
# =============================================================================
# These variables are required for the custom domain feature to work properly

# Vercel Authentication Token
# Get from: https://vercel.com/account/tokens
# Scope: Full access to your project
VERCEL_AUTH_TOKEN=

# Vercel Project ID
# Get from: Vercel Project Settings > General > Project ID
# Or via CLI: vercel project ls
VERCEL_PROJECT_ID=

# Vercel Team ID (Optional - only if using team account)
# Get from: Vercel Team Settings > Team ID
# Or via CLI: vercel teams ls
# Leave empty if using personal account
VERCEL_TEAM_ID=

# =============================================================================
# CNAME VERIFICATION CONFIGURATION
# =============================================================================
# The subdomain used for CNAME verification
# This should be configured in your DNS to point to Vercel
# Example: cname.webclarity.ai -> cname.vercel-dns.com
# Default in config: "cname.webclarity.ai"
NEXT_PUBLIC_CNAME_TARGET=cname.webclarity.ai

# =============================================================================
# APPLICATION URL (Should already exist)
# =============================================================================
# The base URL of your application
# Used for generating share URLs and redirects
NEXT_PUBLIC_SITE_URL=https://localhost:3000
```

## How to Get These Values

### 1. VERCEL_AUTH_TOKEN

-   Go to https://vercel.com/account/tokens
-   Click "Create Token"
-   Name: "WebClarity Custom Domains"
-   Scope: Full access
-   Copy the token

### 2. VERCEL_PROJECT_ID

-   Method 1: Via Dashboard

    -   Go to your Vercel project
    -   Settings > General
    -   Copy "Project ID"

-   Method 2: Via CLI
    ```bash
    vercel project ls
    ```

### 3. VERCEL_TEAM_ID (Optional)

-   Only needed if using a team account
-   Method 1: Via Dashboard

    -   Go to Team Settings
    -   Copy "Team ID"

-   Method 2: Via CLI
    ```bash
    vercel teams ls
    ```

## Notes

1. After adding these variables, restart your development server
2. Make sure to run the database migration first
3. Configure your DNS to point your CNAME subdomain to Vercel
4. Only Pro, Lifetime, and Enterprise plans have custom domain access
