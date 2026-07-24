import { extractStack, firstMeaningfulLine, isProjectFrame, summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

export const parseMocha: LogParser = (log) => {
  const passing = Number(log.match(/(\d+)\s+passing\b/i)?.[1] || 0)
  const failing = Number(log.match(/(\d+)\s+failing\b/i)?.[1] || 0)
  const pending = Number(log.match(/(\d+)\s+pending\b/i)?.[1] || 0)
  if (!passing && !failing && !pending) return unmatched()

  const duration = log.match(/\d+\s+passing\s+\(([^)]+)\)/i)?.[1]
  const result = summary("mocha", failing ? "fail" : "pass", {
    passed: passing,
    failed: failing,
    ...(pending ? { pending } : {}),
    ...(duration ? { time: duration } : {})
  })

  const failureStart = log.search(/^\s*\d+\s+failing\b/im)
  const failureLog = failureStart >= 0 ? log.slice(failureStart) : ""
  const matches = [...failureLog.matchAll(/^\s*(\d+)\)\s+(.+)$/gm)]
  for (const [index, match] of matches.entries()) {
    const body = failureLog.slice(
      (match.index || 0) + match[0].length,
      matches[index + 1]?.index ?? undefined
    ).trim()
    const lines = body.split("\n")
    const stack = extractStack(body)
    const nestedName = lines.find(line => /^\s*.+:\s*$/.test(line))?.trim().replace(/:$/, "")
    const title = [match[2].trim(), nestedName].filter(Boolean).join(" > ")
    const message = lines
      .map(line => line.trim())
      .find(line => /(?:Assertion|Type|Reference|Syntax|Range)?Error:/.test(line))
    result.diagnostics.push(diagnostic(title, {
      location: stack.find(isProjectFrame),
      details: [message || firstMeaningfulLine(lines) || "Test failed"],
      stack
    }))
  }

  if (failing && !result.diagnostics.length) {
    result.diagnostics.push(diagnostic("Test run failed"))
  }

  return parsed(result)
}
