export function parseJest(log: string) {

  const passed = log.match(/PASS/g)?.length || 0
  const failed = log.match(/FAIL/g)?.length || 0
  const testMatch = log.match(/Tests:\s+(\d+)/)
  const timeMatch = log.match(/Time:\s+([\d.]+)\s*m?s/i)

  const failedTestName = log.match(/●\s+(.*)/)?.[1]?.trim() || "Nenhum"
  const errorMessage = log.match(/●.*\n\n\s+([\s\S]*?)(?=\n\s+at)/)?.[1]?.trim()

  const errorLocation = log.match(/at\s+(.*:\d+:\d+)/)?.[1]

  return `
tests passed: ${passed}
tests failed: ${failed}
total tests: ${testMatch ? testMatch[1] : "Não encontrado"}
execution time: ${timeMatch ? timeMatch[1] : "Não encontrado"} s

${failed > 0 ? `
🔍 Detalhes da Falha:
-------------------
Nome: ${failedTestName}
Erro: ${errorMessage || "Erro genérico ou falha de sistema"}
Local: ${errorLocation || "Não identificado"}
` : "✨ Todos os testes passaram com sucesso!"}
`.trim()
}