# stack

**npm for AI-native dev workflows.**

One command installs any tool — MCP server, CLI, SDK, config.
One command copies any developer's entire setup.

```bash
npx usedev install stripe     # MCP + env + SDK configured in 8 seconds
npx usedev @orpheo             # Copy Orpheo's entire setup — tools + CLAUDE.md
npx usedev install             # Install from stack.json (like npm install)
```

GitHub shows what you build. **Stack shows how you work.**

## The Problem

Installing Stripe MCP for Claude Code takes 12 minutes and 7 manual steps: find the repo, read the docs, copy JSON config, edit `claude_desktop_config.json`, restart Claude Desktop, configure `.env`, set up the SDK.

Stack does it in one command, in 8 seconds.

## Quick Start

```bash
# Install a tool
npx usedev install stripe

# Copy a dev's entire setup
npx usedev @orpheo

# Publish your own setup
npx usedev login
npx usedev publish
```

Your profile goes live at `getstack.com/@yourhandle` — adoption score, stack, one-click copy command.

## Commands

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `stack install <name>` | Install a tool (MCP, CLI, SDK, API) |
| `stack install`        | Install all tools from `stack.json` |
| `stack @handle`        | Copy a dev's entire setup           |
| `stack publish`        | Publish your setup to getstack.com  |
| `stack search <query>` | Search the tool registry            |
| `stack list`           | List installed tools & clients      |
| `stack remove <name>`  | Remove a tool                       |
| `stack rollback`       | Undo the last install               |
| `stack login`          | Authenticate with getstack.com      |

## Registry — 36 Tools

### MCP Servers

Stripe, Supabase, Vercel, GitHub, Linear, Notion, Cloudflare, Neon, Axiom, Browserbase, Reducto, Playwright, Sentry, Slack, Figma, Docker, Prisma, Firebase, Perplexity, Brave Search, E2B, Pinecone, Firecrawl, MongoDB, Exa

### SDKs

Anthropic, Resend, Upstash, Replicate, Inngest, OpenAI, Google AI, Vercel AI, Mistral, Groq, LangChain, Stripe SDK, Drizzle, Twilio, Liveblocks

### CLIs

Google Workspace (gws), OpenClaw

Each tool auto-configures the right files: MCP config, `.env`, TypeScript client, PATH.

## Context Detection

Stack auto-detects your environment and configures all detected clients:

| Client         | Config file                   |
| -------------- | ----------------------------- |
| Claude Desktop | `claude_desktop_config.json`  |
| Cursor         | `.cursor/mcp.json`            |
| VS Code        | `.vscode/mcp.json`            |
| Windsurf       | `.windsurfrules`              |
| Claude Code    | `CLAUDE.md`                   |
| Codex          | `AGENTS.md`                   |
| OpenCode       | `opencode.json`               |
| Continue       | `.continue/config.json`       |
| Zed            | `~/.config/zed/settings.json` |

Multiple clients detected? Stack configures all of them.

## Security

Stack touches your most sensitive config files. Security is non-negotiable.

- **Atomic writes** — tmp + validate + rename. Crash-safe.
- **Automatic backups** — `~/.stack/backups/` + `stack rollback`
- **Dry run on first use** — preview mode before any file is modified
- **Prompt injection scan** — external CLAUDE.md scanned before apply
- **Diff + confirm** — CLAUDE.md and cursor rules always show diff first
- **SHA256 integrity** — registry definitions verified before install
- **Path whitelist** — writes restricted to known safe paths
- **Zero exfiltration** — `.env` values never leave your machine
- **No sudo** — CLI tools go to `~/.stack/bin/`, not `/usr/local/bin/`

269 tests including 25 dedicated security tests (T-SEC-001 to T-SEC-010).

## stack.json

The `package.json` for AI-native workflows. Commit it — new team members run `npx usedev install` and they're set up in seconds.

```json
{
  "version": "1.0",
  "handle": "@orpheo",
  "tools": {
    "stripe": { "type": "mcp", "version": "latest", "source": "npm:@stripe/mcp-server" },
    "supabase": { "type": "sdk", "version": "latest", "source": "npm:@supabase/supabase-js" }
  }
}
```

## Development

```bash
git clone https://github.com/orpheohellandsjo/stack.git
cd stack
pnpm install
pnpm build:cli
pnpm test              # 269 tests, all green

# Test locally
node packages/cli/dist/index.js install stripe
node packages/cli/dist/index.js list
```

## Architecture

```
stack/
  packages/
    cli/          # CLI — Commander.js + TypeScript strict
    web/          # getstack.com — Next.js 14 + Tailwind + Supabase
  supabase/
    migrations/   # PostgreSQL + RLS + Edge Functions
```

**Stack**: Node.js 20, TypeScript strict, Turborepo, pnpm workspaces

## License

MIT
