import { execFile } from "child_process"
import { detectCommand } from "./detectCommand"
import { parsers } from "./parsers"

export function runCommand(command: string, args: string[] = []): Promise<void> {
  const commandArgs = [command, ...args]
  const commandType = detectCommand(commandArgs)

  return new Promise(resolve => {
    execFile(command, args, (error, stdout, stderr) => {
      const fullOutput = stdout + stderr

      if (error) {
        process.exitCode = typeof error.code === "number" ? error.code : 1
      }

      if (error && !fullOutput) {
        console.log(error)
        console.error("❌ Erro fatal no sistema: ", error.message)
        resolve()
        return
      }

      let parserKey: string | undefined = commandType

      if (
        commandType === "git:push" &&
        /(non-fast-forward|\[rejected\]|fetch first|tip of your current branch is behind|failed to push some refs)/i.test(fullOutput)
      ) {
        parserKey = "git:push:conflict"
      }

      if (!parserKey || !parsers[parserKey]) {
        console.log("Comando não reconhecido, exibindo saída completa:")
        console.log(fullOutput)
        resolve()
        return
      }

      const parser = parsers[parserKey]

      if (!parser) {
        console.log("Sem parser para esse comando:")
        console.log(fullOutput)
        resolve()
        return
      }

      const optimized = parser(fullOutput, commandArgs.join(" "), !error)

      console.log("\nLogs otimizados:")
      console.log(optimized)
      resolve()
    })
  })
}
