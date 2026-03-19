// src/parsers/index.ts

import { parseGitStatus } from "./git/gitStatusParser"
import { parseJest } from "./jest/jestParser"

export const parsers = {
  jest: parseJest,
  "git:status": parseGitStatus
}