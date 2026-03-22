import type { ArtifactType } from '../types/artifact.js'
import type { McpServerConfig } from '../writers/mcp.js'
import type { EnvVar } from '../writers/env.js'
import { getRemoteTools, remoteToToolDefinition } from './remote.js'

// --- Types ---

export interface ToolDefinition {
  readonly name: string
  readonly displayName: string
  readonly type: ArtifactType
  readonly source: string
  readonly mcpConfig?: McpServerConfig
  readonly envVars?: readonly EnvVar[]
  readonly sdkPackage?: string
  readonly sdkTemplate?: string
  readonly hashSha256?: string
}

// Reserved handle names — cannot be registered, checked for spoofing similarity
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  'admin',
  'stack',
  'use',
  'stripe',
  'anthropic',
  'openai',
  'vercel',
  'github',
  'supabase',
  'google',
  'microsoft',
  'meta',
  'apple',
  'claude',
  'cursor',
  'windsurf',
  'security',
  'support',
  'help',
  'api',
  'www',
  'app',
  'dev',
  'root',
  'system',
  'official',
])

// --- Registry ---

const tools: readonly ToolDefinition[] = [
  {
    name: 'stripe',
    displayName: 'Stripe',
    type: 'mcp',
    source: 'npm:@stripe/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@stripe/mcp-server'] },
    envVars: [{ key: 'STRIPE_API_KEY', placeholder: '<your-stripe-key-here>' }],
  },
  {
    name: 'supabase',
    displayName: 'Supabase',
    type: 'mcp',
    source: 'npm:@supabase/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@supabase/mcp-server'] },
    envVars: [
      { key: 'SUPABASE_URL', placeholder: '<your-supabase-url>' },
      { key: 'SUPABASE_KEY', placeholder: '<your-supabase-anon-key>' },
    ],
    sdkPackage: '@supabase/supabase-js',
    sdkTemplate: `import { createClient } from '@supabase/supabase-js'\n\nexport const supabase = createClient(\n  process.env.SUPABASE_URL!,\n  process.env.SUPABASE_KEY!,\n)\n`,
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic',
    type: 'sdk',
    source: 'npm:@anthropic-ai/sdk',
    sdkPackage: '@anthropic-ai/sdk',
    envVars: [{ key: 'ANTHROPIC_API_KEY', placeholder: '<your-anthropic-key>' }],
    sdkTemplate: `import Anthropic from '@anthropic-ai/sdk'\n\nexport const anthropic = new Anthropic()\n`,
  },
  {
    name: 'vercel',
    displayName: 'Vercel',
    type: 'mcp',
    source: 'npm:@vercel/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@vercel/mcp'] },
    envVars: [{ key: 'VERCEL_TOKEN', placeholder: '<your-vercel-token>' }],
  },
  {
    name: 'github',
    displayName: 'GitHub',
    type: 'mcp',
    source: 'npm:@github/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@github/mcp-server'] },
    envVars: [{ key: 'GITHUB_TOKEN', placeholder: '<your-github-token>' }],
  },
  {
    name: 'resend',
    displayName: 'Resend',
    type: 'sdk',
    source: 'npm:resend',
    sdkPackage: 'resend',
    envVars: [{ key: 'RESEND_API_KEY', placeholder: '<your-resend-key>' }],
    sdkTemplate: `import { Resend } from 'resend'\n\nexport const resend = new Resend(process.env.RESEND_API_KEY!)\n`,
  },
  {
    name: 'linear',
    displayName: 'Linear',
    type: 'mcp',
    source: 'npm:@linear/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@linear/mcp-server'] },
    envVars: [{ key: 'LINEAR_API_KEY', placeholder: '<your-linear-key>' }],
  },
  {
    name: 'notion',
    displayName: 'Notion',
    type: 'mcp',
    source: 'npm:@notionhq/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@notionhq/mcp-server'] },
    envVars: [{ key: 'NOTION_TOKEN', placeholder: '<your-notion-token>' }],
  },
  {
    name: 'cloudflare',
    displayName: 'Cloudflare',
    type: 'mcp',
    source: 'npm:@cloudflare/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@cloudflare/mcp-server'] },
  },
  {
    name: 'neon',
    displayName: 'Neon',
    type: 'mcp',
    source: 'npm:@neondatabase/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@neondatabase/mcp-server'] },
    envVars: [{ key: 'DATABASE_URL', placeholder: '<your-neon-database-url>' }],
  },
  {
    name: 'upstash',
    displayName: 'Upstash',
    type: 'sdk',
    source: 'npm:@upstash/redis',
    sdkPackage: '@upstash/redis',
    envVars: [
      { key: 'UPSTASH_REDIS_REST_URL', placeholder: '<your-upstash-url>' },
      { key: 'UPSTASH_REDIS_REST_TOKEN', placeholder: '<your-upstash-token>' },
    ],
    sdkTemplate: `import { Redis } from '@upstash/redis'\n\nexport const redis = new Redis({\n  url: process.env.UPSTASH_REDIS_REST_URL!,\n  token: process.env.UPSTASH_REDIS_REST_TOKEN!,\n})\n`,
  },
  {
    name: 'replicate',
    displayName: 'Replicate',
    type: 'sdk',
    source: 'npm:replicate',
    sdkPackage: 'replicate',
    envVars: [{ key: 'REPLICATE_API_TOKEN', placeholder: '<your-replicate-token>' }],
    sdkTemplate: `import Replicate from 'replicate'\n\nexport const replicate = new Replicate()\n`,
  },
  {
    name: 'inngest',
    displayName: 'Inngest',
    type: 'sdk',
    source: 'npm:inngest',
    sdkPackage: 'inngest',
    sdkTemplate: `import { Inngest } from 'inngest'\n\nexport const inngest = new Inngest({ id: 'my-app' })\n`,
  },
  {
    name: 'axiom',
    displayName: 'Axiom',
    type: 'mcp',
    source: 'npm:@axiomhq/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@axiomhq/mcp-server'] },
    envVars: [{ key: 'AXIOM_TOKEN', placeholder: '<your-axiom-token>' }],
  },
  {
    name: 'gws',
    displayName: 'Google Workspace CLI',
    type: 'cli',
    source: 'github:google/gws-cli',
  },
  {
    name: 'openclaw',
    displayName: 'OpenClaw',
    type: 'cli',
    source: 'github:openclaw/openclaw',
  },
  {
    name: 'browserbase',
    displayName: 'Browserbase',
    type: 'mcp',
    source: 'npm:@browserbase/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@browserbase/mcp'] },
    envVars: [{ key: 'BROWSERBASE_API_KEY', placeholder: '<your-browserbase-key>' }],
  },
  {
    name: 'twilio',
    displayName: 'Twilio',
    type: 'sdk',
    source: 'npm:twilio',
    sdkPackage: 'twilio',
    envVars: [
      { key: 'TWILIO_ACCOUNT_SID', placeholder: '<your-twilio-sid>' },
      { key: 'TWILIO_AUTH_TOKEN', placeholder: '<your-twilio-token>' },
    ],
    sdkTemplate: `import twilio from 'twilio'\n\nexport const twilioClient = twilio(\n  process.env.TWILIO_ACCOUNT_SID!,\n  process.env.TWILIO_AUTH_TOKEN!,\n)\n`,
  },
  {
    name: 'reducto',
    displayName: 'Reducto',
    type: 'mcp',
    source: 'npm:@reducto/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@reducto/mcp'] },
    envVars: [{ key: 'REDUCTO_API_KEY', placeholder: '<your-reducto-key>' }],
  },
  {
    name: 'liveblocks',
    displayName: 'Liveblocks',
    type: 'sdk',
    source: 'npm:@liveblocks/client',
    sdkPackage: '@liveblocks/client',
    sdkTemplate: `import { createClient } from '@liveblocks/client'\n\nexport const client = createClient({\n  publicApiKey: process.env.LIVEBLOCKS_PUBLIC_KEY!,\n})\n`,
  },

  // --- Phase C: Expanded MCP servers ---

  {
    name: 'playwright',
    displayName: 'Playwright MCP',
    type: 'mcp',
    source: 'npm:@playwright/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@playwright/mcp'] },
  },
  {
    name: 'sentry',
    displayName: 'Sentry',
    type: 'mcp',
    source: 'npm:@sentry/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@sentry/mcp-server'] },
    envVars: [{ key: 'SENTRY_AUTH_TOKEN', placeholder: '<your-sentry-auth-token>' }],
  },
  {
    name: 'slack',
    displayName: 'Slack',
    type: 'mcp',
    source: 'npm:@modelcontextprotocol/server-slack',
    mcpConfig: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-slack'] },
    envVars: [{ key: 'SLACK_BOT_TOKEN', placeholder: '<your-slack-bot-token>' }],
  },
  {
    name: 'figma',
    displayName: 'Figma',
    type: 'mcp',
    source: 'npm:figma-developer-mcp',
    mcpConfig: { command: 'npx', args: ['-y', 'figma-developer-mcp'] },
    envVars: [{ key: 'FIGMA_ACCESS_TOKEN', placeholder: '<your-figma-token>' }],
  },
  {
    name: 'docker',
    displayName: 'Docker',
    type: 'mcp',
    source: 'npm:mcp-server-docker',
    mcpConfig: { command: 'npx', args: ['-y', 'mcp-server-docker'] },
  },
  {
    name: 'prisma',
    displayName: 'Prisma',
    type: 'mcp',
    source: 'npm:prisma',
    mcpConfig: { command: 'npx', args: ['prisma', 'mcp'] },
    envVars: [{ key: 'DATABASE_URL', placeholder: '<your-database-url>' }],
  },
  {
    name: 'firebase',
    displayName: 'Firebase',
    type: 'mcp',
    source: 'npm:@gannonh/firebase-mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@gannonh/firebase-mcp'] },
    envVars: [
      { key: 'GOOGLE_APPLICATION_CREDENTIALS', placeholder: '<path-to-service-account.json>' },
    ],
  },
  {
    name: 'perplexity',
    displayName: 'Perplexity',
    type: 'mcp',
    source: 'npm:@perplexity-ai/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@perplexity-ai/mcp-server'] },
    envVars: [{ key: 'PERPLEXITY_API_KEY', placeholder: '<your-perplexity-key>' }],
  },
  {
    name: 'brave-search',
    displayName: 'Brave Search',
    type: 'mcp',
    source: 'npm:@brave/brave-search-mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@brave/brave-search-mcp-server'] },
    envVars: [{ key: 'BRAVE_API_KEY', placeholder: '<your-brave-search-key>' }],
  },
  {
    name: 'e2b',
    displayName: 'E2B',
    type: 'mcp',
    source: 'npm:@e2b/mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', '@e2b/mcp-server'] },
    envVars: [{ key: 'E2B_API_KEY', placeholder: '<your-e2b-key>' }],
  },
  {
    name: 'pinecone',
    displayName: 'Pinecone',
    type: 'mcp',
    source: 'npm:@pinecone-database/mcp',
    mcpConfig: { command: 'npx', args: ['-y', '@pinecone-database/mcp'] },
    envVars: [{ key: 'PINECONE_API_KEY', placeholder: '<your-pinecone-key>' }],
  },
  {
    name: 'firecrawl',
    displayName: 'Firecrawl',
    type: 'mcp',
    source: 'npm:firecrawl-mcp',
    mcpConfig: { command: 'npx', args: ['-y', 'firecrawl-mcp'] },
    envVars: [{ key: 'FIRECRAWL_API_KEY', placeholder: '<your-firecrawl-key>' }],
  },
  {
    name: 'mongodb',
    displayName: 'MongoDB',
    type: 'mcp',
    source: 'npm:mongodb-mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', 'mongodb-mcp-server'] },
    envVars: [{ key: 'MONGODB_URI', placeholder: '<your-mongodb-uri>' }],
  },
  {
    name: 'exa',
    displayName: 'Exa',
    type: 'mcp',
    source: 'npm:exa-mcp-server',
    mcpConfig: { command: 'npx', args: ['-y', 'exa-mcp-server'] },
    envVars: [{ key: 'EXA_API_KEY', placeholder: '<your-exa-key>' }],
  },

  // --- Phase C: Expanded SDKs ---

  {
    name: 'openai',
    displayName: 'OpenAI',
    type: 'sdk',
    source: 'npm:openai',
    sdkPackage: 'openai',
    envVars: [{ key: 'OPENAI_API_KEY', placeholder: '<your-openai-key>' }],
    sdkTemplate: `import OpenAI from 'openai'\n\nexport const openai = new OpenAI()\n`,
  },
  {
    name: 'google-ai',
    displayName: 'Google AI (Gemini)',
    type: 'sdk',
    source: 'npm:@google/generative-ai',
    sdkPackage: '@google/generative-ai',
    envVars: [{ key: 'GOOGLE_API_KEY', placeholder: '<your-google-ai-key>' }],
    sdkTemplate: `import { GoogleGenerativeAI } from '@google/generative-ai'\n\nexport const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)\n`,
  },
  {
    name: 'vercel-ai',
    displayName: 'Vercel AI SDK',
    type: 'sdk',
    source: 'npm:ai',
    sdkPackage: 'ai',
    sdkTemplate: `import { generateText } from 'ai'\n\nexport { generateText, streamText } from 'ai'\n`,
  },
  {
    name: 'mistral',
    displayName: 'Mistral',
    type: 'sdk',
    source: 'npm:@mistralai/mistralai',
    sdkPackage: '@mistralai/mistralai',
    envVars: [{ key: 'MISTRAL_API_KEY', placeholder: '<your-mistral-key>' }],
    sdkTemplate: `import { Mistral } from '@mistralai/mistralai'\n\nexport const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! })\n`,
  },
  {
    name: 'groq',
    displayName: 'Groq',
    type: 'sdk',
    source: 'npm:groq-sdk',
    sdkPackage: 'groq-sdk',
    envVars: [{ key: 'GROQ_API_KEY', placeholder: '<your-groq-key>' }],
    sdkTemplate: `import Groq from 'groq-sdk'\n\nexport const groq = new Groq()\n`,
  },
  {
    name: 'langchain',
    displayName: 'LangChain',
    type: 'sdk',
    source: 'npm:langchain',
    sdkPackage: 'langchain',
    sdkTemplate: `import { ChatOpenAI } from 'langchain/chat_models/openai'\n\nexport const model = new ChatOpenAI()\n`,
  },
  {
    name: 'stripe-sdk',
    displayName: 'Stripe SDK',
    type: 'sdk',
    source: 'npm:stripe',
    sdkPackage: 'stripe',
    envVars: [{ key: 'STRIPE_SECRET_KEY', placeholder: '<your-stripe-secret-key>' }],
    sdkTemplate: `import Stripe from 'stripe'\n\nexport const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)\n`,
  },
  {
    name: 'drizzle',
    displayName: 'Drizzle ORM',
    type: 'sdk',
    source: 'npm:drizzle-orm',
    sdkPackage: 'drizzle-orm',
    envVars: [{ key: 'DATABASE_URL', placeholder: '<your-database-url>' }],
    sdkTemplate: `import { drizzle } from 'drizzle-orm/node-postgres'\n\nexport const db = drizzle(process.env.DATABASE_URL!)\n`,
  },
]

export const REGISTRY: ReadonlyMap<string, ToolDefinition> = new Map(tools.map((t) => [t.name, t]))

/** Sync lookup — local hardcoded registry only */
export function findToolLocal(name: string): ToolDefinition | undefined {
  return REGISTRY.get(name)
}

/** Async lookup — tries local first, then remote registry */
export async function findTool(
  name: string,
  homeDir?: string,
): Promise<ToolDefinition | undefined> {
  const local = REGISTRY.get(name)
  if (local !== undefined) return local

  try {
    const remote = await getRemoteTools(homeDir)
    const match = remote.find((t) => t.name === name)
    if (match !== undefined) return remoteToToolDefinition(match)
  } catch {
    // Remote failed — no match
  }

  return undefined
}

/** Sync search — local hardcoded registry only */
export function findSimilarToolsLocal(name: string): readonly ToolDefinition[] {
  const lower = name.toLowerCase()
  return tools.filter((t) => t.name.includes(lower) || t.displayName.toLowerCase().includes(lower))
}

/** Async search — local first, then augment with remote results */
export async function findSimilarTools(
  name: string,
  homeDir?: string,
): Promise<readonly ToolDefinition[]> {
  const lower = name.toLowerCase()
  const local = tools.filter(
    (t) => t.name.includes(lower) || t.displayName.toLowerCase().includes(lower),
  )

  try {
    const remote = await getRemoteTools(homeDir)
    const localNames = new Set(local.map((t) => t.name))
    const remoteMatches = remote
      .filter(
        (t) =>
          !localNames.has(t.name) &&
          (t.name.includes(lower) || t.displayName.toLowerCase().includes(lower)),
      )
      .map(remoteToToolDefinition)
    return [...local, ...remoteMatches]
  } catch {
    return local
  }
}
