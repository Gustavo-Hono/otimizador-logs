import { extractStack, isProjectFrame, summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

const nodeErrorPattern =
  /^(?:(?:node:internal[^]*?\n)?)([A-Za-z]*Error)(?:\s+\[([A-Z][A-Z0-9_]+)\])?:\s*(.+)$/m

export const parseNode: LogParser = (log) => {
  const match = log.match(nodeErrorPattern)
  const codeOnly = log.match(/^([A-Z][A-Z0-9_]+):\s*(.+)$/m)
  if (!match && !codeOnly && !/UnhandledPromiseRejection/i.test(log)) return unmatched()

  const stack = extractStack(log)
  const title = match
    ? `${match[1]}: ${match[3]}`
    : codeOnly
      ? codeOnly[2]
      : "Unhandled promise rejection"
  const code = match?.[2] || codeOnly?.[1]
  const result = summary("node", "fail", { errors: 1 })
  result.diagnostics.push(diagnostic(title, {
    code,
    location: stack.find(isProjectFrame),
    stack
  }))
  return parsed(result)
}
