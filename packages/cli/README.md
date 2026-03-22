# usedev

Universal installer for the AI-native developer ecosystem.

One command installs any tool — CLI, MCP server, SDK, AI config — directly configured in the right files.

## Install

```bash
npm install -g usedev
```

## Usage

```bash
# Install a tool
stack install stripe
stack install supabase

# Copy someone's entire setup
stack @theo

# Search the registry
stack search postgres

# List detected AI clients
stack list

# Publish your setup
stack login
stack publish

# Remove a tool
stack remove stripe

# Rollback last install
stack rollback
```

## What it does

`stack install` detects your AI clients (Claude Desktop, Cursor, VS Code, Windsurf, Claude Code...) and writes to the correct config files:

- **MCP servers** → `claude_desktop_config.json`, `.cursor/mcp.json`, `.vscode/mcp.json`
- **SDKs** → `npm install` + generates TypeScript client in `src/lib/`
- **CLI tools** → `~/.stack/bin/` + PATH setup
- **Environment** → `.env` / `.env.local`
- **AI configs** → `CLAUDE.md`, `.cursorrules`

## Profiles

Share your dev setup at [getstack.com](https://getstack.com). Others can copy it with one command:

```bash
stack @yourhandle
```

## Security

- Atomic writes with automatic backup and rollback
- SHA256 integrity verification on all downloads
- Prompt injection scanning on external configs
- Path whitelist — never writes outside allowed locations
- No telemetry without explicit opt-in
- No .env values sent to any API

## License

MIT
