#!/usr/bin/env node

import { runCommand } from "./runCommand"

const { version } = require("../package.json") as { version: string }

const help = `AI Terminal Optimizer

Usage:
  ai-term <command> [arguments...]
  ai-term --help
  ai-term --version

Commands and arguments are executed directly, without a shell.
To use pipes or redirects, invoke a shell explicitly:
  ai-term sh -c 'printf "error\\n" | grep error'`

export function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.log(help)
    return
  }

  if (argv.length === 1 && (argv[0] === "--version" || argv[0] === "-V")) {
    console.log(version)
    return
  }

  const normalizedArgv = argv[0] === "--" ? argv.slice(1) : argv
  const [command, ...args] = normalizedArgv

  if (!command) {
    console.error("Usage: ai-term <command> [arguments...]")
    process.exitCode = 1
    return
  }

  void runCommand(command, args)
}

if (require.main === module) main()
