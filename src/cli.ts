#!/usr/bin/env node

import { RunCommandOptions, runCommand } from "./runCommand"

const { version } = require("../package.json") as { version: string }

const help = `AI Terminal Optimizer

Usage:
  ai-term [optimizer-options] <command> [arguments...]
  ai-term --help
  ai-term --version

Optimizer options (must appear before the command):
  --raw                 Bypass parsers and preserve the original streams
  --max-items <number>  Maximum diagnostics to print (default: 5)
  --max-chars <number>  Maximum optimized output size (default: 12000)

Examples:
  ai-term npm test
  ai-term --max-items 10 npm run typecheck
  ai-term --raw npm test

Commands and arguments are executed directly, without a shell.`

interface CliArguments {
  command?: string
  args: string[]
  options: RunCommandOptions
  error?: string
}

function positiveInteger(value: string | undefined, option: string) {
  const parsed = Number(value)
  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} requires a positive integer`)
  }
  return parsed
}

export function parseCliArguments(argv: string[]): CliArguments {
  const options: RunCommandOptions = {}
  let index = 0

  try {
    while (index < argv.length) {
      const token = argv[index]
      if (token === "--") {
        index += 1
        break
      }
      if (token === "--raw") {
        options.raw = true
        index += 1
        continue
      }
      if (token === "--max-items" || token === "--max-chars") {
        const value = positiveInteger(argv[index + 1], token)
        if (token === "--max-items") options.maxItems = value
        else options.maxChars = value
        index += 2
        continue
      }
      if (token.startsWith("--max-items=")) {
        options.maxItems = positiveInteger(token.split("=")[1], "--max-items")
        index += 1
        continue
      }
      if (token.startsWith("--max-chars=")) {
        options.maxChars = positiveInteger(token.split("=")[1], "--max-chars")
        index += 1
        continue
      }
      break
    }
  } catch (error) {
    return {
      args: [],
      options,
      error: error instanceof Error ? error.message : String(error)
    }
  }

  return {
    command: argv[index],
    args: argv.slice(index + 1),
    options
  }
}

export function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.log(help)
    return
  }

  if (argv.length === 1 && (argv[0] === "--version" || argv[0] === "-V")) {
    console.log(version)
    return
  }

  const parsed = parseCliArguments(argv)
  if (parsed.error) {
    console.error(parsed.error)
    process.exitCode = 1
    return
  }

  if (!parsed.command) {
    console.error("Usage: ai-term [optimizer-options] <command> [arguments...]")
    process.exitCode = 1
    return
  }

  void runCommand(parsed.command, parsed.args, parsed.options)
}

if (require.main === module) main()
