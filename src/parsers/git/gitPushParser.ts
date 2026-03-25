export function parseGitPush(log: string) {
  const prUrl = log.match(/https:\/\/github\.com\/\S+\/pull\/new\/\S+/)?.[0]
  const pushedBranchMatch = log.match(/\*\s+\[new branch\]\s+(\S+)\s+->\s+(\S+)/)
  const remoteMatch = log.match(/To\s+(https?:\/\/\S+|git@\S+)/)

  const localBranch = pushedBranchMatch?.[1] || "Não identificado"
  const remoteBranch = pushedBranchMatch?.[2] || "Não identificado"
  const remote = remoteMatch?.[1] || "Não identificado"

  return `
Git push concluído:

Branch local: ${localBranch}
Branch remota: ${remoteBranch}
Remote: ${remote}
${prUrl ? `Pull request: ${prUrl}` : "Pull request: não sugerido"}
`.trim()
}
