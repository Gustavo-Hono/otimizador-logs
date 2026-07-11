import { bold, cyan, green, red, yellow } from "kleur/colors"

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

export function parseGitStatus(log: string) {
  if (
    log.includes("nothing to commit, working tree clean") ||
    log.includes("nada a submeter, árvore de trabalho limpa") ||
    log.includes("nada a submeter, arvore de trabalho limpa")
  ) {
    return bold(green("Nada para commitar"))
  }

  const files: Record<Section, string[]> = {
    staged: [],
    unstaged: [],
    untracked: [],
    conflicts: []
  }
  let section: Section | undefined

  for (const line of log.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (sectionHeaders[trimmed]) {
      section = sectionHeaders[trimmed]
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

  const renderSection = (title: string, entries: string[], highlight = false) => {
    const count = entries.length > 0 ? yellow(String(entries.length)) : green("0")
    const content = entries.length > 0
      ? entries.map(file => highlight ? red(`- ${file}`) : `- ${file}`).join("\n")
      : green("Nenhum")

    return `${cyan(title)} (${count}):\n${content}`
  }
  const noCommits = log.includes("No commits yet") || log.includes("Ainda sem commits")

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
    noCommits ? `\n${yellow("Repositório ainda sem commits")}` : ""
  ].join("\n")
}
