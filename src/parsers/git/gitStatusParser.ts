import { bold, cyan, green, yellow } from "kleur/colors"

export function parseGitStatus(log: string) {

  if (log.includes("nothing to commit, working tree clean")) {
    return bold(green("Nada para commitar"))
  }

  const modified = [...log.matchAll(/modified:\s+(.*)/g)].map(m => m[1])
  const newFiles = [...log.matchAll(/new file:\s+(.*)/g)].map(m => m[1])
  const deleted = [...log.matchAll(/deleted:\s+(.*)/g)].map(m => m[1])

  const noCommits = log.includes("No commits yet")

  const modifiedCount = modified.length > 0 ? yellow(String(modified.length)) : green("0")
  const newCount = newFiles.length > 0 ? yellow(String(newFiles.length)) : green("0")
  const deletedCount = deleted.length > 0 ? yellow(String(deleted.length)) : green("0")

  return [
    bold(cyan("Git status")),
    "",
    `${cyan("Modified")} (${modifiedCount}):`,
    modified.map((f) => `- ${f}`).join("\n") || green("Nenhum"),
    "",
    `${cyan("New files")} (${newCount}):`,
    newFiles.map((f) => `- ${f}`).join("\n") || green("Nenhum"),
    "",
    `${cyan("Deleted")} (${deletedCount}):`,
    deleted.map((f) => `- ${f}`).join("\n") || green("Nenhum"),
    noCommits ? `\n${yellow("Repositório ainda sem commits")}` : ""
  ].join("\n")
}
