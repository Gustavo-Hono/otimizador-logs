export function parseGitPush(log: string, command = "") {
  const prUrl = log.match(/https:\/\/github\.com\/\S+\/pull\/new\/\S+/)?.[0]
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

  return `
Git push concluído:

Branch local: ${localBranch}
Branch remota: ${remoteBranch}
Remote: ${remote}
${prUrl ? `Pull request: ${prUrl}` : "Pull request: não sugerido"}
`.trim()
}
