# AI Terminal Optimizer

TypeScript CLI for running terminal commands and turning noisy output into concise, actionable summaries.

This project is aimed at developer productivity: instead of reading long logs from Git, Jest, or package scripts, the CLI detects known command patterns and prints a cleaner summary while preserving the full output fallback for unsupported commands.

## What it demonstrates

- Node.js CLI design with TypeScript
- Command execution and output parsing
- Parser-based architecture for different tools
- Packaging with a global executable command
- GitHub Actions workflows for CI and release preparation

## Supported command families

- `git ...`
- `jest`
- `npm test`
- `yarn test`
- `pnpm test`

Unsupported commands still run normally and print their original output.

## Installation

```bash
npm install
npm run build
npm link
```

The global command is:

```bash
ai-term <command>
```

## Usage

```bash
ai-term git status
ai-term npm test
ai-term npx jest
```

Os argumentos são preservados exatamente como recebidos. Para usar operadores de shell, passe-os explicitamente ao shell:

```bash
ai-term sh -c 'printf "erro\n" | grep erro'
```

## Como rodar sem instalar globalmente

Se voce nao quiser usar `npm link`, pode executar direto pelo Node:

```bash
node dist/cli.js git status
node dist/cli.js npm test
```

For development mode:

```bash
npx ts-node src/cli.ts git status
npx ts-node src/cli.ts npm test
```

## Project structure

```text
src/cli.ts              CLI entry point
src/runCommand.ts       command execution
src/detectCommand.ts    parser detection
src/parsers/            output parsers
```

## CI/CD

The repository includes GitHub Actions workflows for:

- CI on push and pull request
- Release workflow prepared for npm publishing

## Status

Active portfolio project. The next improvements would be adding more parsers, snapshot tests for log output, and better summary formatting for common CI failures.
