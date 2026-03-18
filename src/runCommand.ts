import { exec } from "child_process"
import { compressLogs } from "./compressLogs"

export function runCommand(command: string) {

  exec(command, (error, stdout, stderr) => {

    if (error) {
      return console.error("Erro ao executar comando")
    }
    console.log(`stdout = ${stdout}`)
    console.log(`stderr = ${stderr}`)
    
    const fullOutput = stdout + stderr

    const optimized = compressLogs(fullOutput)

    console.log("\nLogs otimizados:")
    console.log(optimized)

  })

}