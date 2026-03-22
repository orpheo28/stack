# Security Policy — Stack CLI

## Security Model

Stack modifies developer config files to install AI-native tools. Security is priority #1 — equal to functionality.

### Files modified by Stack (exhaustive list)

| File                         | Operation                              | Purpose                               |
| ---------------------------- | -------------------------------------- | ------------------------------------- |
| `claude_desktop_config.json` | Merge JSON                             | Add MCP server entries                |
| `.cursor/mcp.json`           | Merge JSON                             | Add MCP server entries                |
| `.vscode/mcp.json`           | Merge JSON                             | Add MCP server entries                |
| `CLAUDE.md`                  | Create/overwrite (with diff + confirm) | Apply coding agent rules              |
| `.cursorrules`               | Create/overwrite (with diff + confirm) | Apply Cursor rules                    |
| `.env` / `.env.local`        | Append (never overwrite existing keys) | Add env var placeholders              |
| `src/lib/*.ts`               | Create                                 | Generated TypeScript SDK clients      |
| `stack.json`                 | Create/merge                           | Track installed tools                 |
| `~/.stack/bin/*`             | Create                                 | CLI tool wrapper scripts              |
| `~/.stack/backups/*`         | Create                                 | Timestamped backups of modified files |
| `~/.stack/auth-token`        | Create (mode 0o600)                    | API authentication token              |
| `~/.zshrc` / `~/.bashrc`     | Append only                            | Add `~/.stack/bin` to PATH            |

**No other files are ever modified.** All write paths are enforced by a compile-time whitelist (`src/security/whitelist.ts`). Any write attempt outside this list throws `STACK_009`.

### Data sent to use.dev (exhaustive list)

| Endpoint                            | Data sent                                      | Purpose                     |
| ----------------------------------- | ---------------------------------------------- | --------------------------- |
| `POST /api/publish`                 | Tool names, types, sources (from `stack.json`) | Publish your public profile |
| `POST /api/handles/:handle/copy`    | Handle name                                    | Increment adoption counter  |
| `POST /api/tools/:name/install`     | Tool name                                      | Increment install counter   |
| `GET /api/handles/:handle/manifest` | Handle name (in URL)                           | Fetch a dev's setup         |
| `GET /api/search?q=`                | Search query                                   | Search the tool registry    |

### Data NEVER sent (exhaustive list)

- `.env` values (API keys, secrets, tokens)
- File contents (CLAUDE.md, source code, config files)
- Local file paths or directory structure
- Machine name, OS username, or hostname
- IP address (proxied via Vercel Edge)
- Git history, branch names, or commit hashes
- Clipboard contents
- Browser history or open tabs

This is enforced by the type system — the `StackJson` schema used for API calls does not include env value fields.

### Safety mechanisms

1. **Atomic writes**: Every file modification uses tmp → validate → rename. If the process crashes mid-write, the original file is preserved.
2. **Automatic backups**: Before any modification, a timestamped backup is created in `~/.stack/backups/`. Run `stack rollback` to restore.
3. **Dry run on first use**: The first time Stack runs on a machine, it shows a preview of all changes and asks for confirmation before modifying anything.
4. **Diff + confirm**: CLAUDE.md and cursor rules changes always show a full diff and require explicit confirmation.
5. **Prompt injection scan**: External CLAUDE.md and cursor rules are scanned for prompt injection patterns before being applied.
6. **SHA256 integrity**: Package sources are verified against known hashes when available.
7. **Handle spoofing detection**: Similar-looking handles (e.g., `@0rphe0` vs `@orpheo`) trigger a warning using Levenshtein distance and confusable character detection.
8. **Path whitelist**: Writes are restricted to a strict whitelist. Path traversal attempts (`../../../.ssh/`) throw `STACK_009`.
9. **No sudo**: Stack never uses `sudo`. CLI tools install to `~/.stack/bin/`, not `/usr/local/bin/`.
10. **HTTPS only**: All API communication uses HTTPS.

## Reporting a Vulnerability

**Email**: security@use.dev
**Response time**: Within 24 hours

Please include:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

Do NOT open a public GitHub issue for security vulnerabilities. Use the email above for responsible disclosure.

## Bug Bounty

| Severity | Reward | Examples                                       |
| -------- | ------ | ---------------------------------------------- |
| Critical | $500   | RCE, data exfiltration, arbitrary file write   |
| High     | $200   | File write outside whitelist, env value leak   |
| Medium   | $50    | Information disclosure, handle spoofing bypass |

## Security Tests

The CLI includes 24 security tests covering:

- `T-SEC-001`: Atomic write rollback on network failure
- `T-SEC-002`: SHA256 hash mismatch blocks installation
- `T-SEC-003`: Prompt injection in CLAUDE.md is blocked
- `T-SEC-004`: Path traversal is blocked by whitelist
- `T-SEC-005`: Corrupted config detection and repair
- `T-SEC-006`: No .env values in API traffic
- `T-SEC-007`: Handle similarity detection (confusable chars + Levenshtein)
- `T-SEC-008`: Rollback restores exact original state
- `T-SEC-009`: Missing client context is handled gracefully
- `T-SEC-010`: (Rate limiting tested on server side)

Run security tests: `pnpm test:security`
