import { bold, cyan, green, red, yellow } from "kleur/colors"

function extractConflictFiles(log: string) {
  const fromConflictPt = [...log.matchAll(/CONFLITO.*? em (.+)/gi)].map((m) => m[1].trim())
  const fromConflictEn = [...log.matchAll(/CONFLICT.*? in (.+)/gi)].map((m) => m[1].trim())
  const fromNeedsMerge = [...log.matchAll(/^(.+): needs merge$/gim)].map((m) => m[1].trim())

  return [...new Set([...fromConflictPt, ...fromConflictEn, ...fromNeedsMerge])]
}

export function parseGitRebase(log: string) {
  const hasConflict =
    /CONFLITO|CONFLICT|needs merge|Resolve all conflicts manually|You must edit all merge conflicts/i.test(log)
  const files = extractConflictFiles(log)
  const commitMatch = log.match(/(?:não foi possível aplicar|Could not apply)\s+([a-f0-9]+)\.\.\.\s*(.+)?/i)

  if (hasConflict) {
    const commitId = commitMatch?.[1] || "não identificado"
    const commitMessage = commitMatch?.[2]?.trim() || "não identificado"

    return [
      bold(red("Rebase interrompido por conflito")),
      "",
      `${cyan("Commit com problema:")} ${commitId}`,
      `${cyan("Mensagem do commit:")} ${commitMessage}`,
      "",
      `${yellow("Arquivos em conflito")} (${files.length}):`,
      files.map((file) => red(`- ${file}`)).join("\n") || yellow("- não identificado"),
      "",
      cyan("Próximos passos sugeridos:"),
      "1. Resolver conflitos nos arquivos acima",
      "2. git add <arquivos-resolvidos>",
      "3. git rebase --continue",
      "4. Se desistir: git rebase --abort"
    ].join("\n")
  }

  if (/Successfully rebased and updated|Current branch .* is up to date/i.test(log)) {
    return bold(green("Rebase concluído sem conflitos"))
  }

  return [
    bold(yellow("Comando de rebase executado")),
    "",
    yellow("Sem padrão conhecido para resumir essa saída."),
    "Saída original:",
    log.trim()
  ].join("\n")
}
