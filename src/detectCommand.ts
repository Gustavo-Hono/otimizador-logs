export type CommandType =
  | "auto"
  | "eslint"
  | "cypress"
  | "docker"
  | "jest"
  | "mocha"
  | "next"
  | "node"
  | "playwright"
  | "typescript"
  | "vite"
  | "vitest"
  | "webpack"
  | "git:operation"
  | "git:status"
  | "git:push"
  | "git:rebase"
  | "npm:install"

const toolTypes: Record<string, CommandType> = {
  cypress: "cypress",
  eslint: "eslint",
  jest: "jest",
  mocha: "mocha",
  next: "next",
  node: "node",
  playwright: "playwright",
  tsc: "typescript",
  vite: "vite",
  webpack: "webpack",
  vitest: "vitest"
}

function executableName(token: string | undefined) {
  return token?.split(/[\\/]/).pop()?.replace(/\.(?:cmd|exe)$/i, "").toLowerCase()
}

export function detectCommand(command: string | readonly string[]): CommandType | undefined {
  const tokens = typeof command === "string"
    ? command.trim().split(/\s+/).filter(Boolean)
    : [...command]

  const executable = executableName(tokens[0])
  const subcommand = executableName(tokens[1])
  const remainingArgs = tokens.slice(2).map(token => token.toLowerCase())

  if (executable === "git" && subcommand === "status") return "git:status"
  if (executable === "git" && subcommand === "push") return "git:push"
  if (executable === "git" && subcommand === "pull" && remainingArgs.includes("--rebase")) {
    return "git:rebase"
  }
  if (executable === "git" && subcommand === "rebase") return "git:rebase"
  if (
    executable === "git" &&
    subcommand &&
    ["merge", "checkout", "switch", "clone", "fetch"].includes(subcommand)
  ) return "git:operation"

  if (
    (executable === "docker" || executable === "docker-compose") &&
    ["build", "buildx", "compose"].includes(subcommand || "")
  ) return "docker"

  if (executable && toolTypes[executable]) return toolTypes[executable]

  if (executable === "npx" || executable === "npm") {
    if (subcommand === "exec") return toolTypes[executableName(tokens[2]) || ""] || "auto"
    if (executable === "npx") return toolTypes[subcommand || ""] || "auto"
  }

  if (executable === "pnpm" || executable === "yarn") {
    if (subcommand === "exec" || subcommand === "dlx") {
      return toolTypes[executableName(tokens[2]) || ""] || "auto"
    }
    if (subcommand && toolTypes[subcommand]) return toolTypes[subcommand]
  }

  if (
    (executable === "npm" && (subcommand === "i" || subcommand === "install")) ||
    ((executable === "pnpm" || executable === "yarn") && (
      subcommand === "add" || subcommand === "install"
    ))
  ) return "npm:install"

  if (
    executable === "npm" || executable === "pnpm" || executable === "yarn"
  ) {
    if (subcommand === "run" || subcommand === "test" || subcommand?.startsWith("test:")) {
      return "auto"
    }
  }

  return undefined
}
