import { diagnostic, LogParser, parsed, unmatched } from "../types"
import { summary } from "../helpers"

const diagnosticPattern =
  /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/
const prettyDiagnosticPattern =
  /^(.+?):(\d+):(\d+)\s+-\s+(error|warning)\s+(TS\d+):\s+(.+)$/
const globalDiagnosticPattern = /^(error|warning)\s+(TS\d+):\s+(.+)$/

export const parseTypeScript: LogParser = (log, context) => {
  const result = summary("tsc", context.succeeded ? "pass" : "fail")

  for (const line of log.split("\n")) {
    const match = line.match(diagnosticPattern) || line.match(prettyDiagnosticPattern)
    if (match) {
      result.diagnostics.push(diagnostic(match[6], {
        severity: match[4] === "warning" ? "warning" : "error",
        code: match[5],
        location: {
          file: match[1],
          line: Number(match[2]),
          column: Number(match[3])
        }
      }))
      continue
    }

    const global = line.match(globalDiagnosticPattern)
    if (global) {
      result.diagnostics.push(diagnostic(global[3], {
        severity: global[1] === "warning" ? "warning" : "error",
        code: global[2]
      }))
    }
  }

  const errors = result.diagnostics.filter(item => item.severity === "error").length
  const warnings = result.diagnostics.filter(item => item.severity === "warning").length
  if (errors || warnings) {
    result.status = errors ? "fail" : "warn"
    result.metrics = { errors, warnings }
    return parsed(result)
  }

  const invokedTypeScript =
    context.command.endsWith("tsc") ||
    context.args.some(arg => /\btsc\b/.test(arg)) ||
    /(?:^|\n)>\s+.*\btsc\b/.test(log)
  if (context.succeeded && invokedTypeScript) {
    result.metrics = { errors: 0 }
    return parsed(result)
  }

  return unmatched()
}
