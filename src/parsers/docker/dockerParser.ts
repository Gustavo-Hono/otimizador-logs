import { summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

export const parseDocker: LogParser = (log, context) => {
  if (!/^\s*#\d+\s+/m.test(log) && !/failed to solve|docker build/i.test(log)) {
    return unmatched()
  }

  const steps = new Set([...log.matchAll(/^\s*#(\d+)\s+/gm)].map(match => match[1])).size
  const cached = [...log.matchAll(/^\s*#\d+\s+CACHED\b/gm)].length
  const failure = /ERROR: failed to solve|^\s*#\d+\s+ERROR\b/m.test(log) || !context.succeeded
  const result = summary("docker", failure ? "fail" : "pass", {
    steps,
    ...(cached ? { cached } : {})
  })

  if (failure) {
    const error =
      log.match(/ERROR:\s+failed to solve:\s*(.+)$/im)?.[1] ||
      log.match(/^\s*#\d+\s+ERROR:\s*(.+)$/im)?.[1] ||
      "Build failed"
    result.diagnostics.push(diagnostic(error.trim()))
  }
  return parsed(result)
}
