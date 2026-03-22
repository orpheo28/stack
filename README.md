# stack

**One command installs any AI-native tool. One command copies any dev's setup.**

```bash
npx stackdev install stripe     # MCP + env + SDK configured in 8 seconds
npx stackdev @theo              # Copy Theo's entire setup — 14 tools + CLAUDE.md
npx stackdev install             # Install from stack.json (like npm install)
```

GitHub shows what you build. **Stack shows how you work.**

---

## The Problem

Installing Stripe MCP for Claude Code takes 12 minutes and 7 manual steps: find the repo, read the docs, copy JSON config, edit `claude_desktop_config.json`, restart Claude Desktop, configure `.env`, set up the SDK.

Stack does it in one command, in 8 seconds.

## What Stack Does

### Install any tool

```bash
npx stackdev install stripe
```

Result:

- `claude_desktop_config.json` updated with Stripe MCP server
- `.env` created with `STRIPE_API_KEY=<your-key-here>`
- `src/lib/stripe.ts` generated with typed client
- `stack.json` tracks what you installed

### Copy any dev's setup

```bash
npx stackdev @orpheo
```

Result:

- 14 tools installed and configured
- CLAUDE.md synced (with diff preview + confirmation)
- Cursor rules applied
- You open Claude Code — it responds with Orpheo's patterns

### Publish your setup

```bash
npx stackdev publish
```

Your profile goes live at `use.dev/@yourhandle` with your stack, adoption score, and a one-click copy command.

## All Commands

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `stack install <name>` | Install a tool (MCP, CLI, SDK, API) |
| `stack install`        | Install all tools from `stack.json` |
| `stack @handle`        | Copy a dev's entire setup           |
| `stack publish`        | Publish your setup to use.dev       |
| `stack search <query>` | Search the tool registry            |
| `stack list`           | List installed tools                |
| `stack remove <name>`  | Remove a tool                       |
| `stack rollback`       | Undo the last install               |
| `stack login`          | Authenticate with use.dev           |

## Registry — 20 Tools at Launch

| Tool        | Type      | What it configures                          |
| ----------- | --------- | ------------------------------------------- |
| stripe      | MCP       | `claude_desktop_config.json` + `.env`       |
| supabase    | MCP + SDK | MCP config + `.env` + `src/lib/supabase.ts` |
| anthropic   | SDK       | `.env` + `src/lib/anthropic.ts`             |
| vercel      | MCP       | `claude_desktop_config.json`                |
| github      | MCP       | MCP config + `.env`                         |
| resend      | SDK       | `.env` + `src/lib/resend.ts`                |
| linear      | MCP       | MCP config + `.env`                         |
| notion      | MCP       | MCP config + `.env`                         |
| cloudflare  | MCP       | `claude_desktop_config.json`                |
| neon        | MCP       | MCP config + `.env`                         |
| upstash     | SDK       | `.env` + `src/lib/upstash.ts`               |
| replicate   | SDK       | `.env` + `src/lib/replicate.ts`             |
| inngest     | SDK       | `src/lib/inngest.ts`                        |
| axiom       | MCP       | MCP config + `.env`                         |
| gws         | CLI       | `~/.stack/bin/gws` + PATH                   |
| openclaw    | CLI       | `~/.stack/bin/openclaw` + PATH              |
| browserbase | MCP       | MCP config + `.env`                         |
| twilio      | SDK       | `.env` + `src/lib/twilio.ts`                |
| reducto     | MCP       | MCP config + `.env`                         |
| liveblocks  | SDK       | `src/lib/liveblocks.ts`                     |

## Context Detection

Stack auto-detects your environment:

- **Claude Desktop** — writes to `claude_desktop_config.json`
- **Cursor** — writes to `.cursor/mcp.json`
- **VS Code** — writes to `.vscode/mcp.json`
- **Windsurf** — writes to `.windsurfrules`
- **Claude Code** — writes to `CLAUDE.md`
- **Node.js project** — detects `package.json`, generates TypeScript clients

Multiple clients detected? Stack configures all of them.

## Security

Stack touches your most sensitive config files. Security is non-negotiable.

- **Atomic writes** — tmp file + validate + rename. Process crash? Original file preserved.
- **Automatic backups** — every modified file backed up to `~/.stack/backups/` with `stack rollback`
- **Dry run on first use** — preview everything before any file is modified
- **Prompt injection scan** — external CLAUDE.md scanned for dangerous patterns before apply
- **Diff + confirm** — CLAUDE.md and cursor rules always show diff, always ask permission
- **SHA256 integrity** — registry definitions verified before install
- **Whitelist** — writes restricted to known safe paths only
- **Zero exfiltration** — `.env` values never leave your machine
- **No sudo** — CLI tools install to `~/.stack/bin/`, not `/usr/local/bin/`
- **HTTPS only** — all API communication encrypted

Full details: [SECURITY.md](SECURITY.md)

## stack.json

The `package.json` for AI-native workflows. Commit it to your repo — new team members run `npx stackdev install` and they're set up in seconds.

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
git clone https://github.com/stack-dev/stack.git
cd stack
pnpm install
pnpm build:cli
pnpm test          # 225 tests (CLI + web)

# Test locally
node packages/cli/dist/index.js install stripe
node packages/cli/dist/index.js list
```

## Architecture

```
stack/
  packages/
    cli/          # The CLI — Commander.js + TypeScript
    web/          # use.dev — Next.js 14 + Supabase
  supabase/
    migrations/   # PostgreSQL schema + RLS + functions
```

**Stack**: Node.js 20 + TypeScript strict + Turborepo + pnpm workspaces

## License

MIT
