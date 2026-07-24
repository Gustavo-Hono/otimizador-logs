const ANSI_PATTERN = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*)?\\u0007)|(?:(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
  "g"
)

const SPINNER_PREFIX = /^\s*[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏◐◓◑◒⣾⣽⣻⢿⡿⣟⣯⣷]\s*/

export interface NormalizedLog {
  text: string
  omittedLines: number
}

export function normalizeLog(log: string): NormalizedLog {
  const cleaned = log
    .replace(ANSI_PATTERN, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]/g, "")

  const lines: string[] = []
  let omittedLines = 0

  for (const originalLine of cleaned.split("\n")) {
    const line = originalLine.replace(SPINNER_PREFIX, "").trimEnd()
    if (line && lines[lines.length - 1] === line) {
      omittedLines += 1
      continue
    }
    lines.push(line)
  }

  return {
    text: lines.join("\n").replace(/^\n+|\n+$/g, ""),
    omittedLines
  }
}
