import { bold, cyan, green, red, yellow } from "kleur/colors"
import { LogParser, parsed, unmatched } from "../types"

function extractConflictFiles(log: string) {
  const fromConflictPt = [...log.matchAll(/CONFLITO.*? em (.+)/gi)].map((m) => m[1].trim())
  const fromConflictEn = [...log.matchAll(/CONFLICT.*? in (.+)/gi)].map((m) => m[1].trim())
  const fromNeedsMerge = [...log.matchAll(/^(.+): needs merge$/gim)].map((m) => m[1].trim())

  return [...new Set([...fromConflictPt, ...fromConflictEn, ...fromNeedsMerge])]
}

export const parseGitRebase: LogParser = (log) => {
  const hasConflict =
    /CONFLITO|CONFLICT|needs merge|Resolve all conflicts manually|You must edit all merge conflicts/i.test(log)
  const files = extractConflictFiles(log)
  const commitMatch = log.match(/(?:não foi possível aplicar|Could not apply)\s+([a-f0-9]+)\.\.\.\s*(.+)?/i)

  if (hasConflict) {
    const commitId = commitMatch?.[1] || "não identificado"
    const commitMessage = commitMatch?.[2]?.trim() || "não identificado"

    return parsed([
      bold(red("Rebase stopped by conflicts")),
      "",
      `${cyan("Problematic commit:")} ${commitId}`,
      `${cyan("Commit message:")} ${commitMessage}`,
      "",
      `${yellow("Conflicting files")} (${files.length}):`,
      files.map((file) => red(`- ${file}`)).join("\n") || yellow("- unknown"),
      "",
      cyan("Suggested next steps:"),
      "1. Resolve the conflicts in the files above",
      "2. git add <resolved-files>",
      "3. git rebase --continue",
      "4. To cancel: git rebase --abort"
    ].join("\n"))
  }

  if (/Successfully rebased and updated|Current branch .* is up to date/i.test(log)) {
    return parsed(bold(green("Rebase completed without conflicts")))
  }

  return unmatched()
}
