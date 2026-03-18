export function detectCommand(command: string) {

  if (command.includes("npm test")) return "jest"

  if (command.includes("npm install")) return "npm"

  if (command.includes("git")) return "git"

  return "generic"

}