import {
  countFrom,
  extractStack,
  firstMeaningfulLine,
  isProjectFrame,
  parseLocation,
  summary
} from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

function failureSections(log: string) {
  const matches = [...log.matchAll(/^●\s+(.+)$/gm)]
  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length
    const end = matches[index + 1]?.index ?? log.search(/^Test Suites:/m)
    return {
      name: match[1].trim(),
      body: log.slice(start, end < 0 ? undefined : end).trim()
    }
  })
}

export const parseJest: LogParser = (log) => {
  const testsSummary = log.match(/^Tests:\s*([^\r\n]+)/im)?.[1]
  const suitesSummary = log.match(/^Test Suites:\s*([^\r\n]+)/im)?.[1]
  if (!testsSummary && !suitesSummary && !/^FAIL\s+/m.test(log)) return unmatched()

  const failed = countFrom(testsSummary, "failed") || 0
  const passed = countFrom(testsSummary, "passed") || 0
  const total = countFrom(testsSummary, "total")
  const suiteFailed = countFrom(suitesSummary, "failed") || 0
  const suitePassed = countFrom(suitesSummary, "passed") || 0
  const suiteTotal = countFrom(suitesSummary, "total")
  const time = log.match(/^Time:\s+([\d.]+\s*m?s)/im)?.[1]?.replace(/\s+/g, "")
  const result = summary("jest", failed || suiteFailed ? "fail" : "pass", {
    tests: total === undefined ? `${passed} passed` : `${passed}/${total}`,
    ...(failed ? { failed } : {}),
    suites: suiteTotal === undefined ? `${suitePassed} passed` : `${suitePassed}/${suiteTotal}`,
    ...(suiteFailed ? { failedSuites: suiteFailed } : {}),
    ...(time ? { time } : {})
  })

  for (const section of failureSections(log)) {
    const lines = section.body.split("\n")
    const stack = extractStack(section.body)
    const location = stack.find(isProjectFrame)
      || parseLocation(lines.find(line => /:\d+:\d+/.test(line)) || "")
    const details = lines
      .map(line => line.trim())
      .filter(line => /^(Expected|Received|expected|received|Snapshot|Difference|Error:)/.test(line))

    result.diagnostics.push(diagnostic(
      firstMeaningfulLine(lines) || section.name,
      {
        title: section.name,
        location,
        details,
        stack
      }
    ))
  }

  if (result.status === "fail" && !result.diagnostics.length) {
    const failedFile = log.match(/^FAIL\s+(.+)$/m)?.[1]
    result.diagnostics.push(diagnostic(failedFile ? `Failed suite: ${failedFile}` : "Test run failed"))
  }

  return parsed(result)
}
