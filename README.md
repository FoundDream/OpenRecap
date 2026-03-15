# OpenRecap

OpenRecap is a CLI that reviews your Claude Code sessions and turns them into a concise learning report.

Instead of replaying every prompt and tool call, OpenRecap extracts what mattered: session goals, knowledge points, useful techniques, problems solved, and follow-up topics worth studying.

## Status

This project is in an early stage and currently targets a focused v1:

- AWS Bedrock only
- Claude Code session files as the source of truth
- HTML report output
- Local cache and local report storage

## Features

- Scans Claude Code session history from `~/.claude/projects/`
- Reconstructs the final conversation path from the session DAG
- Filters noisy records such as progress events and snapshots
- Sanitizes common secrets before sending content to the model
- Runs per-session analysis and a final reduce step with structured output
- Generates a readable HTML report you can open locally
- Supports dry-run mode to preview what will be analyzed
- Caches session analysis results to avoid unnecessary repeat work

## How It Works

1. Discover sessions for a target day or date range
2. Parse JSONL session files and reconstruct the final accepted path
3. Compress and sanitize the session content
4. Run LLM analysis per session
5. Merge all session analyses into a single report
6. Render the final report as HTML

## Requirements

- Node.js 18+
- Bun for development workflows (`bun install`, `bun test`)
- Access to AWS Bedrock

For Bedrock auth, OpenRecap supports:

- an AWS bearer token entered during setup
- standard AWS credentials / SigV4 resolution from your environment

## Quick Start

```bash
bun install
bun run build
node dist/index.js
```

On first run, OpenRecap will walk you through setup and create a config file at `~/.openrecap/config.json`.

## Usage

```bash
# Review today
openrecap

# Review a specific day
openrecap --date 2026-03-14

# Review a date range
openrecap --date 2026-03-10:2026-03-14

# Write reports to a custom directory
openrecap --output ~/openrecap-reports

# Preview matching sessions without calling the LLM
openrecap --dry-run

# Re-run setup
openrecap config
```

## Output

The current renderer generates a single self-contained HTML report with sections for:

- overview
- knowledge cards
- practical tips
- problems and solutions
- further learning

Reports are saved locally. Cache and config data live under `~/.openrecap/`.

## Privacy

OpenRecap analyzes Claude Code session content with an external LLM provider. Session data may include code, file paths, and terminal output.

Current safeguards:

- explicit consent during setup
- best-effort secret sanitization before model calls
- local-only storage for generated reports and cache

You should still treat this as a tool for environments where sending session content to your configured provider is acceptable.

## Development

```bash
# Build the CLI
bun run build

# Run tests
bun test

# Type-check
bunx tsc --noEmit
```

## Repository Layout

```text
src/
  analysis/   LLM prompts, map/reduce, provider wiring
  cache/      local cache handling
  privacy/    secret sanitization
  render/     report rendering
  session/    session discovery, parsing, compression
  utils/      logging, token estimates, browser open
tests/        fixtures and unit tests
docs/         planning notes
```

## Roadmap

- Improve report design and HTML presentation
- Add project-level filtering
- Finalize prompt/schema design for report quality
- Add more provider support after the Bedrock-first release is stable

## License

License not added yet.
