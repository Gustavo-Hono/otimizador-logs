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


    if (!commandType || !parsers[commandType]) {
      console.log("Comando não reconhecido, exibindo saída completa:")
      console.log(fullOutput)
      return
    }

    const parser = parsers[commandType]

    if (!parser) {
      console.log("Sem parser para esse comando:")
      console.log(fullOutput)
      return
    }

    const optimized = parser(fullOutput)


    console.log("\nLogs otimizados:")
    console.log(optimized)
  })
}