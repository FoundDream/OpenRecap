# OpenRecap

Review your daily Claude Code sessions and generate beautiful HTML learning reports. Turns AI-assisted coding into lasting knowledge.

## Install

```bash
npm install -g openrecap
```

Requires Node.js 18+ and access to AWS Bedrock.

## Quick Start

```bash
# First run — interactive setup (region, model, bearer token)
openrecap

# Review today's sessions
openrecap

# Review a specific date
openrecap --date 2026-03-14

# Preview without calling LLM
openrecap --dry-run
```

On first run, OpenRecap creates `~/.openrecap/config.json` through an interactive guide.

## Usage

```
openrecap [options]        Generate a learning report
openrecap config           Re-run setup

Options:
  --date <date>      Target date or range (default: today)
                     Examples: 2026-03-14, 2026-03-10:2026-03-14
  --output <dir>     Output directory (default: ~/openrecap-reports)
  --dry-run          Show matching sessions without calling LLM
  --no-cache         Skip cached analysis, re-analyze all sessions
  --concurrency <n>  LLM concurrency limit (default: 3)
```

## What It Does

```
~/.claude/projects/*/*.jsonl
        │
        ▼
   ┌─────────┐     ┌───────────┐     ┌────────┐     ┌────────┐
   │ Discover │ ──▶ │ Parse DAG │ ──▶ │ Compress│ ──▶ │Sanitize│
   │ Sessions │     │ + Extract │     │ Content │     │Secrets │
   └─────────┘     └───────────┘     └────────┘     └────────┘
                                                         │
                    ┌───────────┐     ┌────────┐         ▼
                    │  Reduce   │ ◀── │  Map    │ ◀── LLM per
                    │  Merge    │     │ Analyze │    session
                    └───────────┘     └────────┘
                         │
                         ▼
                   HTML Report
```

1. **Discover** — Scans `~/.claude/projects/` for sessions matching the target date
2. **Parse** — Reconstructs the final conversation path from the session DAG (handles branching, compaction, sub-agents)
3. **Compress** — Filters noise (progress events, snapshots), truncates tool I/O, chunks large sessions
4. **Sanitize** — Redacts API keys, AWS credentials, JWTs, connection strings, private keys
5. **Map** — Analyzes each session with LLM, extracts knowledge points, tips, and problem-solution pairs
6. **Reduce** — Merges all session analyses into one consolidated report
7. **Render** — Generates a self-contained HTML report and opens it in the browser

## Report Sections

- **Overview** — Session count, projects involved, one-line summary per session
- **Knowledge Points** — Interactive notebook with category tabs, filterable by topic
- **Practical Tips** — Reusable code snippets and techniques
- **Problems & Solutions** — Collapsible cards: problem → cause → solution
- **Further Learning** — Suggested topics based on the day's work

## Authentication

OpenRecap uses AWS Bedrock. During setup you'll be asked for:

- **AWS Region** (default: `us-east-1`)
- **AWS Bearer Token** (`AWS_BEARER_TOKEN_BEDROCK`) — or falls back to standard AWS credential chain (`~/.aws/credentials`, env vars, IAM role)

## Privacy

Session data is sent to your configured LLM provider for analysis.

Safeguards:
- Explicit consent prompt during setup
- Best-effort secret redaction before any LLM call
- Reports and cache stored locally only (`~/.openrecap/`)

## Development

```bash
git clone https://github.com/anthropics/openrecap.git
cd openrecap
bun install

# Run directly (no build needed)
bun run src/index.ts -- --dry-run

# Tests
bun test

# Type check
bun run typecheck

# Build
bun run build
./dist/index.js --dry-run
```

## License

MIT
