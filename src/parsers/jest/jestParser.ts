import { bold, cyan, green, red, yellow } from "kleur/colors"
import { LogParser, parsed, unmatched } from "../types"

export const parseJest: LogParser = (log) => {
  const testsSummary = log.match(/Tests:\s*([^\r\n]+)/i)?.[1]
  const readCount = (label: string) => {
    const value = testsSummary?.match(new RegExp(`([\\d,]+)\\s+${label}`, "i"))?.[1]
    return value ? Number(value.replace(/,/g, "")) : undefined
  }

  const passed = testsSummary ? readCount("passed") ?? 0 : undefined
  const failed = testsSummary ? readCount("failed") ?? 0 : undefined
  const total = testsSummary ? readCount("total") : undefined
  const timeMatch = log.match(/Time:\s+([\d.]+)\s*m?s/i)
  const hasFailures = (failed ?? 0) > 0 || (!testsSummary && /\bFAIL\b/.test(log))
  const failedTestName = log.match(/●\s+(.*)/)?.[1]?.trim() || "Unknown"
  const errorMessage = log.match(/●.*\n\n\s+([\s\S]*?)(?=\n\s+at)/)?.[1]?.trim()
  const errorLocation = log.match(/at\s+(.*:\d+:\d+)/)?.[1]
  if (!testsSummary && !hasFailures) return unmatched()

  const passedText = passed ?? "Unknown"
  const failedText = failed ?? "Unknown"
  const totalText = total ?? "Unknown"
  const executionTime = timeMatch ? `${timeMatch[1]} s` : "Unknown"

  if (hasFailures) {
    return parsed([
      bold(red("Test run failed")),
      "",
      `${cyan("Tests passed:")} ${green(String(passedText))}`,
      `${cyan("Tests failed:")} ${red(String(failedText))}`,
      `${cyan("Total tests:")} ${totalText}`,
      `${cyan("Execution time:")} ${executionTime}`,
      "",
      bold(yellow("Failure details")),
      `${yellow("Name:")} ${failedTestName}`,
      `${yellow("Error:")} ${errorMessage || "Generic error or system failure"}`,
      `${yellow("Location:")} ${errorLocation || "Unknown"}`
    ].join("\n"))
  }

  return parsed([
    bold(green("All tests passed")),
    "",
    `${cyan("Tests passed:")} ${green(String(passedText))}`,
    `${cyan("Tests failed:")} ${green(String(failedText))}`,
    `${cyan("Total tests:")} ${totalText}`,
    `${cyan("Execution time:")} ${executionTime}`
  ].join("\n"))
}
