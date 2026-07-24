import { diagnostic, LogParser, parsed, unmatched } from "../types"
import { summary } from "../helpers"

interface EslintJsonMessage {
  ruleId?: string | null
  severity: number
  message: string
  line?: number
  column?: number
}

interface EslintJsonFile {
  filePath: string
  messages: EslintJsonMessage[]
}

function parseJson(log: string) {
  if (!log.startsWith("[")) return undefined
  try {
    const value = JSON.parse(log) as EslintJsonFile[]
    return Array.isArray(value) ? value : undefined
  } catch {
    return undefined
  }
}

export const parseEslint: LogParser = (log, context) => {
  const result = summary("eslint", context.succeeded ? "pass" : "fail")
  const json = parseJson(log)

  if (json) {
    for (const file of json) {
      for (const message of file.messages || []) {
        result.diagnostics.push(diagnostic(message.message, {
          severity: message.severity === 1 ? "warning" : "error",
          code: message.ruleId || undefined,
          location: {
            file: file.filePath,
            line: message.line,
            column: message.column
          }
        }))
      }
    }
  } else {
    let currentFile: string | undefined
    for (const line of log.split("\n")) {
      const issue = line.match(/^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)(?:\s{2,}(\S+))?\s*$/)
      if (issue && currentFile) {
        result.diagnostics.push(diagnostic(issue[4].trim(), {
          severity: issue[3] === "warning" ? "warning" : "error",
          code: issue[5],
          location: {
            file: currentFile,
            line: Number(issue[1]),
            column: Number(issue[2])
          }
        }))
      } else if (line.trim() && !/^\s/.test(line) && !/^✖/.test(line)) {
        currentFile = line.trim()
      }
    }
  }

  const errors = result.diagnostics.filter(item => item.severity === "error").length
  const warnings = result.diagnostics.filter(item => item.severity === "warning").length
  if (errors || warnings || json) {
    result.status = errors ? "fail" : warnings ? "warn" : "pass"
    result.metrics = { errors, warnings, files: new Set(
      result.diagnostics.map(item => item.location?.file).filter(Boolean)
    ).size }
    return parsed(result)
  }

  const invokedEslint =
    context.command.endsWith("eslint") ||
    context.args.some(arg => /\beslint\b/.test(arg)) ||
    /(?:^|\n)>\s+.*\beslint\b/.test(log)
  if (context.succeeded && invokedEslint) {
    result.metrics = { errors: 0, warnings: 0 }
    return parsed(result)
  }

  return unmatched()
}
