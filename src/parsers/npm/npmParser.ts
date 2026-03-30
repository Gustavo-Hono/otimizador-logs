import { bold, cyan, green, red, yellow } from "kleur/colors"

function detectManager(command: string) {
  if (/\bpnpm\b/i.test(command)) return "pnpm"
  if (/\byarn\b/i.test(command)) return "yarn"
  return "npm"
}

function detectAction(command: string) {
  if (/\b(?:npm\s+i|npm\s+install|pnpm\s+add|yarn\s+add)\b/i.test(command)) {
    return "install"
  }
  return "unknown"
}

function getRequestedPackages(command: string) {
  const tokens = command.trim().split(/\s+/)

  const installIndex = tokens.findIndex((token, index) => {
    const prev = tokens[index - 1] || ""
    return (
      (prev === "npm" && (token === "i" || token === "install")) ||
      ((prev === "pnpm" || prev === "yarn") && token === "add")
    )
  })

  if (installIndex === -1) return []

  return tokens.slice(installIndex + 1).filter((token) => !token.startsWith("-"))
}

export function npmParser(log: string, command = "") {
  const manager = detectManager(command)
  const action = detectAction(command)
  const requestedPackages = getRequestedPackages(command)

  const addedMatch =
    log.match(/added\s+(\d+)\s+packages?/i) ||
    log.match(/Saved\s+(\d+)\s+new dependencies?/i)

  const auditedMatch = log.match(/audited\s+(\d+)\s+packages?/i)
  const doneTimeMatch = log.match(/Done in\s+([0-9.]+\w*)/i)
  const vulnMatch = log.match(/found\s+(\d+)\s+vulnerabilities?/i)
  const warningCount = (log.match(/\bwarn(?:ing)?\b/gi) || []).length
  const hasError = /\bnpm ERR!|error Command failed| ERR_PNPM_/i.test(log)

  const added = addedMatch?.[1] || "0"
  const audited = auditedMatch?.[1] || "Não informado"
  const execTime = doneTimeMatch?.[1] || "Não informado"
  const vulnerabilities = vulnMatch?.[1] || "Não informado"
  const vulnNumber = Number(vulnerabilities)

  if (hasError) {
    const errorLine =
      log
        .split("\n")
        .find((line) => /\bnpm ERR!|error Command failed| ERR_PNPM_/i.test(line)) ||
      "Erro não identificado"

    return [
      bold(red("Instalação com falha")),
      "",
      `${cyan("Gerenciador:")} ${manager}`,
      `${cyan("Ação:")} ${action}`,
      `${cyan("Pacotes solicitados:")} ${requestedPackages.join(", ") || "nenhum informado"}`,
      `${red("Erro:")} ${errorLine.trim()}`
    ].join("\n")
  }

  const warningsText = warningCount > 0 ? yellow(String(warningCount)) : green(String(warningCount))
  const vulnText =
    Number.isNaN(vulnNumber) ? yellow(vulnerabilities) : vulnNumber > 0 ? red(vulnerabilities) : green(vulnerabilities)

  return [
    bold(green("Instalação concluída")),
    "",
    `${cyan("Gerenciador:")} ${manager}`,
    `${cyan("Ação:")} ${action}`,
    `${cyan("Pacotes solicitados:")} ${requestedPackages.join(", ") || "nenhum informado"}`,
    `${cyan("Pacotes adicionados:")} ${green(added)}`,
    `${cyan("Pacotes auditados:")} ${audited}`,
    `${cyan("Vulnerabilidades:")} ${vulnText}`,
    `${cyan("Avisos no log:")} ${warningsText}`,
    `${cyan("Tempo total:")} ${execTime}`
  ].join("\n")
}
