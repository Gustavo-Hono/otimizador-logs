import { extractStack, isProjectFrame, summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

export const parsePlaywright: LogParser = (log) => {
  if (!/\bplaywright\b|Running \d+ tests? using \d+ workers?/i.test(log)) return unmatched()

  const passed = Number(log.match(/(\d+)\s+passed\b/i)?.[1] || 0)
  const failed = Number(log.match(/(\d+)\s+failed\b/i)?.[1] || 0)
  const skipped = Number(log.match(/(\d+)\s+skipped\b/i)?.[1] || 0)
  const duration = log.match(/\(([\d.]+\s*[msh]+)\)\s*$/im)?.[1]?.replace(/\s+/g, "")
  const result = summary("playwright", failed ? "fail" : "pass", {
    passed,
    failed,
    ...(skipped ? { skipped } : {}),
    ...(duration ? { time: duration } : {})
  })

  const failures = [...log.matchAll(/^\s*\d+\)\s+(.+?)(?=\n)/gm)]
  failures.forEach((match, index) => {
    const body = log.slice(
      (match.index || 0) + match[0].length,
      failures[index + 1]?.index ?? undefined
    )
    const stack = extractStack(body)
    const message = body.split("\n")
      .map(line => line.trim())
      .find(line => /^(?:Error|AssertionError|TimeoutError):/.test(line))
    result.diagnostics.push(diagnostic(match[1].trim(), {
      location: stack.find(isProjectFrame),
      details: message ? [message] : [],
      stack
    }))
  })

  if (failed && !result.diagnostics.length) result.diagnostics.push(diagnostic("Test run failed"))
  return passed || failed || skipped ? parsed(result) : unmatched()
}
