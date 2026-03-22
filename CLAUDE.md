# stack — Claude Code Instructions

## Project

Universal installer and identity layer for the AI-native developer.
One command installs any tool — CLI, MCP server, SDK, AI config — directly configured in the right files.
One public profile shows how you work, not just what you build.

**Primitive**: Artifact (name, type, source, writers[], version, hash_sha256)
**Product**: CLI (primary, npm: "usedev", binary: "stack") > getstack.com profiles (secondary) > Publisher Pro dashboard (later)

## Stack

Node.js 20 + TypeScript strict · Turborepo + pnpm workspaces · Commander.js + Inquirer.js + Chalk + Ora · Next.js 14 App Router · Tailwind CSS · Supabase (PostgreSQL + RLS + Auth + Storage) · Inngest (background jobs) · Vercel (deployment)

## Critical Rules

- **Atomic writes**: ALWAYS write to tmp → validate → rename. NEVER write directly to target file
- **Backup first**: ALWAYS backup before any file modification. No exceptions.
- **Dry run**: ALWAYS preview mode on first execution on a new machine
- **Diff before apply**: ALWAYS show diff before writing CLAUDE.md or cursor rules from @handle
- **No sudo implicit**: NEVER use sudo without explicit user confirmation and documentation
- **No telemetry default**: NEVER send data without explicit opt-in
- **No .env values sent**: NEVER send env variable values to any API — keys only, never values
- **TypeScript strict**: ALWAYS strict mode. NEVER use `any`
- **Error codes**: ALWAYS use STACK_XXX error codes (see Security section). NEVER raw console.error
- **Whitelist writes**: NEVER write outside the allowed paths whitelist
- **SHA256 verify**: ALWAYS verify package integrity before installation
- **Prompt injection scan**: ALWAYS scan external CLAUDE.md before applying

## File Naming

- Commands: `kebab-case.ts` in `commands/` — Writers: `kebab-case.ts` in `writers/` — Detectors: `kebab-case.ts` in `detectors/` — Types: `kebab-case.ts` in `types/` — Utils: `kebab-case.ts` in `utils/`
- Components: `PascalCase.tsx` — API routes: `route.ts` — DB migrations: `YYYYMMDDHHMMSS_description.sql`

## Commands

```bash
# CLI development
pnpm dev:cli          # Watch mode for CLI
pnpm build:cli        # Build CLI
pnpm test:cli         # Run CLI tests

# Web development
pnpm dev:web          # Next.js dev server
pnpm build:web        # Production build

# Global
pnpm typecheck        # TypeScript strict check (both packages)
pnpm lint             # ESLint (both packages)
pnpm test             # All tests
pnpm test:security    # Security tests T-SEC-001 to T-SEC-010
pnpm db:types         # Generate Supabase types
pnpm db:migrate       # Push migrations

# Local CLI testing
node packages/cli/dist/index.js install stripe    # stack install stripe
node packages/cli/dist/index.js @orpheo            # stack @orpheo
node packages/cli/dist/index.js publish            # stack publish
```

## Repository Structure

```
stack/
├── packages/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── install.ts      # stack install + stack @handle
│   │   │   │   ├── publish.ts      # stack publish
│   │   │   │   ├── search.ts       # stack search
│   │   │   │   ├── list.ts         # stack list
│   │   │   │   ├── remove.ts       # stack remove
│   │   │   │   └── rollback.ts     # stack rollback
│   │   │   ├── writers/
│   │   │   │   ├── mcp.ts          # Writes claude_desktop_config.json
│   │   │   │   ├── env.ts          # Writes .env / .env.local
│   │   │   │   ├── sdk.ts          # npm install + generates TS client
│   │   │   │   ├── cli-tool.ts     # Writes to ~/.stack/bin + PATH
│   │   │   │   ├── claude-md.ts    # Writes CLAUDE.md (diff + confirm)
│   │   │   │   └── cursor-rules.ts # Writes .cursorrules (diff + confirm)
│   │   │   ├── detectors/
│   │   │   │   └── context.ts      # Detects Claude Desktop/Cursor/Windsurf
│   │   │   ├── security/
│   │   │   │   ├── backup.ts       # Atomic backup + rollback
│   │   │   │   ├── scan.ts         # Prompt injection scanner
│   │   │   │   ├── verify.ts       # SHA256 integrity check
│   │   │   │   └── whitelist.ts    # Allowed write paths
│   │   │   ├── api/
│   │   │   │   └── client.ts       # stack API calls to getstack.com
│   │   │   ├── types/
│   │   │   │   ├── artifact.ts     # Artifact type definitions
│   │   │   │   └── errors.ts       # STACK_XXX error classes
│   │   │   └── index.ts            # CLI entry point
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── security/           # T-SEC-001 to T-SEC-010
│   │   └── package.json
│   └── web/
│       ├── app/
│       │   ├── page.tsx            # Trending feed
│       │   ├── @[handle]/
│       │   │   └── page.tsx        # Public profile
│       │   ├── install/[name]/
│       │   │   └── page.tsx        # Tool page
│       │   ├── search/
│       │   │   └── page.tsx
│       │   └── api/                # API routes
│       └── package.json
├── supabase/
│   └── migrations/
├── CLAUDE.md                       # This file
├── PRD.md                          # Full product spec
├── .gitignore
└── package.json                    # Turborepo root
```

## Artifact Types

```typescript
type ArtifactType = 'mcp' | 'cli' | 'sdk' | 'api' | 'config'

// Each artifact has a writer that knows exactly which files to touch
// mcp    → claude_desktop_config.json | .cursor/mcp.json | windsurf settings
// cli    → ~/.stack/bin/ + PATH in .zshrc/.bashrc
// sdk    → npm install + src/lib/{name}.ts generated
// api    → .env + src/lib/{name}.ts generated
// config → CLAUDE.md | .cursorrules | .windsurfrules
```

## Context Detection — Multi-Client, Tiered

A dev can have MULTIPLE clients active simultaneously. The detector returns an array of all detected clients. Each writer installs into ALL detected clients.

```typescript
// detectors/context.ts — all tiers checked in parallel, no short-circuit

// Tier 1 — MCP config files (certainty: confirmed, official docs)
// claude-desktop → ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
//                → $XDG_CONFIG_HOME/claude/claude_desktop_config.json (Linux)
// cursor         → .cursor/mcp.json (cwd + parents)
// vscode         → .vscode/mcp.json (cwd + parents)
// windsurf       → .windsurfrules (cwd + parents)

// Tier 2 — Coding agent CLIs (certainty: confirmed)
// claude-code    → CLAUDE.md (cwd + parents)
// codex          → AGENTS.md (cwd + parents)
// opencode       → opencode.json OR .opencode/config.json (cwd only)

// Tier 3 — Additional MCP clients (certainty: probable)
// openclaw       → ~/.openclaw/config.json
// continue       → .continue/config.json (cwd + parents)
// zed            → ~/.config/zed/settings.json

// Project type detection (always runs)
// node           → package.json in cwd
// python         → pyproject.toml OR requirements.txt in cwd
// unknown        → neither found

// Env file detection (always runs)
// .env preferred over .env.local
```

## Security — Non-Negotiable

### Allowed Write Paths (whitelist)

```typescript
const ALLOWED_WRITE_PATHS = [
  '~/Library/Application Support/Claude/claude_desktop_config.json',
  '~/.cursor/mcp.json',
  '~/.windsurfrules',
  '<project>/.cursorrules',
  '<project>/CLAUDE.md',
  '<project>/.env',
  '<project>/.env.local',
  '<project>/stack.json',
  '<project>/src/lib/', // Generated TS clients only
  '~/.stack/', // stack internal directory
  '~/.zshrc', // PATH append only
  '~/.bashrc', // PATH append only
]
// Any write attempt outside this list = SecurityError immediately
```

### Atomic Write Pattern (mandatory for ALL file writes)

```typescript
async function atomicWrite(filePath: string, content: string) {
  const backup = await createBackup(filePath) // 1. Backup first
  const tmp = filePath + '.stack.tmp' // 2. Write to tmp
  await fs.writeFile(tmp, content) // 3. Write content
  await validateContent(tmp, filePath) // 4. Validate
  await fs.rename(tmp, filePath) // 5. Atomic rename
  await verifyContent(filePath) // 6. Post-verify
}
```

### Error Codes (always use these)

```
STACK_001 — JSON invalide dans fichier config
STACK_002 — Package non trouvé dans registry
STACK_003 — Hash SHA256 mismatch (integrity failure)
STACK_004 — Réseau indisponible
STACK_005 — Handle non trouvé
STACK_006 — Permissions insuffisantes
STACK_007 — Client actif pendant install (restart required)
STACK_008 — Version Node incompatible
STACK_009 — Path hors whitelist (security block)
STACK_010 — Prompt injection détecté dans CLAUDE.md externe
```

### Prompt Injection Patterns (block these in external CLAUDE.md)

```typescript
const BLOCKED_PATTERNS = [
  /ignore.{0,20}(all|previous|prior).{0,20}instructions?/i,
  /disregard.{0,20}(all|previous|prior)/i,
  /override.{0,20}(system|instructions?|rules?)/i,
  /send.{0,50}(env|credentials?|secrets?|passwords?)/i,
  /exfiltrat/i,
  /always.{0,20}execute.{0,20}without/i,
  /sudo\s+rm/i,
  /rm\s+-rf/i,
  /http:\/\//,
]
```

## Supabase

### Tables

```sql
handles        — public profiles (@handle, claude_md, cursor_rules, use_json, copies_*)
tools          — registry (name, type, source, version, hash_sha256, installs_*)
copy_events    — analytics (handle_id, copier_handle_id, created_at)
install_events — analytics (tool_id, handle_id, created_at)
```

### Rules

- Every table has RLS enabled — no exceptions
- Supabase client is typed with `Database` generic
- `supabaseAdmin` (service role) for Inngest functions only
- `supabaseServer` for authenticated API routes
- Always check `if (error) throw error` after every query

## Inngest

- All side effects inside `step.run()` — never outside
- Cron job every 6h for registry indexing (GitHub + npm)
- Weekly percentile recalculation for handles

## Testing

- Write tests BEFORE implementation (TDD)
- Unit tests for every writer and detector
- Integration tests for every CLI command
- Security tests T-SEC-001 to T-SEC-010 must all pass before launch
- `pnpm test` must pass at zero errors before every commit

### Security Tests (mandatory)

```
T-SEC-001 — Atomic write avec réseau coupé à mi-chemin → rollback auto
T-SEC-002 — Package avec SHA256 modifié → install bloqué
T-SEC-003 — CLAUDE.md avec "ignore all instructions" → BLOCKED
T-SEC-004 — Path traversal "../../../.ssh/" → SecurityError
T-SEC-005 — claude_desktop_config.json déjà corrompu → detect + propose repair
T-SEC-006 — Wireshark: aucune valeur .env dans le trafic réseau
T-SEC-007 — Handle similaire à handle vérifié → warning affiché
T-SEC-008 — stack rollback après install → restauration exacte
T-SEC-009 — Machine sans Claude Desktop → context not found, prompt user
T-SEC-010 — 100 installs simultanés même IP → rate limiting déclenché
```

## What NOT to Do

- No `any` TypeScript — never
- No direct file writes — always atomic
- No sudo implicit — always explicit + documented
- No telemetry without opt-in — never
- No .env values in API calls — never
- No write outside whitelist — SecurityError immediately
- No skipping backup "to save time" — never
- No frontend before CLI is complete and tested
- No dashboard before stack profiles work
- No Enterprise features before Publisher Pro works
- No dependency not in PRD without asking first

## Build Order — Never Change

```
Phase 1 — CLI (Semaine 1)
1. detectors/context.ts + tests
2. security/backup.ts + security/whitelist.ts + tests
3. security/scan.ts + security/verify.ts + tests
4. writers/mcp.ts + tests
5. writers/env.ts + tests
6. writers/sdk.ts + tests
7. writers/claude-md.ts + writers/cursor-rules.ts + tests
8. commands/install.ts (stack install <tool>) + tests
9. commands/install.ts (@handle flow) + tests
10. commands/publish.ts + tests
11. Security tests T-SEC-001 to T-SEC-010
12. End-to-end test on real machine

Phase 2 — Web (Semaine 2)
Only after Phase 1 is 100% complete and tested.
13. Supabase schema + migrations + RLS
14. getstack.com/@handle profile page
15. getstack.com/ trending feed
16. API routes (copy event, install event)

Phase 3 — Launch (Semaine 3)
Only after Phase 2 is deployed and working.
```

## Workflow

### Execution Discipline

- **Plan first**: Enter plan mode for any task with 3+ steps. Write plan with checkable items before coding.
- **Stop and re-plan**: If something breaks, STOP. Do not keep pushing a broken approach.
- **Verify before done**: Never mark complete without proof. Run tests. Test on real machine.
- **TDD**: Write the test first. Then write the code that passes it.
- **Elegance check**: If a fix feels hacky, pause and find the clean solution.

### Branch Strategy

- `main` — always deployable, always passing tests
- `feat/[name]` — new features (e.g., `feat/stack-install`)
- `fix/[name]` — bug fixes
- `chore/[name]` — config, deps, infrastructure

### Challenge Patterns

Use these to stress-test before merging:

- "Trace a full `stack install stripe` from command to file write"
- "Can this writer corrupt a file if the process is killed mid-write?"
- "What happens if claude_desktop_config.json is already invalid?"
- "Can a malicious @handle exfiltrate .env values through this code?"
- "Are there any write paths outside the whitelist reachable?"
- "Run T-SEC-001 to T-SEC-010 and show me all results"

## Self-Improvement Protocol

After EVERY correction:

1. Fix the immediate issue
2. Update "Common Mistakes" below with the pattern
3. Write a rule that prevents the same mistake
4. The same mistake never happens twice

## Common Mistakes

Updated continuously. Each entry: WRONG → CORRECT.

### File Writes

- `fs.writeFile(target, content)` directly → `atomicWrite(target, content)` always
- Modify file without backup → `createBackup(filePath)` before every write
- Overwrite CLAUDE.md silently → show diff + require confirmation

### Security

- Write to arbitrary path → check `ALLOWED_WRITE_PATHS` whitelist first
- Skip SHA256 on package download → always `verifyIntegrity(url, expectedHash)`
- Apply external CLAUDE.md without scanning → always `scanClaudeMd(content)` first

### TypeScript

- `any` for "simplicity" → define the proper type
- Missing return type on async function → always explicit return type
- Raw `Error` throw → always throw typed `StackError` with STACK_XXX code

### Supabase

- Missing RLS on new table → every table gets RLS + policies in same migration
- `supabaseServer` in Inngest → `supabaseAdmin` (no user session in background)
- `.select()` without error check → always `if (error) throw error`

### CLI UX

- Silent success → always show what was installed and where
- Generic error message → always STACK_XXX code + corrective action
- No dry run on first execution → always preview mode first time
