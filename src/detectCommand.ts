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
  if (normalized.includes("git pull --rebase")) return "git:rebase"
  if (normalized.includes("git rebase --continue")) return "git:rebase"
  if (normalized.includes("git rebase --abort")) return "git:rebase"
  if (normalized.includes("git rebase --skip")) return "git:rebase"

  if (
    /\bnpm\s+(?:i|install)\b/.test(normalized) ||
    /\bpnpm\s+add\b/.test(normalized) ||
    /\byarn\s+add\b/.test(normalized)
  ) return "npm:install"

  // return "generic"

}
