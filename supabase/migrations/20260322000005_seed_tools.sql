-- Seed the 20 V1 tools from the registry
INSERT INTO tools (name, display_name, type, source, description, score) VALUES
  ('stripe',      'Stripe',              'mcp', 'npm:@stripe/mcp-server',        'Payments and billing',                      95),
  ('supabase',    'Supabase',            'mcp', 'npm:@supabase/mcp',             'Postgres database + auth + storage',        95),
  ('anthropic',   'Anthropic',           'sdk', 'npm:@anthropic-ai/sdk',         'Claude AI models SDK',                      90),
  ('vercel',      'Vercel',              'mcp', 'npm:@vercel/mcp',               'Deploy and manage Vercel projects',         90),
  ('github',      'GitHub',              'mcp', 'npm:@github/mcp-server',        'GitHub repos, issues, PRs',                 90),
  ('resend',      'Resend',              'sdk', 'npm:resend',                    'Transactional email',                       85),
  ('linear',      'Linear',              'mcp', 'npm:@linear/mcp-server',        'Issue tracking and project management',     85),
  ('notion',      'Notion',              'mcp', 'npm:@notionhq/mcp-server',      'Docs and knowledge base',                   80),
  ('cloudflare',  'Cloudflare',          'mcp', 'npm:@cloudflare/mcp-server',    'Edge network and DNS',                      85),
  ('neon',        'Neon',                'mcp', 'npm:@neondatabase/mcp-server',  'Serverless Postgres with branching',        90),
  ('upstash',     'Upstash',             'sdk', 'npm:@upstash/redis',            'Serverless Redis',                          85),
  ('replicate',   'Replicate',           'sdk', 'npm:replicate',                 'Run AI models in the cloud',                80),
  ('inngest',     'Inngest',             'sdk', 'npm:inngest',                   'Background jobs and workflows',             85),
  ('axiom',       'Axiom',               'mcp', 'npm:@axiomhq/mcp-server',       'Log management and observability',          80),
  ('gws',         'Google Workspace CLI','cli', 'github:google/gws-cli',         'Google Workspace CLI for AI agents',        75),
  ('openclaw',    'OpenClaw',            'cli', 'github:openclaw/openclaw',      'OpenClaw agent setup',                      75),
  ('browserbase', 'Browserbase',         'mcp', 'npm:@browserbase/mcp',          'Cloud browser automation',                  80),
  ('twilio',      'Twilio',              'sdk', 'npm:twilio',                    'SMS, voice, and messaging',                 75),
  ('reducto',     'Reducto',             'mcp', 'npm:@reducto/mcp',              'PDF and document parsing',                  75),
  ('liveblocks',  'Liveblocks',          'sdk', 'npm:@liveblocks/client',        'Real-time collaboration',                   75)
ON CONFLICT (name) DO NOTHING;
