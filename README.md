# AI Terminal Optimizer

A TypeScript CLI that runs developer commands and turns recognized, noisy output
into concise, actionable summaries. Unknown output is preserved exactly instead
of being forced through an unreliable parser.

## Features

- Safe command execution without an implicit shell
- Actionable summaries for Git, Jest, npm, yarn, and pnpm output
- Original exit codes and signal-based exit status preservation
- Raw passthrough for unknown commands and logs larger than 10 MiB
- English and Portuguese Git output recognition

## Requirements

- Node.js 20 or newer

## Installation

Install globally from npm:

```bash
npm install --global ai-terminal-optimizer
```

Or run it without a global installation:

```bash
npx ai-terminal-optimizer git status
```

For local development:

```bash
npm ci
npm run build
npm link
```

## Usage

```bash
ai-term git status
ai-term git status --short
ai-term git push --set-upstream origin feature/my-change
ai-term npm test
ai-term npx jest
ai-term --help
ai-term --version
```

Arguments are passed directly to the executable. Shell operators are not
interpreted automatically. Invoke a shell explicitly when needed:

```bash
ai-term sh -c 'printf "error\n" | grep error'
```

## Recognized output

- `git status`, including short/porcelain output
- `git push`, including rejected pushes
- `git rebase` and `git pull --rebase`
- Jest, whether invoked directly or through npm, yarn, or pnpm
- npm, yarn, and pnpm install/add commands

A package test script is summarized only when its output is recognized as Jest.
Mocha, Vitest, custom scripts, unsupported formats, and unknown commands retain
their original output.

## Development

```bash
npm test
npm run test:package
```

The package smoke test builds a tarball, installs it in a temporary directory,
and exercises the published executable.

```text
src/cli.ts          CLI entry point and built-in help
src/runCommand.ts   child-process execution and output fallback
src/detectCommand.ts
src/parsers/        parser registry and tool-specific parsers
tests/              regression and package smoke tests
```

## Release

GitHub Actions validates Node.js 20 and 22. Publishing is triggered by a GitHub
release and uses npm provenance. The repository requires an `NPM_TOKEN` secret
with permission to publish the package.

## License

[ISC](LICENSE)
