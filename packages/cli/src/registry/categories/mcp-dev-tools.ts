import type { ToolDefinition } from '../tools.js'

export const mcpDevTools: readonly ToolDefinition[] = [
  {
    name: 'playwright',
    displayName: 'Playwright',
    description: 'Browser automation and end-to-end testing via Playwright',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@playwright/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@playwright/mcp'] },
    installMode: 'both',
    cliCommand: 'playwright',
    skillFile: `# Playwright — Browser Automation

Use Playwright to automate browsers, test web apps, scrape pages, and take screenshots.

## Install CLI
\`\`\`bash
npx playwright install  # Install browsers
\`\`\`

## Commands
\`\`\`bash
npx playwright test                    # Run all tests
npx playwright test --headed           # Run with visible browser
npx playwright codegen <url>           # Record interactions
npx playwright screenshot <url> out.png # Take screenshot
npx playwright pdf <url> out.pdf       # Generate PDF
\`\`\`

## When to use
- Testing form submissions, login flows, UI interactions
- Taking screenshots of pages for verification
- Scraping dynamic JavaScript-rendered content
- E2E testing before deployment

## Example workflow
\`\`\`bash
# Test a login flow
npx playwright test tests/login.spec.ts --headed

# Screenshot the homepage
npx playwright screenshot http://localhost:3000 homepage.png
\`\`\`
`,
  },
  {
    name: 'figma',
    displayName: 'Figma',
    description: 'Access Figma designs, components, and layout information',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:figma-developer-mcp',
    mcpConfig: { command: 'npx', args: ['-y', 'figma-developer-mcp'] },
    envVars: [{ key: 'FIGMA_ACCESS_TOKEN', placeholder: '<your-figma-token>' }],
  },
  {
    name: 'docker',
    displayName: 'Docker',
    description: 'Docker container management — build, run, and inspect containers',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:mcp-server-docker',
    mcpConfig: { command: 'npx', args: ['-y', 'mcp-server-docker'] },
    installMode: 'both',
    cliCommand: 'docker',
    skillFile: `# Docker — Container Management

Use Docker to build, run, and manage containers and images.

## Commands
\`\`\`bash
docker ps                              # List running containers
docker images                          # List images
docker build -t <name> .               # Build image from Dockerfile
docker run -d -p 3000:3000 <image>     # Run container
docker compose up -d                   # Start all services
docker compose down                    # Stop all services
docker logs <container>                # View logs
docker exec -it <container> sh         # Shell into container
\`\`\`

## When to use
- Running databases locally (postgres, redis, mongo)
- Testing in isolated environments
- Building and deploying containerized apps
- Running docker-compose stacks
`,
  },
  {
    name: 'prisma',
    displayName: 'Prisma',
    description: 'Prisma ORM — schema management, migrations, and queries',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:prisma',
    mcpConfig: { command: 'npx', args: ['prisma', 'mcp'] },
    envVars: [{ key: 'DATABASE_URL', placeholder: '<your-database-url>' }],
    installMode: 'both',
    cliCommand: 'prisma',
    skillFile: `# Prisma — Database ORM

Use Prisma to manage database schemas, run migrations, and query data.

## Commands
\`\`\`bash
npx prisma init                        # Initialize Prisma in project
npx prisma db push                     # Push schema to database
npx prisma migrate dev --name <name>   # Create migration
npx prisma migrate deploy              # Apply migrations in production
npx prisma generate                    # Generate Prisma Client
npx prisma studio                      # Open visual database browser
npx prisma db seed                     # Run seed script
npx prisma format                      # Format schema file
\`\`\`

## When to use
- Setting up a new database schema
- Creating and running migrations
- Generating typed database client
- Inspecting data with Prisma Studio

## Schema location
\`prisma/schema.prisma\`
`,
  },
  {
    name: 'firecrawl',
    displayName: 'Firecrawl',
    description: 'Web scraping, crawling, and content extraction for AI',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:firecrawl-mcp',
    mcpConfig: { command: 'npx', args: ['-y', 'firecrawl-mcp'] },
    envVars: [{ key: 'FIRECRAWL_API_KEY', placeholder: '<your-firecrawl-key>' }],
  },
  {
    name: 'slack',
    displayName: 'Slack',
    description: 'Slack workspace integration — channels, messages, and users',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@modelcontextprotocol/server-slack',
    mcpConfig: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'] },
    envVars: [{ key: 'SLACK_BOT_TOKEN', placeholder: '<your-slack-bot-token>' }],
  },
  {
    name: 'brave-search',
    displayName: 'Brave Search',
    description: 'Brave Search API — privacy-focused web search for AI agents',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@brave/brave-search-mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@brave/brave-search-mcp-server'] },
    envVars: [{ key: 'BRAVE_API_KEY', placeholder: '<your-brave-search-key>' }],
  },
  {
    name: 'context7',
    displayName: 'Context7',
    description: 'Up-to-date library documentation and code examples for AI',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@context7/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@context7/mcp-server'] },
    installMode: 'both',
    cliCommand: 'ctx7',
    skillFile: `# Context7 — Library Documentation

Retrieve up-to-date documentation and code examples for any library.
Use this skill whenever writing code that uses an external library.

## Install CLI
\`\`\`bash
npm install -g @context7/cli
\`\`\`

## Commands
\`\`\`bash
ctx7 resolve <library>          # Resolve library ID (e.g. "react", "nextjs")
ctx7 query <id> "<topic>"       # Query docs for a specific topic
\`\`\`

## When to use
- Before writing code with any external library
- When you need current API signatures (your training data may be outdated)
- When docs have changed since your last training cut

## Example
\`\`\`bash
ctx7 resolve react
# Returns: /react/docs (ID)

ctx7 query /react/docs "useEffect cleanup pattern"
# Returns: current documentation with examples
\`\`\`
`,
  },
  {
    name: 'stagehand',
    displayName: 'Stagehand',
    description: 'AI-powered browser automation — natural language web interaction',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@browserbase/stagehand-mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@browserbase/stagehand-mcp'] },
    envVars: [{ key: 'BROWSERBASE_API_KEY', placeholder: '<your-browserbase-key>' }],
  },
  {
    name: 'brightdata',
    displayName: 'Bright Data',
    description: 'Bright Data web scraping and internet data collection',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@brightdata/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@brightdata/mcp'] },
    envVars: [{ key: 'BRIGHTDATA_API_KEY', placeholder: '<your-brightdata-key>' }],
  },
  {
    name: 'postman',
    displayName: 'Postman',
    description: 'Postman API collections — test and document APIs via MCP',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@postman/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@postman/mcp-server'] },
    envVars: [{ key: 'POSTMAN_API_KEY', placeholder: '<your-postman-key>' }],
  },
  {
    name: 'turso',
    displayName: 'Turso',
    description: 'Turso edge database — libSQL and SQLite at the edge',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@turso/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@turso/mcp-server'] },
    envVars: [
      { key: 'TURSO_DATABASE_URL', placeholder: '<your-turso-url>' },
      { key: 'TURSO_AUTH_TOKEN', placeholder: '<your-turso-token>' },
    ],
  },
  {
    name: 'val-town',
    displayName: 'Val Town',
    description: 'Val Town — serverless JavaScript functions and scheduled jobs',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@val-town/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@val-town/mcp-server'] },
    envVars: [{ key: 'VAL_TOWN_API_KEY', placeholder: '<your-val-town-key>' }],
  },
  {
    name: 'semgrep',
    displayName: 'Semgrep',
    description: 'Semgrep static analysis — find bugs and security issues in code',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@semgrep/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@semgrep/mcp-server'] },
    envVars: [{ key: 'SEMGREP_API_KEY', placeholder: '<your-semgrep-key>' }],
  },
  {
    name: 'snyk',
    displayName: 'Snyk',
    description: 'Snyk security — vulnerability scanning for dependencies and code',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@snyk/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@snyk/mcp-server'] },
    envVars: [{ key: 'SNYK_TOKEN', placeholder: '<your-snyk-token>' }],
  },
  {
    name: 'convex',
    displayName: 'Convex',
    description: 'Convex backend platform — real-time database and functions',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@convex-dev/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@convex-dev/mcp-server'] },
    envVars: [{ key: 'CONVEX_DEPLOY_KEY', placeholder: '<your-convex-deploy-key>' }],
  },
  {
    name: 'netlify',
    displayName: 'Netlify',
    description: 'Netlify — deploy, manage sites, and serverless functions',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@netlify/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@netlify/mcp-server'] },
    envVars: [{ key: 'NETLIFY_AUTH_TOKEN', placeholder: '<your-netlify-token>' }],
  },
  {
    name: 'railway',
    displayName: 'Railway',
    description: 'Railway — deploy apps, databases, and infrastructure',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@railway/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@railway/mcp-server'] },
    envVars: [{ key: 'RAILWAY_TOKEN', placeholder: '<your-railway-token>' }],
  },
  {
    name: 'render',
    displayName: 'Render',
    description: 'Render cloud — deploy web services, databases, and cron jobs',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@render/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@render/mcp-server'] },
    envVars: [{ key: 'RENDER_API_KEY', placeholder: '<your-render-key>' }],
  },
  {
    name: 'grafana',
    displayName: 'Grafana',
    description: 'Grafana — dashboards, alerts, and observability via MCP',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@grafana/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@grafana/mcp-server'] },
    envVars: [{ key: 'GRAFANA_API_KEY', placeholder: '<your-grafana-key>' }],
  },
  {
    name: 'npm-mcp',
    displayName: 'npm',
    description: 'npm registry — search packages, view metadata and versions',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:mcp-server-npm',
    mcpConfig: { command: 'npx', args: ['-y', 'mcp-server-npm'] },
  },
  {
    name: 'chrome-devtools',
    displayName: 'Chrome DevTools',
    description: 'Control and inspect live Chrome browsers via DevTools protocol',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:chrome-devtools-mcp',
    mcpConfig: { command: 'npx', args: ['-y', 'chrome-devtools-mcp'] },
  },
  {
    name: 'kubernetes',
    displayName: 'Kubernetes',
    description: 'Kubernetes cluster management — pods, services, and deployments',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:@kubernetes/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@kubernetes/mcp-server'] },
  },
  {
    name: 'terraform',
    displayName: 'Terraform',
    description: 'Terraform infrastructure as code — plan, apply, and manage state',
    category: 'MCP — Dev Tools',
    type: 'mcp',
    source: 'npm:terraform-mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', 'terraform-mcp-server'] },
  },
]
