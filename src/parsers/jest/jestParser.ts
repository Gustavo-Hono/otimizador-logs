import { bold, cyan, green, red, yellow } from "kleur/colors"

export function parseJest(log: string) {
  const testsSummary = log.match(/Tests:\s*([^\r\n]+)/i)?.[1]
  const readCount = (label: string) => {
    const value = testsSummary?.match(new RegExp(`([\\d,]+)\\s+${label}`, "i"))?.[1]
    return value ? Number(value.replace(/,/g, "")) : undefined
  }

  const passed = testsSummary ? readCount("passed") ?? 0 : undefined
  const failed = testsSummary ? readCount("failed") ?? 0 : undefined
  const total = testsSummary ? readCount("total") : undefined
  const timeMatch = log.match(/Time:\s+([\d.]+)\s*m?s/i)
  const hasFailures = (failed ?? 0) > 0 || (!testsSummary && /\bFAIL\b/.test(log))
  const failedTestName = log.match(/●\s+(.*)/)?.[1]?.trim() || "Nenhum"
  const errorMessage = log.match(/●.*\n\n\s+([\s\S]*?)(?=\n\s+at)/)?.[1]?.trim()
  const errorLocation = log.match(/at\s+(.*:\d+:\d+)/)?.[1]
  const passedText = passed ?? "Não encontrado"
  const failedText = failed ?? "Não encontrado"
  const totalText = total ?? "Não encontrado"
  const executionTime = `${timeMatch ? timeMatch[1] : "Não encontrado"} s`

  if (hasFailures) {
    return [
      bold(red("Resultado de testes com falhas")),
      "",
      `${cyan("Tests passed:")} ${green(String(passedText))}`,
      `${cyan("Tests failed:")} ${red(String(failedText))}`,
      `${cyan("Total tests:")} ${totalText}`,
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
    `${cyan("Tests passed:")} ${green(String(passedText))}`,
    `${cyan("Tests failed:")} ${green(String(failedText))}`,
    `${cyan("Total tests:")} ${totalText}`,
    `${cyan("Execution time:")} ${executionTime}`
  ].join("\n")
}
