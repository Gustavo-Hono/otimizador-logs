import { blue, bold, cyan, green, red, yellow } from "kleur/colors"
import { LogParser, parsed, unmatched } from "../types"

function normalizeGithubRepoUrl(remote: string) {
  const httpsMatch = remote.match(/^https:\/\/github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/)
  if (httpsMatch) return `https://github.com/${httpsMatch[1]}`

  const sshMatch = remote.match(/^git@github\.com:([^/]+\/[^/.]+)(?:\.git)?$/)
  if (sshMatch) return `https://github.com/${sshMatch[1]}`

  return null
}

function commandPushTarget(args: readonly string[]) {
  const valueFlags = new Set(["--repo", "--receive-pack", "--exec"])
  const positional: string[] = []

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]
    if (valueFlags.has(token)) {
      index += 1
      continue
    }
    if (token.startsWith("-")) continue
    positional.push(token)
  }

  const remote = positional[0]
  const refspec = positional[1]
  const branch = refspec?.split(":").pop()
  return { remote, branch }
}

export const parseGitPush: LogParser = (log, context) => {
  const prUrlFromLog =
    log.match(/https:\/\/github\.com\/\S+\/pull\/new\/\S+/)?.[0] ||
    log.match(/https:\/\/github\.com\/\S+\/compare\/\S+/)?.[0]
  const rejection = log.match(/^\s*!\s+\[(?:remote )?rejected\].*$/im)?.[0]?.trim()
  const errorMessage = log.match(/(?:^|\n)((?:error|fatal):[^\n]*)/i)?.[1]?.trim()
  const pushedBranchMatch =
    log.match(/\*\s+\[new branch\]\s+(\S+)\s+->\s+(\S+)/) ||
    log.match(/(?:^|\n)\s*[0-9a-f.]+\.\.[0-9a-f.]+\s+(\S+)\s+->\s+(\S+)/) ||
    log.match(/(?:^|\n)\s*\w+\s+(\S+)\s+->\s+(\S+)/)

  const remoteMatch = log.match(/To\s+(https?:\/\/\S+|git@\S+)/)
  const target = commandPushTarget(context.args)
  const localBranch = pushedBranchMatch?.[1] || target.branch || "Unknown"
  const remoteBranch = pushedBranchMatch?.[2] || target.branch || "Unknown"
  const remote = remoteMatch?.[1] || target.remote || "Unknown"
  const repoUrl = normalizeGithubRepoUrl(remote)
  const fallbackPrUrl =
    repoUrl && remoteBranch !== "Unknown" ? `${repoUrl}/pull/new/${remoteBranch}` : null
  const prUrl = prUrlFromLog || fallbackPrUrl

  if (!context.succeeded) {
    if (!rejection && !errorMessage) return unmatched()
    return parsed([
      bold(red(rejection ? "Git push rejected" : "Git push failed")),
      "",
      `${cyan("Local branch:")} ${localBranch}`,
      `${cyan("Remote branch:")} ${remoteBranch}`,
      `${cyan("Remote:")} ${remote}`,
      `${yellow("Reason:")} ${rejection || errorMessage}`
    ].join("\n"))
  }

  if (!pushedBranchMatch && !prUrlFromLog && !/Everything up-to-date/i.test(log)) {
    return unmatched()
  }

  return parsed([
    bold(green("Git push completed")),
    "",
    `${cyan("Local branch:")} ${localBranch}`,
    `${cyan("Remote branch:")} ${remoteBranch}`,
    `${cyan("Remote:")} ${remote}`,
    prUrl ? `${cyan("Pull request:")} ${blue(prUrl)}` : yellow("Pull request: not suggested")
  ].join("\n"))
}
