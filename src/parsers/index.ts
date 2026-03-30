// src/parsers/index.ts

import { parseGitPush } from "./git/gitPushParser"
import { parseGitStatus } from "./git/gitStatusParser"
import { parseGitConflicts } from "./git/gitConflictsParser"
import { parseJest } from "./jest/jestParser"
import { npmParser } from "./npm/npmParser"

export const parsers = {
  jest: parseJest,
  "git:status": parseGitStatus,
  "git:push": parseGitPush,
  "git:push:conflict": parseGitConflicts,
  "npm:install": npmParser
}
