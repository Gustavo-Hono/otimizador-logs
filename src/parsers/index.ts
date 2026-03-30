// src/parsers/index.ts

import { parseGitPush } from "./git/gitPushParser"
import { parseGitStatus } from "./git/gitStatusParser"
import { parseJest } from "./jest/jestParser"
import { npmParser } from "./npm/npmParser"

export const parsers = {
  jest: parseJest,
  "git:status": parseGitStatus,
  "git:push": parseGitPush,
  "npm:install": npmParser
}
