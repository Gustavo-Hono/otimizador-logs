#!/usr/bin/env node

import { runCommand } from "./runCommand"

export function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv

  if (!command) {
    console.error("Uso: ai-term <comando> [argumentos...]")
    process.exitCode = 1
    return
  }

  void runCommand(command, args)
}

if (require.main === module) main()
