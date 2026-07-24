import { CommandType } from "../detectCommand"
import { parseNext } from "./build/nextParser"
import { parseVite } from "./build/viteParser"
import { parseWebpack } from "./build/webpackParser"
import { parseCypress } from "./cypress/cypressParser"
import { parseDocker } from "./docker/dockerParser"
import { parseEslint } from "./eslint/eslintParser"
import { RegistryParserEngine } from "./engine"
import { parseGitConflicts } from "./git/gitConflictsParser"
import { parseGitOperation } from "./git/gitOperationParser"
import { parseGitPush } from "./git/gitPushParser"
import { parseGitRebase } from "./git/gitRebaseParser"
import { parseGitStatus } from "./git/gitStatusParser"
import { parseJest } from "./jest/jestParser"
import { parseMocha } from "./mocha/mochaParser"
import { parseNode } from "./node/nodeParser"
import { npmParser } from "./npm/npmParser"
import { parsePlaywright } from "./playwright/playwrightParser"
import { parseTypeScript } from "./typescript/typescriptParser"
import { ParserContext } from "./types"
import { parseVitest } from "./vitest/vitestParser"

export const parserEngine = new RegistryParserEngine([
  {
    commandTypes: ["git:push"],
    parser: parseGitConflicts,
    accepts: log => (
      /(non-fast-forward|\[rejected\]|fetch first|failed to push some refs)/i.test(log)
    )
  },
  { commandTypes: ["git:push"], parser: parseGitPush },
  { commandTypes: ["git:status"], parser: parseGitStatus },
  { commandTypes: ["git:rebase"], parser: parseGitRebase },
  { commandTypes: ["git:operation"], parser: parseGitOperation },
  { commandTypes: ["playwright"], parser: parsePlaywright, autoDetect: true },
  { commandTypes: ["cypress"], parser: parseCypress, autoDetect: true },
  { commandTypes: ["vitest"], parser: parseVitest, autoDetect: true },
  { commandTypes: ["jest"], parser: parseJest, autoDetect: true },
  { commandTypes: ["mocha"], parser: parseMocha, autoDetect: true },
  { commandTypes: ["typescript"], parser: parseTypeScript, autoDetect: true },
  { commandTypes: ["eslint"], parser: parseEslint, autoDetect: true },
  { commandTypes: ["vite"], parser: parseVite, autoDetect: true },
  { commandTypes: ["next"], parser: parseNext, autoDetect: true },
  { commandTypes: ["webpack"], parser: parseWebpack, autoDetect: true },
  { commandTypes: ["docker"], parser: parseDocker, autoDetect: true },
  { commandTypes: ["node"], parser: parseNode, autoDetect: true },
  { commandTypes: ["npm:install"], parser: npmParser, autoDetect: true }
])

export function parseLog(
  commandType: CommandType | undefined,
  log: string,
  context: ParserContext
) {
  return parserEngine.parse(commandType, log, context)
}
