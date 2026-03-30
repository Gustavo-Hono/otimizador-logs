import { bold, cyan, green, red, yellow } from "kleur/colors"

function extractUntracked(log: string) {
  const lines = log.split("\n")
  const untracked: string[] = []
  let inUntrackedSection = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (/^(Untracked files:|Arquivos não monitorados:)$/i.test(line)) {
      inUntrackedSection = true
      continue
    }

    if (!inUntrackedSection) continue

    if (
      /^(Changes not staged for commit:|Changes to be committed:|Unmerged paths:|On branch .+|No ramo .+|Your branch .+|Sua branch .+|nothing to commit|nada a submeter|nothing added to commit|nada adicionado ao envio)/i.test(
        line
      )
    ) {
      inUntrackedSection = false
      continue
    }

    if (!line) continue
    if (line.startsWith("(")) continue
    if (line.includes("git add")) continue

    untracked.push(line)
  }

  return untracked
}

export function parseGitStatus(log: string) {

  if (
    log.includes("nothing to commit, working tree clean") ||
    log.includes("nada a submeter, árvore de trabalho limpa") ||
    log.includes("nada a submeter, arvore de trabalho limpa")
  ) {
    return bold(green("Nada para commitar"))
  }

  const modified = [...log.matchAll(/modified:\s+(.*)/g)].map(m => m[1])
  const newFiles = [...log.matchAll(/new file:\s+(.*)/g)].map(m => m[1])
  const deleted = [...log.matchAll(/deleted:\s+(.*)/g)].map(m => m[1])
  const untracked = extractUntracked(log)

  const noCommits = log.includes("No commits yet")

  const modifiedCount = modified.length > 0 ? yellow(String(modified.length)) : green("0")
  const newCount = newFiles.length > 0 ? yellow(String(newFiles.length)) : green("0")
  const deletedCount = deleted.length > 0 ? yellow(String(deleted.length)) : green("0")
  const untrackedCount = untracked.length > 0 ? yellow(String(untracked.length)) : green("0")

  return [
    bold(cyan("Git status")),
    "",
    `${cyan("Modified")} (${modifiedCount}):`,
    modified.map((f) => red(`- ${f}`)).join("\n") || green("Nenhum"),
    "",
    `${cyan("New files")} (${newCount}):`,
    newFiles.map((f) => `- ${f}`).join("\n") || green("Nenhum"),
    "",
    `${cyan("Deleted")} (${deletedCount}):`,
    deleted.map((f) => red(`- ${f}`)).join("\n") || green("Nenhum"),
    "",
    `${cyan("Untracked")} (${untrackedCount}):`,
    untracked.map((f) => `- ${f}`).join("\n") || green("Nenhum"),
    noCommits ? `\n${yellow("Repositório ainda sem commits")}` : ""
  ].join("\n")
}
