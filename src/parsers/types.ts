export type LogStatus = "pass" | "fail" | "warn" | "info"
export type DiagnosticSeverity = "error" | "warning" | "info"

export interface SourceLocation {
  file: string
  line?: number
  column?: number
}

export interface Diagnostic {
  severity: DiagnosticSeverity
  code?: string
  title: string
  location?: SourceLocation
  details: string[]
  stack: SourceLocation[]
}

export interface LogSummary {
  tool: string
  status: LogStatus
  metrics: Record<string, string | number>
  diagnostics: Diagnostic[]
  omitted: Record<string, number>
}

export interface ParserContext {
  command: string
  args: readonly string[]
  succeeded: boolean
  cwd: string
}

export type ParseResult =
  | { matched: true; summary: LogSummary }
  | { matched: false }

export type LogParser = (log: string, context: ParserContext) => ParseResult

export const parsed = (summary: LogSummary): ParseResult => ({ matched: true, summary })
export const unmatched = (): ParseResult => ({ matched: false })

export const diagnostic = (
  title: string,
  overrides: Partial<Diagnostic> = {}
): Diagnostic => ({
  severity: "error",
  title,
  details: [],
  stack: [],
  ...overrides
})
