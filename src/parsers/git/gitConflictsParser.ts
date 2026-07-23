import { bold, cyan, red, yellow } from "kleur/colors"
import { LogParser, parsed } from "../types"

export const parseGitConflicts: LogParser = (log, context) => {
  const rejectedMatch =
    log.match(/\[rejected\]\s+(\S+)\s+->\s+(\S+)/) ||
    log.match(/failed to push some refs to\s+['"]?([^'"\n]+)['"]?/i)

  const positional = context.args.slice(1).filter(arg => !arg.startsWith("-"))
  const branchFromCommand = positional[1]?.split(":").pop()

  const localBranch = branchFromCommand || (rejectedMatch ? rejectedMatch[1] : "Unknown")
  const remoteBranch = rejectedMatch?.[2] || localBranch
  const remote = log.match(/failed to push some refs to\s+['"]?([^'"\n]+)['"]?/i)?.[1] || "Unknown"

  return parsed([
    bold(red("Git push rejected: local branch is behind")),
    "",
    `${cyan("Local branch:")} ${localBranch}`,
    `${cyan("Remote branch:")} ${remoteBranch}`,
    `${cyan("Remote:")} ${remote}`,
    "",
    yellow("Reason: the remote contains commits that are not available locally."),
    "",
    cyan("Suggested next steps:"),
    "1. git pull --rebase",
    "2. Resolve conflicts (if any) and run git add <files>",
    "3. git rebase --continue",
    "4. git push"
  ].join("\n"))
}
