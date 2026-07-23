export type CommandType =
  | "jest"
  | "test"
  | "git:status"
  | "git:push"
  | "git:rebase"
  | "npm:install"

export function detectCommand(command: string | readonly string[]): CommandType | undefined {
  const tokens = typeof command === "string"
    ? command.trim().split(/\s+/).filter(Boolean)
    : [...command]

  const executable = tokens[0]?.split(/[\\/]/).pop()?.toLowerCase()
  const subcommand = tokens[1]?.toLowerCase()
  const remainingArgs = tokens.slice(2).map(token => token.toLowerCase())

  if (executable === "git" && subcommand === "status") return "git:status"
  if (executable === "git" && subcommand === "push") return "git:push"

  if (executable === "git" && subcommand === "pull" && remainingArgs.includes("--rebase")) {
    return "git:rebase"
  }
  if (executable === "git" && subcommand === "rebase") return "git:rebase"

  if (executable === "jest") return "jest"
  if (executable === "npx" && subcommand === "jest") return "jest"

  if (
    (executable === "npm" || executable === "yarn" || executable === "pnpm") &&
    (subcommand === "test" || (subcommand === "run" && remainingArgs[0] === "test"))
  ) return "test"

  if (
    (executable === "npm" && (subcommand === "i" || subcommand === "install")) ||
    ((executable === "pnpm" || executable === "yarn") && (
      subcommand === "add" || subcommand === "install"
    ))
  ) return "npm:install"
}
