import type { ArtifactType } from '../types/artifact.js'
import type { McpServerConfig } from '../writers/mcp.js'
import type { EnvVar } from '../writers/env.js'

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
}

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
]

export const REGISTRY: ReadonlyMap<string, ToolDefinition> = new Map(tools.map((t) => [t.name, t]))

export function findTool(name: string): ToolDefinition | undefined {
  return REGISTRY.get(name)
}

export function findSimilarTools(name: string): readonly ToolDefinition[] {
  const lower = name.toLowerCase()
  return tools.filter((t) => t.name.includes(lower) || t.displayName.toLowerCase().includes(lower))
}
