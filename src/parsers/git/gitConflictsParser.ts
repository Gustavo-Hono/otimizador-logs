import { bold, cyan, red, yellow } from "kleur/colors"

export function parseGitConflicts(log: string, command = "") {
  const rejectedMatch =
    log.match(/\[rejected\]\s+(\S+)\s+->\s+(\S+)/) ||
    log.match(/failed to push some refs to\s+['"]?([^'"\n]+)['"]?/i)

  const branchFromCommand =
    command.match(/(?:git\s+push|gp)\s+\S+\s+(\S+)/)?.[1] ||
    command.match(/(?:git\s+push|gp)\s+(\S+)/)?.[1]

  const localBranch = branchFromCommand || (rejectedMatch ? rejectedMatch[1] : "Não identificado")
  const remoteBranch = rejectedMatch?.[2] || localBranch
  const remote = log.match(/failed to push some refs to\s+['"]?([^'"\n]+)['"]?/i)?.[1] || "Não identificado"

  return [
    bold(red("Git push rejeitado: branch local desatualizada")),
    "",
    `${cyan("Branch local:")} ${localBranch}`,
    `${cyan("Branch remota:")} ${remoteBranch}`,
    `${cyan("Remote:")} ${remote}`,
    "",
    yellow("Motivo: existem commits no remoto que você ainda não trouxe para o local."),
    "",
    cyan("Próximos passos sugeridos:"),
    "1. git pull --rebase",
    "2. Resolver conflitos (se houver) e git add <arquivos>",
    "3. git rebase --continue",
    "4. git push"
  ].join("\n")
}
