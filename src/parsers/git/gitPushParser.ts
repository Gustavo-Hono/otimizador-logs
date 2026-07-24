import { summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

function commandPushTarget(args: readonly string[]) {
  const valueFlags = new Set(["--repo", "--receive-pack", "--exec"])
  const positional: string[] = []
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]
    if (valueFlags.has(token)) {
      index += 1
      continue
    }
    if (!token.startsWith("-")) positional.push(token)
  }
  return {
    remote: positional[0],
    branch: positional[1]?.split(":").pop()
  }
}

export const parseGitPush: LogParser = (log, context) => {
  const pushed =
    log.match(/\*\s+\[new branch\]\s+(\S+)\s+->\s+(\S+)/) ||
    log.match(/(?:^|\n)\s*[0-9a-f.]+\.\.[0-9a-f.]+\s+(\S+)\s+->\s+(\S+)/)
  const target = commandPushTarget(context.args)
  const remote = log.match(/To\s+(\S+)/)?.[1] || target.remote || "unknown"
  const branch = pushed?.[1] || target.branch || "unknown"
  const remoteBranch = pushed?.[2] || target.branch || "unknown"

  if (context.succeeded && (
    pushed || /Everything up-to-date/i.test(log)
  )) {
    return parsed(summary("git-push", "pass", {
      branch,
      remoteBranch,
      remote,
      state: /Everything up-to-date/i.test(log) ? "up-to-date" : "pushed"
    }))
  }

  const error = log.match(/(?:^|\n)((?:error|fatal):[^\n]*)/i)?.[1]?.trim()
  if (!context.succeeded && error) {
    const result = summary("git-push", "fail", { branch, remoteBranch, remote })
    result.diagnostics.push(diagnostic(error))
    return parsed(result)
  }
  return unmatched()
}
