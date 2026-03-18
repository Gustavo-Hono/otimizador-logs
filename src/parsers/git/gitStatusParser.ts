export function parseGitStatus(log: string) {

  if (log.includes("nothing to commit, working tree clean")) {
    return "Nada para commitar, árvore limpa"
  }

  const modified = [...log.matchAll(/modified:\s+(.*)/g)].map(m => m[1])
  const newFiles = [...log.matchAll(/new file:\s+(.*)/g)].map(m => m[1])
  const deleted = [...log.matchAll(/deleted:\s+(.*)/g)].map(m => m[1])

  const noCommits = log.includes("No commits yet")

  return `
Git status:

Modified (${modified.length}):
${modified.map(f => `- ${f}`).join("\n") || "Nenhum"}

New files (${newFiles.length}):
${newFiles.map(f => `- ${f}`).join("\n") || "Nenhum"}

Deleted (${deleted.length}):
${deleted.map(f => `- ${f}`).join("\n") || "Nenhum"}

${noCommits ? "\nRepositório ainda sem commits" : ""}
`
}