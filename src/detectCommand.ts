export function detectCommand(command: string) {

  if (
    command.includes("jest") ||
    command.includes("npm test") ||
    command.includes("yarn test") ||
    command.includes("pnpm test")
  ) return "jest"

  // if (command.includes("npm install")) return "npm"

  if (command.includes("git status")) return "git:status"

  // return "generic"

}
