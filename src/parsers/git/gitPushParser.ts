import { blue, bold, cyan, green, red, yellow } from "kleur/colors"

function normalizeGithubRepoUrl(remote: string) {
  const httpsMatch = remote.match(/^https:\/\/github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/)
  if (httpsMatch) return `https://github.com/${httpsMatch[1]}`

  const sshMatch = remote.match(/^git@github\.com:([^/]+\/[^/.]+)(?:\.git)?$/)
  if (sshMatch) return `https://github.com/${sshMatch[1]}`

  return null
}

export function parseGitPush(log: string, command = "", succeeded = true) {
  const prUrlFromLog =
    log.match(/https:\/\/github\.com\/\S+\/pull\/new\/\S+/)?.[0] ||
    log.match(/https:\/\/github\.com\/\S+\/compare\/\S+/)?.[0]
  const rejection = log.match(/^\s*!\s+\[(?:remote )?rejected\].*$/im)?.[0]?.trim()
  const errorMessage = log.match(/(?:^|\n)((?:error|fatal):[^\n]*)/i)?.[1]?.trim()
  const pushedBranchMatch =
    log.match(/\*\s+\[new branch\]\s+(\S+)\s+->\s+(\S+)/) ||
    log.match(/(?:^|\n)\s*[0-9a-f.]+\.\.[0-9a-f.]+\s+(\S+)\s+->\s+(\S+)/) ||
    log.match(/(?:^|\n)\s*\w+\s+(\S+)\s+->\s+(\S+)/)

  const commandBranchMatch =
    command.match(/(?:git\s+push|gp)\s+\S+\s+(\S+)/) ||
    command.match(/(?:git\s+push|gp)\s+(\S+)/)

  const remoteMatch = log.match(/To\s+(https?:\/\/\S+|git@\S+)/)
  const localBranch = pushedBranchMatch?.[1] || commandBranchMatch?.[1] || "Não identificado"
  const remoteBranch = pushedBranchMatch?.[2] || commandBranchMatch?.[1] || "Não identificado"
  const remote = remoteMatch?.[1] || "Não identificado"
  const repoUrl = normalizeGithubRepoUrl(remote)
  const fallbackPrUrl =
    repoUrl && remoteBranch !== "Não identificado" ? `${repoUrl}/pull/new/${remoteBranch}` : null
  const prUrl = prUrlFromLog || fallbackPrUrl

  if (!succeeded) {
    return [
      bold(red(rejection ? "Git push rejeitado" : "Git push falhou")),
      "",
      `${cyan("Branch local:")} ${localBranch}`,
      `${cyan("Branch remota:")} ${remoteBranch}`,
      `${cyan("Remote:")} ${remote}`,
      `${yellow("Motivo:")} ${rejection || errorMessage || "Falha não identificada"}`
    ].join("\n")
  }

  return [
    bold(green("Git push concluído")),
    "",
    `${cyan("Branch local:")} ${localBranch}`,
    `${cyan("Branch remota:")} ${remoteBranch}`,
    `${cyan("Remote:")} ${remote}`,
    prUrl ? `${cyan("Pull request:")} ${blue(prUrl)}` : yellow("Pull request: não sugerido")
  ].join("\n")
}
