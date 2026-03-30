export function detectCommand(command: string) {
  const normalized = command.trim().toLowerCase()

  if (
    normalized.includes("jest") ||
    normalized.includes("npm test") ||
    normalized.includes("yarn test") ||
    normalized.includes("pnpm test")
  ) return "jest"

  if (normalized.includes("git status")) return "git:status"
  if (normalized.includes("git push")) return "git:push"

  if (
    /\bnpm\s+(?:i|install)\b/.test(normalized) ||
    /\bpnpm\s+add\b/.test(normalized) ||
    /\byarn\s+add\b/.test(normalized)
  ) return "npm:install"

  // return "generic"

}
