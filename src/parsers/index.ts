// src/parsers/index.ts

import { parseJest } from "./jestParser"
import { parseGitStatus } from "./git/gitStatusParser"

export const parsers = {
  jest: parseJest,
  git: parseGitStatus
}