# AI Terminal Optimizer

A zero-runtime-dependency TypeScript CLI that compresses noisy developer logs
into factual, token-efficient summaries for humans and coding agents such as
Codex and Claude Code.

It is a semantic log compressor, not a problem investigator: it extracts facts,
removes repetition, and preserves the smallest useful failure context without
guessing causes or suggesting fixes.

## Features

- Compact output by default for recognized tools
- ANSI, spinner, progress-frame, and duplicate-line normalization
- Diagnostic deduplication and configurable output budgets
- Source locations, error codes, test names, and core metrics preserved
- Raw fallback for unknown formats and logs larger than 10 MiB
- Original arguments, exit codes, and signal-based status preserved
- No network calls, telemetry, log persistence, or AI API

## Supported tools

- Jest and Vitest
- Playwright and Cypress
- TypeScript (`tsc`)
- ESLint, including stylish and JSON output
- Mocha
- Node.js runtime errors
- Vite, Next.js, and webpack builds
- Docker BuildKit
- npm, yarn, and pnpm installs
- Git status, push, rebase, merge, checkout/switch, clone, and fetch

Package scripts run through npm, yarn, or pnpm are content-detected. If their
output does not match a supported format, the original streams are preserved.

## Requirements

- Node.js 20 or newer

## Installation

```bash
npm install --global ai-terminal-optimizer
```

Or run without installing globally:

```bash
npx ai-terminal-optimizer npm test
```

## Usage

```bash
ai-term npm test
ai-term npm run typecheck
ai-term npx eslint .
ai-term npx vitest run
ai-term git status --short
```

Successful recognized commands normally use one line:

```text
jest PASS tests=42/42 suites=8/8 time=1.2s
```

Failures keep a bounded set of diagnostics:

```text
tsc FAIL errors=2 warnings=0
1) src/api.ts:12:5 | [TS2322] Type 'string' is not assignable to type 'number'.
2) src/config.ts:8:3 | [TS2304] Cannot find name 'settings'.
```

When content is removed, the summary reports exactly what was omitted:

```text
omitted: diagnostics=8 duplicates=14 frames=37 logs=120
```

Recognized logs larger than 2,000 characters are regression-tested to stay
below 30% of their original size. Factual fidelity takes priority over the
reduction target: displayed diagnostics keep their tool, status, error code,
message, and first project location.

### Optimizer options

Options must appear before the child command:

```bash
ai-term --raw npm test
ai-term --max-items 10 npm run typecheck
ai-term --max-chars 20000 npx vitest run
ai-term --help
ai-term --version
```

- `--raw`: bypass all parsing.
- `--max-items`: maximum diagnostics rendered; default `5`.
- `--max-chars`: maximum compact output size; default `12000`.

Options after the executable belong to the child command:

```bash
ai-term git --version
```

Commands run directly without an implicit shell. Invoke a shell explicitly for
pipes or redirects:

```bash
ai-term sh -c 'printf "error\n" | grep error'
```

## Architecture

The implementation uses small composable responsibilities:

```text
CLI options -> process executor -> log normalizer -> parser engine
                                               -> compact renderer
```

- The CLI only interprets optimizer options.
- The executor only manages process streams and status.
- The normalizer only removes transport and terminal noise.
- Tool parsers only extract factual structured data.
- The registry-based parser engine is open to new parser registrations.
- The renderer owns deduplication, path shortening, and output budgets.

Parsers return a shared `LogSummary` model, so adding a tool does not require
changes to process execution or rendering.

## Development

```bash
npm ci
npm test
npm run test:package
```

Regression fixtures cover successful and failed output, ANSI noise,
deduplication, raw fallback, argument preservation, output limits, and package
installation.

## Release

GitHub Actions validates Node.js 20 and 22. npm publishing is triggered by a
GitHub release and uses provenance.

## License

[ISC](LICENSE)
