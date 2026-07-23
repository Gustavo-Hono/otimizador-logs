const assert = require("node:assert/strict")
const { mkdtempSync, writeFileSync, chmodSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const test = require("node:test")

const { main } = require("../dist/cli")
const { parseGitPush } = require("../dist/parsers/git/gitPushParser")
const { parseGitStatus } = require("../dist/parsers/git/gitStatusParser")
const { parseJest } = require("../dist/parsers/jest/jestParser")
const { npmParser } = require("../dist/parsers/npm/npmParser")
const { detectCommand } = require("../dist/detectCommand")
const { runCommand } = require("../dist/runCommand")

function parse(parser, log, command, args, succeeded = true) {
  const result = parser(log, { command, args, succeeded })
  assert.equal(result.matched, true)
  return result.output
}

async function captureConsole(callback) {
  const logs = []
  const errors = []
  const originalLog = console.log
  const originalError = console.error

  console.log = (...values) => { logs.push(values.join(" ")) }
  console.error = (...values) => { errors.push(values.join(" ")) }

  try {
    await callback()
  } finally {
    console.log = originalLog
    console.error = originalError
  }

  return { stdout: logs.join("\n"), stderr: errors.join("\n") }
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [path.join(__dirname, "../dist/cli.js"), ...args], {
    encoding: "utf8",
    ...options
  })
}

test("the CLI preserves a child process exit code", async () => {
  const previousExitCode = process.exitCode

  try {
    await captureConsole(() => runCommand(process.execPath, ["-e", "process.exit(7)"]))
    assert.equal(process.exitCode, 7)
  } finally {
    process.exitCode = previousExitCode
  }
})

test("a rejected git push is not reported as completed", () => {
  const output = parse(
    parseGitPush,
    "To git@github.com:example/project.git\n ! [rejected] main -> main (fetch first)\nerror: failed to push some refs",
    "git",
    ["push", "origin", "main"],
    false
  )

  assert.match(output, /Git push rejected/)
  assert.match(output, /\[rejected\] main -> main/)
  assert.doesNotMatch(output, /Git push completed/)
})

test("Jest reads test counts instead of suite counts", () => {
  const output = parse(parseJest, `
FAIL src/one.test.ts
PASS src/two.test.ts
Tests:       1 failed, 4 passed, 5 total
Time:        1.2 s
● should work

  Expected true
  at test (/tmp/one.test.ts:2:3)
`, "jest", [])

  assert.match(output, /tests passed: 4/i)
  assert.match(output, /tests failed: 1/i)
  assert.match(output, /total tests: 5/i)
})

test("Jest treats an omitted failed count as zero", () => {
  const output = parse(
    parseJest,
    "PASS src/example.test.ts\nTests: 4 passed, 4 total\nTime: 0.5 s",
    "jest",
    []
  )

  assert.match(output, /tests passed: 4/i)
  assert.match(output, /tests failed: 0/i)
  assert.match(output, /total tests: 4/i)
})

test("Jest rejects output without a Jest summary", () => {
  const result = parseJest("custom test script passed", {
    command: "npm",
    args: ["test"],
    succeeded: true
  })

  assert.equal(result.matched, false)
})

test("git status separates staged, unstaged, untracked, and conflicts", () => {
  const output = parse(parseGitStatus, `
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   staged.ts
        renamed:    old.ts -> new.ts

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   changed.ts

Unmerged paths:
  (use "git add/rm <file>..." as appropriate to mark resolution)
        both modified: conflict.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        untracked.ts
`, "git", ["status"])

  assert.match(output, /Staged \(2\):[\s\S]*new file: staged\.ts[\s\S]*renamed: old\.ts -> new\.ts/)
  assert.match(output, /Unstaged \(1\):[\s\S]*modified: changed\.ts/)
  assert.match(output, /Untracked \(1\):[\s\S]*untracked\.ts/)
  assert.match(output, /Conflicts \(1\):[\s\S]*both modified: conflict\.ts/)
})

test("git status parses short output", () => {
  const output = parse(
    parseGitStatus,
    "M  staged.ts\n M changed.ts\n?? new.ts\nUU conflict.ts\n",
    "git",
    ["status", "--short"]
  )

  assert.match(output, /Staged \(1\):[\s\S]*staged\.ts/)
  assert.match(output, /Unstaged \(1\):[\s\S]*changed\.ts/)
  assert.match(output, /Untracked \(1\):[\s\S]*new\.ts/)
  assert.match(output, /Conflicts \(1\):[\s\S]*conflict\.ts/)
})

test("git status recognizes a clean working tree in Portuguese", () => {
  const output = parse(
    parseGitStatus,
    "No ramo main\nnada a submeter, árvore de trabalho limpa\n",
    "git",
    ["status"]
  )

  assert.match(output, /Working tree clean/)
})

test("command detection uses exact executables and subcommands", () => {
  assert.equal(detectCommand(["git", "status", "--short"]), "git:status")
  assert.equal(detectCommand(["git", "pull", "--rebase"]), "git:rebase")
  assert.equal(detectCommand(["git", "rebase", "main"]), "git:rebase")
  assert.equal(detectCommand(["npm", "install", "kleur"]), "npm:install")
  assert.equal(detectCommand(["pnpm", "install"]), "npm:install")
  assert.equal(detectCommand(["yarn", "install"]), "npm:install")
  assert.equal(detectCommand(["npm", "test"]), "test")
  assert.equal(detectCommand(["npm", "test:e2e"]), undefined)
  assert.equal(detectCommand(["echo", "git", "status"]), undefined)
})

test("a completed push with flags suggests a pull request URL", () => {
  const output = parse(
    parseGitPush,
    "To git@github.com:example/project.git\n * [new branch] feature -> feature",
    "git",
    ["push", "--set-upstream", "origin", "feature"]
  )

  assert.match(output, /Git push completed/)
  assert.match(output, /Local branch: feature/)
  assert.match(output, /https:\/\/github\.com\/example\/project\/pull\/new\/feature/)
})

test("package manager install output is summarized only when recognized", () => {
  const output = parse(
    npmParser,
    "added 1 package, and audited 2 packages in 1s\nfound 0 vulnerabilities",
    "npm",
    ["install", "kleur"]
  )
  assert.match(output, /Installation completed/)
  assert.match(output, /Requested packages: kleur/)

  const unknown = npmParser("custom installer finished", {
    command: "npm",
    args: ["install"],
    succeeded: true
  })
  assert.equal(unknown.matched, false)
})

test("yarn and pnpm install formats are recognized", () => {
  const yarnOutput = parse(
    npmParser,
    "success Saved 1 new dependency.\nDone in 0.42s.",
    "yarn",
    ["add", "kleur"]
  )
  const pnpmOutput = parse(
    npmParser,
    "Packages: +2\nDone in 1.1s",
    "pnpm",
    ["add", "kleur"]
  )

  assert.match(yarnOutput, /Packages added: 1/)
  assert.match(pnpmOutput, /Packages added: 2/)
})

test("the CLI preserves spaces and shell metacharacters in arguments", () => {
  const value = "value with spaces; $(do not execute)"
  const result = runCli([
    process.execPath,
    "-e",
    "process.stdout.write(process.argv[1])",
    value
  ])

  assert.equal(result.status, 0)
  assert.equal(result.stdout, value)
})

test("the CLI reports a missing executable without an internal stack", () => {
  const result = runCli(["definitely-not-an-installed-command"])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Unable to start/)
  assert.doesNotMatch(result.stderr, /\n\s+at /)
})

test("the CLI maps child signals to conventional exit codes", {
  skip: process.platform === "win32"
}, () => {
  const result = runCli([
    process.execPath,
    "-e",
    "process.kill(process.pid, 'SIGTERM')"
  ])

  assert.equal(result.status, 143)
})

test("the CLI without a command prints usage and fails", async () => {
  const previousExitCode = process.exitCode

  try {
    const result = await captureConsole(() => main([]))
    assert.equal(process.exitCode, 1)
    assert.match(result.stderr, /Usage: ai-term/)
  } finally {
    process.exitCode = previousExitCode
  }
})

test("the CLI exposes help and version", () => {
  const help = runCli(["--help"])
  const version = runCli(["--version"])

  assert.equal(help.status, 0)
  assert.match(help.stdout, /AI Terminal Optimizer/)
  assert.equal(version.status, 0)
  assert.match(version.stdout, /^\d+\.\d+\.\d+\s*$/)
})

test("large recognized output switches to raw mode", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ai-term-large-"))
  const fakeGit = path.join(directory, "git")
  writeFileSync(fakeGit, `#!/usr/bin/env node
process.stdout.write("x".repeat(10 * 1024 * 1024 + 1))
`)
  chmodSync(fakeGit, 0o755)

  const result = runCli(["git", "status"], {
    env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` },
    maxBuffer: 12 * 1024 * 1024
  })

  assert.equal(result.status, 0)
  assert.match(result.stderr, /switching to raw mode/)
  assert.equal(Buffer.byteLength(result.stdout), 10 * 1024 * 1024 + 1)
})
