import { bold, cyan, green, red, yellow } from "kleur/colors"

function extractUntracked(log: string) {
  const sectionMatch =
    log.match(/Untracked files:[\s\S]*?(?=\n\n|\Z)/i) ||
    log.match(/Arquivos não monitorados:[\s\S]*?(?=\n\n|\Z)/i)

  if (!sectionMatch) return []

  return sectionMatch[0]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false
      if (line.endsWith(":")) return false
      if (line.startsWith("(")) return false
      if (line.includes("git add")) return false
      return true
    })
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
