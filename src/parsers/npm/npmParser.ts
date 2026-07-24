import { summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

function manager(command: string) {
  if (command.endsWith("pnpm")) return "pnpm"
  if (command.endsWith("yarn")) return "yarn"
  return "npm"
}

export const npmParser: LogParser = (log, context) => {
  const tool = manager(context.command)
  const added =
    log.match(/added\s+(\d+)\s+packages?/i)?.[1] ||
    log.match(/Saved\s+(\d+)\s+new dependenc(?:y|ies)/i)?.[1] ||
    log.match(/Packages:\s*\+(\d+)/i)?.[1]
  const audited = log.match(/audited\s+(\d+)\s+packages?/i)?.[1]
  const vulnerabilities = log.match(/found\s+(\d+)\s+vulnerabilities?/i)?.[1]
  const time = log.match(/Done in\s+([0-9.]+\w*)/i)?.[1]
  const errorCode =
    log.match(/npm ERR! code ([A-Z][A-Z0-9_]+)/i)?.[1] ||
    log.match(/\b(ERR_PNPM_[A-Z0-9_]+|ERESOLVE|EACCES|ENOENT|ETIMEDOUT)\b/)?.[1]
  const errorLine = log.split("\n").find(line => (
    /\bnpm ERR!|error Command failed|ERR_PNPM_|ERESOLVE/i.test(line)
  ))

  if (!context.succeeded && (errorLine || errorCode)) {
    const result = summary(tool, "fail", { errors: 1 })
    result.diagnostics.push(diagnostic(
      (errorLine || log.split("\n").find(Boolean) || "Command failed").trim(),
      { code: errorCode }
    ))
    return parsed(result)
  }

  if (added || audited || time || /up to date|already up-to-date/i.test(log)) {
    return parsed(summary(tool, Number(vulnerabilities || 0) > 0 ? "warn" : "pass", {
      ...(added ? { added: Number(added) } : {}),
      ...(audited ? { audited: Number(audited) } : {}),
      ...(vulnerabilities ? { vulnerabilities: Number(vulnerabilities) } : {}),
      ...(time ? { time } : {})
    }))
  }
  return unmatched()
}
