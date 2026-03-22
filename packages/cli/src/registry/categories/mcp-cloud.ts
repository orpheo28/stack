import type { ToolDefinition } from '../tools.js'

export const mcpCloud: readonly ToolDefinition[] = [
  {
    name: 'stripe',
    displayName: 'Stripe',
    description: 'Stripe API integration for payments and financial services',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@stripe/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@stripe/mcp-server'] },
    envVars: [{ key: 'STRIPE_API_KEY', placeholder: '<your-stripe-key-here>' }],
    installMode: 'both',
    cliCommand: 'stripe',
    skillFile: `# Stripe — Payments & Billing

Use the Stripe CLI to manage products, prices, customers, and test webhooks.

## Install CLI
\`\`\`bash
brew install stripe/stripe-cli/stripe  # macOS
# or: npm install -g stripe
\`\`\`

## Auth
\`\`\`bash
stripe login                           # Authenticate via browser
\`\`\`

## Commands
\`\`\`bash
stripe products list                   # List all products
stripe products create --name="Pro"    # Create a product
stripe prices create --product=prod_xx --unit-amount=2000 --currency=usd
stripe customers list                  # List customers
stripe payment_links create --line-items price=price_xx,quantity=1
stripe listen --forward-to localhost:3000/api/webhooks  # Forward webhooks locally
stripe trigger payment_intent.succeeded  # Test webhook events
stripe logs tail                       # Stream API logs
\`\`\`

## When to use
- Creating products and prices for your app
- Testing webhook integrations locally
- Debugging payment flows
- Managing subscriptions and customers
`,
  },
  {
    name: 'supabase',
    displayName: 'Supabase',
    description: 'Supabase PostgreSQL, auth, and edge functions access via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@supabase/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@supabase/mcp-server'] },
    envVars: [
      { key: 'SUPABASE_URL', placeholder: '<your-supabase-url>' },
      { key: 'SUPABASE_KEY', placeholder: '<your-supabase-anon-key>' },
    ],
    sdkPackage: '@supabase/supabase-js',
    sdkTemplate: `import { createClient } from '@supabase/supabase-js'\n\nexport const supabase = createClient(\n  process.env.SUPABASE_URL!,\n  process.env.SUPABASE_KEY!,\n)\n`,
    installMode: 'both',
    cliCommand: 'supabase',
    skillFile: `# Supabase — Backend as a Service

Use the Supabase CLI to manage databases, auth, edge functions, and storage.

## Install CLI
\`\`\`bash
brew install supabase/tap/supabase  # macOS
# or: npx supabase
\`\`\`

## Commands
\`\`\`bash
supabase init                          # Initialize Supabase project
supabase start                         # Start local Supabase (Docker)
supabase stop                          # Stop local instance
supabase db reset                      # Reset database
supabase migration new <name>          # Create new migration
supabase db push                       # Push migrations to remote
supabase gen types typescript           # Generate TypeScript types
supabase functions serve <name>         # Serve edge function locally
supabase functions deploy <name>        # Deploy edge function
supabase secrets set KEY=value          # Set edge function secrets
\`\`\`

## When to use
- Setting up database schemas and migrations
- Running Supabase locally for development
- Deploying edge functions
- Generating TypeScript types from your schema
`,
  },
  {
    name: 'vercel',
    displayName: 'Vercel',
    description: 'Deploy, manage, and inspect Vercel projects via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@vercel/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@vercel/mcp'] },
    envVars: [{ key: 'VERCEL_TOKEN', placeholder: '<your-vercel-token>' }],
    installMode: 'both',
    cliCommand: 'vercel',
    skillFile: `# Vercel — Deployment Platform

Use the Vercel CLI to deploy, manage environment variables, and control domains.

## Install CLI
\`\`\`bash
npm install -g vercel
\`\`\`

## Commands
\`\`\`bash
vercel                                 # Deploy (preview)
vercel --prod                          # Deploy to production
vercel dev                             # Run dev server locally
vercel link                            # Link to Vercel project
vercel env pull                        # Pull env vars to .env.local
vercel env ls                          # List env vars
vercel env add <KEY>                   # Add env var
vercel logs <url>                      # View function logs
vercel domains ls                      # List domains
vercel promote <deployment-url>        # Promote to production
vercel rollback                        # Rollback last deployment
\`\`\`

## When to use
- Deploying web apps to production
- Managing environment variables across environments
- Viewing deployment and function logs
- Managing custom domains
`,
  },
  {
    name: 'github',
    displayName: 'GitHub',
    description: 'Full GitHub integration — repos, PRs, issues, and workflows',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@github/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@github/mcp-server'] },
    envVars: [{ key: 'GITHUB_TOKEN', placeholder: '<your-github-token>' }],
    installMode: 'both',
    cliCommand: 'gh',
    skillFile: `# GitHub CLI — Repository Management

Use the GitHub CLI (gh) for PRs, issues, repos, releases, and Actions.

## Install CLI
\`\`\`bash
brew install gh  # macOS
# Then: gh auth login
\`\`\`

## Commands
\`\`\`bash
gh pr create --title "..." --body "..."   # Create PR
gh pr list                                # List open PRs
gh pr view <number>                       # View PR details
gh pr merge <number>                      # Merge PR
gh issue create --title "..." --body "..."# Create issue
gh issue list                             # List issues
gh repo clone <owner/repo>                # Clone repo
gh release create v1.0.0                  # Create release
gh run list                               # List workflow runs
gh run view <id> --log                    # View run logs
gh api repos/{owner}/{repo}/pulls         # Raw API call
\`\`\`

## When to use
- Creating and managing pull requests
- Working with issues and project boards
- Checking CI/CD status
- Making GitHub API calls
`,
  },
  {
    name: 'linear',
    displayName: 'Linear',
    description: 'Linear issue tracking and project management via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@linear/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@linear/mcp-server'] },
    envVars: [{ key: 'LINEAR_API_KEY', placeholder: '<your-linear-key>' }],
  },
  {
    name: 'notion',
    displayName: 'Notion',
    description: 'Access Notion pages, databases, and tasks via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@notionhq/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@notionhq/mcp-server'] },
    envVars: [{ key: 'NOTION_TOKEN', placeholder: '<your-notion-token>' }],
  },
  {
    name: 'cloudflare',
    displayName: 'Cloudflare',
    description: 'Deploy and configure Cloudflare Workers, KV, R2, and D1',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@cloudflare/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@cloudflare/mcp-server'] },
  },
  {
    name: 'neon',
    displayName: 'Neon',
    description: 'Neon serverless Postgres — branches, scaling, and queries',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@neondatabase/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@neondatabase/mcp-server'] },
    envVars: [{ key: 'DATABASE_URL', placeholder: '<your-neon-database-url>' }],
  },
  {
    name: 'sentry',
    displayName: 'Sentry',
    description: 'Sentry error tracking and performance monitoring via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@sentry/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@sentry/mcp-server'] },
    envVars: [{ key: 'SENTRY_AUTH_TOKEN', placeholder: '<your-sentry-auth-token>' }],
    installMode: 'both',
    cliCommand: 'sentry-cli',
    skillFile: `# Sentry — Error Tracking

Use Sentry CLI for releases, sourcemaps, and issue management.

## Install CLI
\`\`\`bash
npm install -g @sentry/cli
# Then: sentry-cli login
\`\`\`

## Commands
\`\`\`bash
sentry-cli releases new <version>          # Create release
sentry-cli releases finalize <version>     # Finalize release
sentry-cli sourcemaps upload --release=<v> ./dist  # Upload sourcemaps
sentry-cli releases set-commits <v> --auto # Associate commits
sentry-cli issues list                     # List recent issues
sentry-cli send-event -m "Test event"      # Send test event
\`\`\`

## When to use
- Setting up releases with sourcemaps
- Debugging production errors
- Testing Sentry integration
- Managing release health
`,
  },
  {
    name: 'axiom',
    displayName: 'Axiom',
    description: 'Axiom observability — logs, traces, and analytics via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@axiomhq/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@axiomhq/mcp-server'] },
    envVars: [{ key: 'AXIOM_TOKEN', placeholder: '<your-axiom-token>' }],
  },
  {
    name: 'browserbase',
    displayName: 'Browserbase',
    description: 'Cloud browser automation and web scraping via Browserbase',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@browserbase/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@browserbase/mcp'] },
    envVars: [{ key: 'BROWSERBASE_API_KEY', placeholder: '<your-browserbase-key>' }],
  },
  {
    name: 'reducto',
    displayName: 'Reducto',
    description: 'Document parsing and data extraction via Reducto AI',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@reducto/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@reducto/mcp'] },
    envVars: [{ key: 'REDUCTO_API_KEY', placeholder: '<your-reducto-key>' }],
  },
  {
    name: 'firebase',
    displayName: 'Firebase',
    description: 'Firebase Firestore, Auth, and Storage access via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@gannonh/firebase-mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@gannonh/firebase-mcp'] },
    envVars: [
      { key: 'GOOGLE_APPLICATION_CREDENTIALS', placeholder: '<path-to-service-account.json>' },
    ],
  },
  {
    name: 'auth0',
    displayName: 'Auth0',
    description: 'Auth0 identity platform — users, roles, and SSO via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@auth0/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@auth0/mcp-server'] },
    envVars: [
      { key: 'AUTH0_DOMAIN', placeholder: '<your-auth0-domain>' },
      { key: 'AUTH0_CLIENT_ID', placeholder: '<your-auth0-client-id>' },
    ],
  },
  {
    name: 'shopify',
    displayName: 'Shopify',
    description: 'Shopify store management — products, orders, and inventory',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@shopify/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@shopify/mcp-server'] },
    envVars: [{ key: 'SHOPIFY_ACCESS_TOKEN', placeholder: '<your-shopify-token>' }],
  },
  {
    name: 'hubspot',
    displayName: 'HubSpot',
    description: 'HubSpot CRM — contacts, deals, and marketing automation',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@hubspot/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@hubspot/mcp-server'] },
    envVars: [{ key: 'HUBSPOT_API_KEY', placeholder: '<your-hubspot-key>' }],
  },
  {
    name: 'salesforce',
    displayName: 'Salesforce',
    description: 'Salesforce CRM integration — records, queries, and automation',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@salesforce/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@salesforce/mcp-server'] },
    envVars: [{ key: 'SALESFORCE_ACCESS_TOKEN', placeholder: '<your-salesforce-token>' }],
  },
  {
    name: 'datadog',
    displayName: 'Datadog',
    description: 'Datadog monitoring — metrics, logs, and APM via MCP',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@datadog/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@datadog/mcp-server'] },
    envVars: [
      { key: 'DD_API_KEY', placeholder: '<your-datadog-api-key>' },
      { key: 'DD_APP_KEY', placeholder: '<your-datadog-app-key>' },
    ],
  },
  {
    name: 'jira',
    displayName: 'Jira',
    description: 'Atlassian Jira — issues, sprints, and project tracking',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@atlassian/mcp-server-jira',
    mcpConfig: { command: 'npx', args: ['-y', '@atlassian/mcp-server-jira'] },
    envVars: [
      { key: 'JIRA_API_TOKEN', placeholder: '<your-jira-api-token>' },
      { key: 'JIRA_EMAIL', placeholder: '<your-jira-email>' },
    ],
  },
  {
    name: 'confluence',
    displayName: 'Confluence',
    description: 'Atlassian Confluence — pages, spaces, and documentation',
    category: 'MCP — Cloud & SaaS',
    type: 'mcp',
    source: 'npm:@atlassian/mcp-server-confluence',
    mcpConfig: { command: 'npx', args: ['-y', '@atlassian/mcp-server-confluence'] },
    envVars: [{ key: 'CONFLUENCE_API_TOKEN', placeholder: '<your-confluence-token>' }],
  },
]
