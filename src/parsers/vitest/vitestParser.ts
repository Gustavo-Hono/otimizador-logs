import { extractStack, firstMeaningfulLine, isProjectFrame, summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

function metric(log: string, label: string) {
  const line = log.match(new RegExp(`^\\s*${label}\\s+(.+)$`, "im"))?.[1]
  if (!line) return undefined
  const passed = Number(line.match(/(\d+)\s+passed/i)?.[1] || 0)
  const failed = Number(line.match(/(\d+)\s+failed/i)?.[1] || 0)
  const total = Number(line.match(/\((\d+)\)/)?.[1] || passed + failed)
  return { passed, failed, total }
}

function failureSections(log: string) {
  const matches = [...log.matchAll(/^FAIL\s+(.+)$/gm)]
  return matches.map((match, index) => ({
    name: match[1].trim(),
    body: log.slice(
      (match.index || 0) + match[0].length,
      matches[index + 1]?.index ?? undefined
    ).trim()
  }))
}

export const parseVitest: LogParser = (log) => {
  if (!/\bvitest\b|^\s*Test Files\s+/im.test(log)) return unmatched()

  const tests = metric(log, "Tests")
  const files = metric(log, "Test Files")
  const duration = log.match(/^\s*Duration\s+([^\s]+)/im)?.[1]
  const failed = (tests?.failed || 0) + (files?.failed || 0)
  const result = summary("vitest", failed ? "fail" : "pass", {
    ...(tests ? { tests: `${tests.passed}/${tests.total}` } : {}),
    ...(tests?.failed ? { failed: tests.failed } : {}),
    ...(files ? { files: `${files.passed}/${files.total}` } : {}),
    ...(files?.failed ? { failedFiles: files.failed } : {}),
    ...(duration ? { time: duration } : {})
  })

  for (const section of failureSections(log)) {
    const lines = section.body.split("\n")
    const stack = extractStack(section.body)
    const details = lines
      .map(line => line.trim())
      .filter(line => /^(expected|received|Expected|Received|AssertionError|Error:)/.test(line))
    result.diagnostics.push(diagnostic(section.name, {
      location: stack.find(isProjectFrame),
      details: details.length ? details : [firstMeaningfulLine(lines) || "Test failed"],
      stack
    }))
  }

  if (result.status === "fail" && !result.diagnostics.length) {
    result.diagnostics.push(diagnostic("Test run failed"))
  }

  return parsed(result)
}
