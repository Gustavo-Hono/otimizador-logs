import { homedir } from "os"
import { Diagnostic, LogSummary, SourceLocation } from "./parsers/types"

export interface RenderOptions {
  maxItems: number
  maxChars: number
  maxStackFrames?: number
  cwd?: string
}

const statusLabel: Record<LogSummary["status"], string> = {
  pass: "PASS",
  fail: "FAIL",
  warn: "WARN",
  info: "INFO"
}

function shorten(value: string, cwd: string) {
  let result = value
  const home = homedir()
  if (cwd) result = result.split(`file://${cwd}/`).join("./")
  if (cwd) result = result.split(`${cwd}/`).join("./")
  if (home) result = result.split(`${home}/`).join("~/")
  return result.replace(/\s+/g, " ").trim()
}

function locationText(location: SourceLocation | undefined, cwd: string) {
  if (!location) return ""
  const line = location.line === undefined ? "" : `:${location.line}`
  const column = location.column === undefined ? "" : `:${location.column}`
  return `${shorten(location.file, cwd)}${line}${column}`
}

function metricValue(value: string | number) {
  const text = String(value)
  return /\s/.test(text) ? JSON.stringify(text) : text
}

function diagnosticKey(item: Diagnostic) {
  const location = item.location
    ? `${item.location.file}:${item.location.line || ""}:${item.location.column || ""}`
    : ""
  return [
    item.severity,
    item.code || "",
    item.title,
    location,
    item.details.join("\n"),
    item.stack.map(frame => `${frame.file}:${frame.line || ""}:${frame.column || ""}`).join("|")
  ].join("\u0000")
}

function deduplicate(items: Diagnostic[]) {
  const seen = new Set<string>()
  const unique: Diagnostic[] = []
  let duplicates = 0

  for (const item of items) {
    const key = diagnosticKey(item)
    if (seen.has(key)) {
      duplicates += 1
      continue
    }
    seen.add(key)
    unique.push(item)
  }

  return { unique, duplicates }
}

function appendCount(target: Record<string, number>, key: string, value: number) {
  if (value > 0) target[key] = (target[key] || 0) + value
}

function renderOmitted(omitted: Record<string, number>) {
  const values = Object.entries(omitted).filter(([, value]) => value > 0)
  return values.length
    ? `omitted: ${values.map(([key, value]) => `${key}=${value}`).join(" ")}`
    : ""
}

export function renderSummary(summary: LogSummary, options: RenderOptions) {
  const cwd = options.cwd || process.cwd()
  const maxStackFrames = options.maxStackFrames ?? 3
  const metrics = Object.entries(summary.metrics)
    .map(([key, value]) => `${key}=${metricValue(value)}`)
    .join(" ")
  const header = `${summary.tool} ${statusLabel[summary.status]}${metrics ? ` ${metrics}` : ""}`
  const omitted = { ...summary.omitted }
  const { unique, duplicates } = deduplicate(summary.diagnostics)
  appendCount(omitted, "duplicates", duplicates)

  const visible = unique.slice(0, options.maxItems)
  appendCount(omitted, "diagnostics", unique.length - visible.length)

  const lines = [header]
  visible.forEach((item, index) => {
    const location = locationText(item.location, cwd)
    const code = item.code ? `[${item.code}] ` : ""
    lines.push(`${index + 1}) ${location ? `${location} | ` : ""}${code}${shorten(item.title, cwd)}`)

    for (const detail of item.details.slice(0, 3)) {
      lines.push(`   ${shorten(detail, cwd)}`)
    }
    appendCount(omitted, "details", Math.max(0, item.details.length - 3))

    const stack = item.stack
      .filter(frame => !frame.file.includes("node_modules") && !frame.file.startsWith("node:internal"))
      .slice(0, maxStackFrames)
    if (stack.length) {
      lines.push(`   stack: ${stack.map(frame => locationText(frame, cwd)).join("; ")}`)
    }
    appendCount(omitted, "frames", Math.max(0, item.stack.length - stack.length))
  })

  const omittedLine = renderOmitted(omitted)
  if (omittedLine) lines.push(omittedLine)

  const output = lines.join("\n")
  if (output.length <= options.maxChars) return output

  const suffix = `\nomitted: chars=${output.length - options.maxChars}`
  const available = Math.max(header.length, options.maxChars - suffix.length)
  const cut = output.lastIndexOf("\n", available)
  return `${output.slice(0, cut > header.length ? cut : available)}${suffix}`.slice(0, options.maxChars)
}
