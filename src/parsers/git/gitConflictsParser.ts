import { summary } from "../helpers"
import { diagnostic, LogParser, parsed } from "../types"

export const parseGitConflicts: LogParser = (log, context) => {
  const rejected =
    log.match(/\[rejected\]\s+(\S+)\s+->\s+(\S+)(?:\s+\(([^)]+)\))?/) ||
    log.match(/failed to push some refs to\s+['"]?([^'"\n]+)['"]?/i)
  const positional = context.args.slice(1).filter(arg => !arg.startsWith("-"))
  const branch = positional[1]?.split(":").pop() || rejected?.[1] || "unknown"
  const remoteBranch = rejected?.[2] || branch
  const remote =
    log.match(/failed to push some refs to\s+['"]?([^'"\n]+)['"]?/i)?.[1] ||
    positional[0] ||
    "unknown"
  const reason = rejected?.[3] || (
    /non-fast-forward|fetch first|branch is behind/i.test(log) ? "non-fast-forward" : "rejected"
  )
  const result = summary("git-push", "fail", {
    branch,
    remoteBranch,
    remote
  })
  result.diagnostics.push(diagnostic(reason, { code: "REJECTED" }))
  return parsed(result)
}
