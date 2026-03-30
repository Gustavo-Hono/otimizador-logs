// src/parsers/index.ts

import { parseGitPush } from "./git/gitPushParser"
import { parseGitStatus } from "./git/gitStatusParser"
import { parseGitConflicts } from "./git/gitConflictsParser"
import { parseGitRebase } from "./git/gitRebaseParser"
import { parseJest } from "./jest/jestParser"
import { npmParser } from "./npm/npmParser"

export const parsers = {
  jest: parseJest,
  "git:status": parseGitStatus,
  "git:push": parseGitPush,
  "git:push:conflict": parseGitConflicts,
  "git:rebase": parseGitRebase,
  "npm:install": npmParser
}
