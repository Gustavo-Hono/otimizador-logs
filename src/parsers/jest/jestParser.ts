import { bold, cyan, green, red, yellow } from "kleur/colors"

export function parseJest(log: string) {

  const passed = log.match(/PASS/g)?.length || 0
  const failed = log.match(/FAIL/g)?.length || 0
  const testMatch = log.match(/Tests:\s+(\d+)/)
  const timeMatch = log.match(/Time:\s+([\d.]+)\s*m?s/i)

  const failedTestName = log.match(/●\s+(.*)/)?.[1]?.trim() || "Nenhum"
  const errorMessage = log.match(/●.*\n\n\s+([\s\S]*?)(?=\n\s+at)/)?.[1]?.trim()

  const errorLocation = log.match(/at\s+(.*:\d+:\d+)/)?.[1]

  const totalTests = testMatch ? testMatch[1] : "Não encontrado"
  const executionTime = `${timeMatch ? timeMatch[1] : "Não encontrado"} s`

  if (failed > 0) {
    return [
      bold(red("Resultado de testes com falhas")),
      "",
      `${cyan("Tests passed:")} ${green(String(passed))}`,
      `${cyan("Tests failed:")} ${red(String(failed))}`,
      `${cyan("Total tests:")} ${totalTests}`,
      `${cyan("Execution time:")} ${executionTime}`,
      "",
      bold(yellow("Detalhes da falha")),
      `${yellow("Nome:")} ${failedTestName}`,
      `${yellow("Erro:")} ${errorMessage || "Erro genérico ou falha de sistema"}`,
      `${yellow("Local:")} ${errorLocation || "Não identificado"}`
    ].join("\n")
  }

  return [
    bold(green("Todos os testes passaram com sucesso")),
    "",
    `${cyan("Tests passed:")} ${green(String(passed))}`,
    `${cyan("Tests failed:")} ${green(String(failed))}`,
    `${cyan("Total tests:")} ${totalTests}`,
    `${cyan("Execution time:")} ${executionTime}`
  ].join("\n")
}
