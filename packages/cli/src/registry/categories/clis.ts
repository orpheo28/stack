import type { ToolDefinition } from '../tools.js'

export const clis: readonly ToolDefinition[] = [
  {
    name: 'add-mcp-skill',
    displayName: 'Add MCP Skill',
    description: 'Meta-skill — teaches your AI agent to convert any MCP into a skill automatically',
    category: 'CLIs — Agent-native',
    type: 'skill',
    source: 'builtin:add-mcp-skill',
    skillFile: `# Add New MCP Skill

This skill teaches you how to convert any MCP server into a lightweight CLI skill using MCPorter.

## Prerequisites
\`\`\`bash
npm install -g mcporter
\`\`\`

## Step-by-step: Convert an MCP to a Skill

### 1. Install and test the MCP server
\`\`\`bash
# Test that the MCP server works
mcporter tools npx -y <mcp-package-name>
\`\`\`

### 2. Discover available tools
\`\`\`bash
# List all tools with descriptions
mcporter tools npx -y <mcp-package-name>

# Get the schema for a specific tool
mcporter schema npx -y <mcp-package-name> <tool-name>
\`\`\`

### 3. Create the skill directory
\`\`\`bash
mkdir -p ~/.claude/skills/<tool-name>
\`\`\`

### 4. Write the SKILL.md
Create \`~/.claude/skills/<tool-name>/SKILL.md\` with this structure:

\`\`\`markdown
# <Tool Display Name>

<One-line description>

## Available tools
List all tools:
\\\\\\\\bash
mcporter tools npx -y <mcp-package-name>
\\\\\\\\

## Call a tool
\\\\\\\\bash
mcporter call npx -y <mcp-package-name> <tool-name> '{"param": "value"}'
\\\\\\\\

## When to use
- <Describe when to use this tool>
\`\`\`

### 5. Test the skill
Start a new Claude Code session and ask the agent to use the tool. It should load the skill on-demand and execute MCPorter commands.

## When to use this skill
- When you find a useful MCP server and want to use it without loading it into context
- When you want to add a new integration to your agent setup
- When converting your existing MCP config to the skill-first pattern

## Example: Convert Context7 MCP to Skill
\`\`\`bash
# 1. Test
mcporter tools npx -y @context7/mcp-server

# 2. Create skill
mkdir -p ~/.claude/skills/context7
cat > ~/.claude/skills/context7/SKILL.md << 'EOF'
# Context7 — Library Documentation
Retrieve up-to-date docs for any library.
## Tools
mcporter call npx -y @context7/mcp-server resolve-library-id '{"libraryName": "react"}'
mcporter call npx -y @context7/mcp-server get-library-docs '{"context7CompatibleLibraryID": "/react/docs"}'
EOF

# 3. Done — skill available in next session
\`\`\`
`,
  },
  {
    name: 'gws',
    displayName: 'Google Workspace CLI',
    description: 'Google Workspace CLI — agent-native access to Gmail, Drive, Calendar',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:google/gws-cli',
  },
  {
    name: 'openclaw',
    displayName: 'OpenClaw',
    description: 'OpenClaw — open-source AI coding agent and MCP client',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:openclaw/openclaw',
  },
  {
    name: 'claude-code',
    displayName: 'Claude Code',
    description: 'Claude Code — Anthropic official CLI for agentic coding',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'npm:@anthropic-ai/claude-code',
  },
  {
    name: 'aider',
    displayName: 'Aider',
    description: 'Aider — AI pair programming in your terminal',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:Aider-AI/aider',
  },
  {
    name: 'goose',
    displayName: 'Goose',
    description: 'Goose — autonomous AI developer agent by Block',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:block/goose',
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    description: 'OpenCode — open-source terminal AI coding assistant',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:opencode-ai/opencode',
  },
  {
    name: 'codex',
    displayName: 'Codex CLI',
    description: 'Codex CLI — OpenAI coding agent for the terminal',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'npm:@openai/codex',
  },
  {
    name: 'warp',
    displayName: 'Warp',
    description: 'Warp — AI-powered modern terminal with built-in AI assistant',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:warpdotdev/warp',
  },
  {
    name: 'cli-anything',
    displayName: 'CLI Anything',
    description: 'Auto-generate a CLI for any open-source software — make any app agent-native',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:dataintelligencelab/cli-anything',
    skillFile: `# CLI Anything — Make Any Software Agent-Native

Point CLI Anything at any open-source repo and it auto-generates a full CLI for that software.

## Install
\`\`\`bash
pip install cli-anything
\`\`\`

## Commands
\`\`\`bash
cli-anything generate <repo-path-or-url>   # Generate CLI from source code
cli-anything refine <project-dir>          # Expand coverage iteratively
cli-anything test <project-dir>            # Run generated tests
cli-anything publish <project-dir>         # Publish the CLI package
\`\`\`

## When to use
- You need to control open-source software (Blender, Audacity, OBS, LibreOffice...) from the terminal
- A tool has no CLI or API — only a GUI
- You want to make any open-source app agent-native

## Supported software (pre-built)
Blender, Inkscape, Audacity, LibreOffice, OBS Studio, KdenLive, Draw.io, GIMP, Jupyter Lab, Metabase

## Example
\`\`\`bash
cli-anything generate https://github.com/audacity/audacity
# Generates a full CLI with 161 tests, 100% pass rate
\`\`\`
`,
    installMode: 'both',
    cliCommand: 'cli-anything',
  },
  {
    name: 'mcporter',
    displayName: 'MCPorter',
    description: 'Run any MCP server through the command line — bridge MCP to CLI',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'npm:mcporter',
    skillFile: `# MCPorter — MCP to CLI Bridge

Run any MCP server through bash. No MCP config needed — just call tools directly.

## Install
\`\`\`bash
npm install -g mcporter
\`\`\`

## Commands
\`\`\`bash
mcporter tools <server-command> [args...]              # List available tools
mcporter schema <server-command> [args...] <tool-name> # Get tool parameter schema
mcporter call <server-command> [args...] <tool-name> '{"param": "value"}'  # Call a tool
\`\`\`

## When to use
- You want to use an MCP server without adding it to your MCP config
- You want to call MCP tools via bash (lighter than loading the full MCP)
- You're converting MCP tools to skills

## Examples
\`\`\`bash
# List Context7 tools
mcporter tools npx -y @context7/mcp-server

# Resolve a library
mcporter call npx -y @context7/mcp-server resolve-library-id '{"libraryName": "react"}'

# List Stripe tools
mcporter tools npx -y @stripe/mcp-server
\`\`\`

## Why use MCPorter instead of MCP?
- Zero context overhead (no tool definitions loaded)
- Bash-native (piping, chaining, error handling)
- Works with any MCP server without configuration
`,
    installMode: 'both',
    cliCommand: 'mcporter',
  },
  {
    name: 'agent-browser',
    displayName: 'Agent Browser',
    description: 'CLI browser automation for AI agents — 70% less tokens than MCP alternatives',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'npm:agent-browser',
    skillFile: `# Agent Browser — Token-Efficient Browser Automation

CLI-based browser automation optimized for AI agents. Uses 70% fewer tokens than Playwright MCP or Chrome MCP.

## Install
\`\`\`bash
npm install -g agent-browser
\`\`\`

## Commands
\`\`\`bash
agent-browser navigate <url>              # Open a page
agent-browser snapshot                     # Get page structure (optimized for LLMs)
agent-browser click <selector>             # Click an element
agent-browser fill <selector> <value>      # Fill a form field
agent-browser screenshot [path]            # Take screenshot
agent-browser evaluate <js-code>           # Run JavaScript
agent-browser wait <selector>              # Wait for element
\`\`\`

## When to use
- Testing web apps from the terminal
- Verifying UI after changes (form submissions, login flows)
- Scraping dynamic JavaScript-rendered content
- Visual regression testing

## Why Agent Browser over Playwright MCP?
- Returns token-optimized page structure (not raw DOM)
- 70% less token consumption for the same tasks
- CLI-native — no MCP overhead, no tool definitions in context

## Example
\`\`\`bash
agent-browser navigate http://localhost:3000
agent-browser snapshot  # Returns clean, LLM-readable page structure
agent-browser click "button:has-text('Submit')"
agent-browser screenshot result.png
\`\`\`
`,
    installMode: 'both',
    cliCommand: 'agent-browser',
  },
  {
    name: 'api-to-cli',
    displayName: 'API to CLI',
    description: 'Convert any REST API into a CLI tool + skill — make any SaaS agent-native',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:orpheo/api-to-cli',
    skillFile: `# API to CLI — Convert Any API into a CLI + Skill

Transform any REST API (Stripe, Typefully, Resend, any SaaS) into a CLI tool that AI agents can use via bash.

## Commands
\`\`\`bash
api-to-cli create <api-name>              # Scaffold a new CLI from an API
api-to-cli discover <swagger-url>         # Auto-discover endpoints from Swagger/OpenAPI
api-to-cli test <cli-dir>                 # Test the generated CLI
api-to-cli publish <cli-dir>              # Publish to npm
\`\`\`

## When to use
- A SaaS tool has an API but no CLI
- You want your AI agent to control a specific service via bash
- You're building skills for your personal workflow

## Example workflow
\`\`\`bash
# Create a CLI for Typefully
api-to-cli create typefully
api-to-cli discover https://api.typefully.com/swagger.json
api-to-cli test typefully-cli/
api-to-cli publish typefully-cli/
# Now: typefully-cli tweets create --content "Hello world"
\`\`\`
`,
    installMode: 'both',
    cliCommand: 'api-to-cli',
  },
  {
    name: 'notebooklm-py',
    displayName: 'NotebookLM CLI',
    description: 'Control Google NotebookLM from the terminal — research, podcasts, analysis',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:nicholasgriffintn/notebooklm-py',
    skillFile: `# NotebookLM CLI — AI Research from the Terminal

Control Google NotebookLM from your terminal. Feed YouTube URLs, documents, get analysis, podcasts, and summaries.

## Install
\`\`\`bash
pip install notebooklm-py
\`\`\`

## Commands
\`\`\`bash
notebooklm create <notebook-name>                      # Create a new notebook
notebooklm add <notebook-id> --url <youtube-url>       # Add YouTube video as source
notebooklm add <notebook-id> --file <path>             # Add document as source
notebooklm analyze <notebook-id>                       # Run analysis
notebooklm podcast <notebook-id>                       # Generate podcast
notebooklm summary <notebook-id>                       # Get summary
notebooklm export <notebook-id> --format slides        # Export as slides/quiz/flashcards
\`\`\`

## When to use
- Research YouTube videos (Claude can't process video natively)
- Generate podcasts, slides, quizzes from sources
- Batch analysis of multiple documents
- Free — tokens run on Google's servers, not yours

## Example
\`\`\`bash
notebooklm create "AI Research"
notebooklm add nb_123 --url "https://youtube.com/watch?v=..."
notebooklm analyze nb_123
notebooklm podcast nb_123
\`\`\`
`,
    installMode: 'both',
    cliCommand: 'notebooklm',
  },
  {
    name: 'ffmpeg',
    displayName: 'FFmpeg',
    description: 'FFmpeg — manipulate video, audio, and images from the terminal',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:FFmpeg/FFmpeg',
    skillFile: `# FFmpeg — Media Processing

Manipulate video, audio, images, and subtitles from the terminal.

## Commands
\`\`\`bash
ffmpeg -i input.mp4 output.gif                          # Convert video to GIF
ffmpeg -i input.mp4 -ss 00:01:00 -t 10 clip.mp4        # Extract 10s clip
ffmpeg -i input.mp4 frame_%04d.png                      # Extract all frames
ffmpeg -i input.mp4 -vf "reverse" reversed.mp4          # Reverse video
ffmpeg -i input.mp4 -vn audio.mp3                       # Extract audio
ffmpeg -i audio.wav -ar 16000 audio_16k.wav             # Resample audio
ffmpeg -i input.mp4 -vf "scale=1280:720" resized.mp4    # Resize video
ffmpeg -i input.mp4 -r 1 thumb_%04d.jpg                 # 1 frame per second
ffmpeg -f concat -i list.txt output.mp4                  # Concatenate videos
\`\`\`

## When to use
- Creating scroll animations from video frames for web design
- Converting between media formats
- Extracting audio from video
- Generating thumbnails or GIFs
- Processing media for web apps

## Install
\`\`\`bash
brew install ffmpeg  # macOS
# or: apt install ffmpeg (Linux)
\`\`\`
`,
    installMode: 'both',
    cliCommand: 'ffmpeg',
  },
  {
    name: 'llmfit',
    displayName: 'LLMFit',
    description: 'Find the best local LLM model for your hardware — benchmarks and recommendations',
    category: 'CLIs — Agent-native',
    type: 'cli',
    source: 'github:lmstudio-ai/llmfit',
    skillFile: `# LLMFit — Find the Right Local Model

Analyze your hardware and recommend the best local LLM model for your setup.

## Install
\`\`\`bash
pip install llmfit
\`\`\`

## Commands
\`\`\`bash
llmfit scan                    # Scan your hardware (GPU, RAM, VRAM)
llmfit recommend               # Get model recommendations for your setup
llmfit benchmark <model>       # Benchmark a specific model
llmfit compare <model1> <model2>  # Compare two models
llmfit list                    # List all available models
\`\`\`

## When to use
- Setting up local LLM inference (Ollama, LM Studio)
- Choosing between model sizes and quantizations
- Benchmarking models on your specific hardware

## Example
\`\`\`bash
llmfit scan
# GPU: NVIDIA RTX 4090 (24GB VRAM)
# RAM: 64GB

llmfit recommend
# Recommended: Llama 3.1 70B Q4_K_M (fits in 24GB VRAM)
\`\`\`
`,
    installMode: 'both',
    cliCommand: 'llmfit',
  },
]
