import { summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

export const parseGitOperation: LogParser = (log, context) => {
  const operation = context.args[0] || "operation"
  const conflicts = [
    ...log.matchAll(/CONFLICT.*? in (.+)$/gim),
    ...log.matchAll(/CONFLITO.*? em (.+)$/gim)
  ].map(match => match[1].trim())

  if (conflicts.length) {
    const result = summary(`git-${operation}`, "fail", { conflicts: conflicts.length })
    conflicts.forEach(file => {
      result.diagnostics.push(diagnostic("merge conflict", {
        code: "CONFLICT",
        location: { file }
      }))
    })
    return parsed(result)
  }

  const error = log.match(/(?:^|\n)((?:error|fatal):[^\n]+)/i)?.[1]
  if (!context.succeeded && error) {
    const result = summary(`git-${operation}`, "fail", { errors: 1 })
    result.diagnostics.push(diagnostic(error.trim()))
    return parsed(result)
  }

  if (operation === "clone" && /Cloning into|Receiving objects:/i.test(log)) {
    const repository = log.match(/Cloning into ['"]?([^'"\n]+)['"]?/i)?.[1]
    return parsed(summary("git-clone", "pass", {
      ...(repository ? { repository } : {})
    }))
  }

  if (
    /Switched to (?:a new )?branch|Already on|Your branch is up to date/i.test(log)
  ) {
    const branch = log.match(/branch ['"]([^'"]+)['"]/i)?.[1]
    return parsed(summary(`git-${operation}`, "pass", {
      ...(branch ? { branch } : {})
    }))
  }

  if (operation === "fetch" && context.succeeded) {
    const refs = [...log.matchAll(/->\s+(\S+)$/gm)].length
    return parsed(summary("git-fetch", "pass", { refs }))
  }

  if (/Already up to date|Fast-forward|Merge made by/i.test(log)) {
    return parsed(summary(`git-${operation}`, "pass"))
  }
  return unmatched()
}
