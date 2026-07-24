import { LogSummary, SourceLocation } from "./types"

const LOCATION_PATTERNS = [
  /(?:\(|\s|^)((?:[A-Za-z]:)?[^()\s]+):(\d+):(\d+)\)?$/,
  /^((?:[A-Za-z]:)?[^()\s]+):(\d+):(\d+)$/
]

export function parseLocation(value: string): SourceLocation | undefined {
  const trimmed = value.trim()
  for (const pattern of LOCATION_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return {
        file: match[1],
        line: Number(match[2]),
        column: Number(match[3])
      }
    }
  }
  return undefined
}

export function extractStack(log: string): SourceLocation[] {
  const locations: SourceLocation[] = []
  for (const line of log.split("\n")) {
    if (!/^\s*(?:at|[❯>])\s+/.test(line)) continue
    const location = parseLocation(line)
    if (location) locations.push(location)
  }
  return locations
}

export function isProjectFrame(location: SourceLocation) {
  return !location.file.includes("node_modules") && !location.file.startsWith("node:internal")
}

export function countFrom(text: string | undefined, label: string) {
  const value = text?.match(new RegExp(`([\\d,]+)\\s+${label}`, "i"))?.[1]
  return value === undefined ? undefined : Number(value.replace(/,/g, ""))
}

export function firstMeaningfulLine(lines: string[]) {
  return lines
    .map(line => line.trim())
    .find(line => (
      line &&
      !line.startsWith("at ") &&
      !/^(FAIL|PASS|RUNS|Test Suites:|Tests:|Time:)/i.test(line)
    ))
}

export function summary(
  tool: string,
  status: "pass" | "fail" | "warn" | "info",
  metrics: Record<string, string | number> = {}
): LogSummary {
  return {
    tool,
    status,
    metrics,
    diagnostics: [],
    omitted: {}
  }
}
