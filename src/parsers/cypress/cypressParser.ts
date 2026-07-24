import { extractStack, isProjectFrame, summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

export const parseCypress: LogParser = (log) => {
  if (!/\bCypress\b|\(Run Finished\)|cypress\/e2e/i.test(log)) return unmatched()

  const passing = Number(log.match(/(\d+)\s+passing\b/i)?.[1] || 0)
  const failing = Number(log.match(/(\d+)\s+failing\b/i)?.[1] || 0)
  const pending = Number(log.match(/(\d+)\s+pending\b/i)?.[1] || 0)
  const skipped = Number(log.match(/(\d+)\s+skipped\b/i)?.[1] || 0)
  const result = summary("cypress", failing ? "fail" : "pass", {
    passed: passing,
    failed: failing,
    ...(pending ? { pending } : {}),
    ...(skipped ? { skipped } : {})
  })

  const failureStart = log.search(/^\s*\d+\s+failing\b/im)
  const failureLog = failureStart >= 0 ? log.slice(failureStart) : ""
  const failures = [...failureLog.matchAll(/^\s*\d+\)\s+(.+)$/gm)]
  failures.forEach((match, index) => {
    const body = failureLog.slice(
      (match.index || 0) + match[0].length,
      failures[index + 1]?.index ?? undefined
    )
    const stack = extractStack(body)
    const nestedName = body.split("\n")
      .find(line => /^\s*.+:\s*$/.test(line))
      ?.trim()
      .replace(/:$/, "")
    const message = body.split("\n")
      .map(line => line.trim())
      .find(line => /(?:Assertion|Type|Reference)?Error:/.test(line))
    result.diagnostics.push(diagnostic(
      [match[1].trim(), nestedName].filter(Boolean).join(" > "),
      {
      location: stack.find(isProjectFrame),
      details: message ? [message] : [],
      stack
      }
    ))
  })

  if (failing && !result.diagnostics.length) result.diagnostics.push(diagnostic("Test run failed"))
  return passing || failing || pending || skipped ? parsed(result) : unmatched()
}
