import { summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

function conflictFiles(log: string) {
  return [...new Set([
    ...[...log.matchAll(/CONFLITO.*? em (.+)/gi)].map(match => match[1].trim()),
    ...[...log.matchAll(/CONFLICT.*? in (.+)/gi)].map(match => match[1].trim()),
    ...[...log.matchAll(/^(.+): needs merge$/gim)].map(match => match[1].trim())
  ])]
}

export const parseGitRebase: LogParser = (log) => {
  const files = conflictFiles(log)
  const hasConflict = files.length > 0 || (
    /Resolve all conflicts manually|You must edit all merge conflicts/i.test(log)
  )

  if (hasConflict) {
    const commit = log.match(
      /(?:não foi possível aplicar|Could not apply)\s+([a-f0-9]+)\.\.\.\s*(.+)?/i
    )
    const result = summary("git-rebase", "fail", {
      conflicts: files.length,
      ...(commit?.[1] ? { commit: commit[1] } : {})
    })
    files.forEach(file => {
      result.diagnostics.push(diagnostic("merge conflict", {
        code: "CONFLICT",
        location: { file }
      }))
    })
    if (!files.length) result.diagnostics.push(diagnostic("merge conflict"))
    return parsed(result)
  }

  if (/Successfully rebased and updated|Current branch .* is up to date/i.test(log)) {
    return parsed(summary("git-rebase", "pass"))
  }
  return unmatched()
}
