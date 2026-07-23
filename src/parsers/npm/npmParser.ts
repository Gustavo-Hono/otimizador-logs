import { bold, cyan, green, red, yellow } from "kleur/colors"
import { LogParser, parsed, unmatched } from "../types"

function detectManager(command: string) {
  if (command === "pnpm") return "pnpm"
  if (command === "yarn") return "yarn"
  return "npm"
}

function detectAction(command: string, args: readonly string[]) {
  if (
    (command === "npm" && (args[0] === "i" || args[0] === "install")) ||
    ((command === "pnpm" || command === "yarn") && (
      args[0] === "add" || args[0] === "install"
    ))
  ) {
    return "install"
  }
  return "unknown"
}

function getRequestedPackages(args: readonly string[]) {
  return args.slice(1).filter(token => !token.startsWith("-"))
}

export const npmParser: LogParser = (log, context) => {
  const manager = detectManager(context.command)
  const action = detectAction(context.command, context.args)
  const requestedPackages = getRequestedPackages(context.args)

  const addedMatch =
    log.match(/added\s+(\d+)\s+packages?/i) ||
    log.match(/Saved\s+(\d+)\s+new dependenc(?:y|ies)/i) ||
    log.match(/Packages:\s*\+(\d+)/i)

  const auditedMatch = log.match(/audited\s+(\d+)\s+packages?/i)
  const doneTimeMatch = log.match(/Done in\s+([0-9.]+\w*)/i)
  const vulnMatch = log.match(/found\s+(\d+)\s+vulnerabilities?/i)
  const warningCount = (log.match(/\bwarn(?:ing)?\b/gi) || []).length
  const hasError = !context.succeeded || /\bnpm ERR!|error Command failed| ERR_PNPM_/i.test(log)

  const added = addedMatch?.[1] || "0"
  const audited = auditedMatch?.[1] || "Not reported"
  const execTime = doneTimeMatch?.[1] || "Not reported"
  const vulnerabilities = vulnMatch?.[1] || "Not reported"
  const vulnNumber = Number(vulnerabilities)

  if (hasError) {
    const logLines = log.trim().split("\n")
    const errorLine =
      log
        .split("\n")
        .find((line) => /\bnpm ERR!|error Command failed| ERR_PNPM_/i.test(line)) ||
      logLines[logLines.length - 1] ||
      "Unknown error"

    return parsed([
      bold(red("Installation failed")),
      "",
      `${cyan("Package manager:")} ${manager}`,
      `${cyan("Action:")} ${action}`,
      `${cyan("Requested packages:")} ${requestedPackages.join(", ") || "none specified"}`,
      `${red("Error:")} ${errorLine.trim()}`
    ].join("\n"))
  }

  if (!addedMatch && !auditedMatch && !doneTimeMatch && !/up to date|already up-to-date/i.test(log)) {
    return unmatched()
  }

  const warningsText = warningCount > 0 ? yellow(String(warningCount)) : green(String(warningCount))
  const vulnText =
    Number.isNaN(vulnNumber) ? yellow(vulnerabilities) : vulnNumber > 0 ? red(vulnerabilities) : green(vulnerabilities)

  return parsed([
    bold(green("Installation completed")),
    "",
    `${cyan("Package manager:")} ${manager}`,
    `${cyan("Action:")} ${action}`,
    `${cyan("Requested packages:")} ${requestedPackages.join(", ") || "none specified"}`,
    `${cyan("Packages added:")} ${green(added)}`,
    `${cyan("Packages audited:")} ${audited}`,
    `${cyan("Vulnerabilities:")} ${vulnText}`,
    `${cyan("Warnings in log:")} ${warningsText}`,
    `${cyan("Total time:")} ${execTime}`
  ].join("\n"))
}
