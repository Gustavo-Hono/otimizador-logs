import { bold, cyan, green, red, yellow } from "kleur/colors"
import { LogParser, parsed, unmatched } from "../types"

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

function parseShortStatus(log: string) {
  const files: Record<Section, string[]> = {
    staged: [],
    unstaged: [],
    untracked: [],
    conflicts: []
  }
  const conflictCodes = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"])

  for (const line of log.split(/\r?\n/).filter(Boolean)) {
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

function renderStatus(files: Record<Section, string[]>, noCommits = false) {
  const renderSection = (title: string, entries: string[], highlight = false) => {
    const count = entries.length > 0 ? yellow(String(entries.length)) : green("0")
    const content = entries.length > 0
      ? entries.map(file => highlight ? red(`- ${file}`) : `- ${file}`).join("\n")
      : green("None")

    return `${cyan(title)} (${count}):\n${content}`
  }

  return [
    bold(cyan("Git status")),
    "",
    renderSection("Staged", files.staged),
    "",
    renderSection("Unstaged", files.unstaged, true),
    "",
    renderSection("Untracked", files.untracked),
    "",
    renderSection("Conflicts", files.conflicts, true),
    noCommits ? `\n${yellow("Repository has no commits yet")}` : ""
  ].join("\n")
}

export const parseGitStatus: LogParser = (log, context) => {
  const shortRequested = context.args.some(arg => (
    arg === "-s" || arg === "--short" || arg.startsWith("--porcelain")
  ))

  if (shortRequested) {
    if (!log.trim() && context.succeeded) return parsed(bold(green("Working tree clean")))
    const shortFiles = parseShortStatus(log)
    return shortFiles ? parsed(renderStatus(shortFiles)) : unmatched()
  }

  if (
    log.includes("nothing to commit, working tree clean") ||
    log.includes("nada a submeter, árvore de trabalho limpa") ||
    log.includes("nada a submeter, arvore de trabalho limpa")
  ) {
    return parsed(bold(green("Working tree clean")))
  }

  const files: Record<Section, string[]> = {
    staged: [],
    unstaged: [],
    untracked: [],
    conflicts: []
  }
  let section: Section | undefined
  let recognizedSection = false

  for (const line of log.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (sectionHeaders[trimmed]) {
      section = sectionHeaders[trimmed]
      recognizedSection = true
      continue
    }

    if (!section || !trimmed || trimmed.startsWith("(") || trimmed.includes("git add")) continue

    if (!/^\s/.test(line)) {
      section = undefined
      continue
    }

    if (section === "untracked") {
      files.untracked.push(trimmed)
      continue
    }

    const fileMatch = trimmed.match(/^([^:]+):\s+(.+)$/)
    if (fileMatch) files[section].push(`${fileMatch[1]}: ${fileMatch[2]}`)
  }

  if (!recognizedSection) return unmatched()

  const noCommits = log.includes("No commits yet") || log.includes("Ainda sem commits")

  return parsed(renderStatus(files, noCommits))
}
