import { summary } from "../helpers"
import { diagnostic, LogParser, parsed, unmatched } from "../types"

type Section = "staged" | "unstaged" | "untracked" | "conflicts"

const sectionHeaders: Record<string, Section> = {
  "Changes to be committed:": "staged",
  "Alterações a serem submetidas:": "staged",
  "Changes not staged for commit:": "unstaged",
  "Alterações fora da área de preparação:": "unstaged",
  "Alterações não preparadas para commit:": "unstaged",
  "Untracked files:": "untracked",
  "Arquivos não monitorados:": "untracked",
  "Unmerged paths:": "conflicts",
  "Caminhos não mesclados:": "conflicts"
}

function emptySections(): Record<Section, string[]> {
  return { staged: [], unstaged: [], untracked: [], conflicts: [] }
}

function parseShort(log: string) {
  const files = emptySections()
  const conflictCodes = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"])
  for (const line of log.split("\n").filter(Boolean)) {
    const code = line.slice(0, 2)
    const file = line.slice(3).trim()
    if (!file || code.length !== 2) return undefined
    if (code === "??") files.untracked.push(file)
    else if (conflictCodes.has(code)) files.conflicts.push(file)
    else {
      if (code[0] !== " ") files.staged.push(file)
      if (code[1] !== " ") files.unstaged.push(file)
    }
  }
  return files
}

function statusSummary(files: Record<Section, string[]>) {
  const result = summary("git-status", files.conflicts.length ? "fail" : "info", {
    staged: files.staged.length,
    unstaged: files.unstaged.length,
    untracked: files.untracked.length,
    conflicts: files.conflicts.length
  })
  for (const section of Object.keys(files) as Section[]) {
    for (const file of files[section]) {
      result.diagnostics.push(diagnostic(section, {
        severity: section === "conflicts" ? "error" : "info",
        location: { file }
      }))
    }
  }
  return result
}

export const parseGitStatus: LogParser = (log, context) => {
  const shortRequested = context.args.some(arg => (
    arg === "-s" || arg === "--short" || arg.startsWith("--porcelain")
  ))
  if (shortRequested) {
    if (!log && context.succeeded) {
      return parsed(summary("git-status", "pass", {
        staged: 0, unstaged: 0, untracked: 0, conflicts: 0
      }))
    }
    const files = parseShort(log)
    return files ? parsed(statusSummary(files)) : unmatched()
  }

  if (
    /nothing to commit, working tree clean|nada a submeter, [áa]rvore de trabalho limpa/i.test(log)
  ) {
    return parsed(summary("git-status", "pass", {
      staged: 0, unstaged: 0, untracked: 0, conflicts: 0
    }))
  }

  const files = emptySections()
  let section: Section | undefined
  let recognized = false
  for (const line of log.split("\n")) {
    const trimmed = line.trim()
    if (sectionHeaders[trimmed]) {
      section = sectionHeaders[trimmed]
      recognized = true
      continue
    }
    if (!section || !trimmed || trimmed.startsWith("(") || trimmed.includes("git add")) continue
    if (!/^\s/.test(line)) {
      section = undefined
      continue
    }
    if (section === "untracked") files.untracked.push(trimmed)
    else {
      const match = trimmed.match(/^[^:]+:\s+(.+)$/)
      if (match) files[section].push(match[1])
    }
  }
  return recognized ? parsed(statusSummary(files)) : unmatched()
}
