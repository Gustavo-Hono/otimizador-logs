import { exec } from "child_process"
import { detectCommand } from "./detectCommand"
import { parsers } from "./parsers"

export function runCommand(command: string) {
  const commandType = detectCommand(command)

  exec(command, (error, stdout, stderr) => {
    const fullOutput = stdout + stderr

    if (error && !fullOutput) {
      console.log(error)
      return console.error("❌ Erro fatal no sistema: ", error.message)
    }


    let parserKey: keyof typeof parsers | undefined

    if (commandType && commandType in parsers) {
      parserKey = commandType as keyof typeof parsers
    }

    if (
      commandType === "git:push" &&
      /(non-fast-forward|\[rejected\]|fetch first|tip of your current branch is behind|failed to push some refs)/i.test(fullOutput)
    ) {
      parserKey = "git:push:conflict"
    }

    if (!parserKey) {
      console.log("Comando não reconhecido, exibindo saída completa:")
      console.log(fullOutput)
      return
    }

    const parser = parsers[parserKey]

    if (!parser) {
      console.log("Sem parser para esse comando:")
      console.log(fullOutput)
      return
    }

    const optimized = parser(fullOutput, command)


    console.log("\nLogs otimizados:")
    console.log(optimized)
  })
}
