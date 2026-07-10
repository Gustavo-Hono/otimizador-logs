const assert = require("node:assert/strict")
const test = require("node:test")

const { main } = require("../dist/cli")
const { parseGitPush } = require("../dist/parsers/git/gitPushParser")
const { parseGitStatus } = require("../dist/parsers/git/gitStatusParser")
const { parseJest } = require("../dist/parsers/jest/jestParser")
const { detectCommand } = require("../dist/detectCommand")
const { runCommand } = require("../dist/runCommand")

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

test("a CLI preserva o exit code do comando executado", async () => {
  const previousExitCode = process.exitCode

  try {
    await captureConsole(() => runCommand("sh", ["-c", "exit 7"]))
    assert.equal(process.exitCode, 7)
  } finally {
    process.exitCode = previousExitCode
  }
})

test("git push rejeitado não é apresentado como concluído", () => {
  const output = parseGitPush(
    "To git@github.com:example/project.git\n ! [rejected] main -> main (fetch first)\nerror: failed to push some refs",
    "git push origin main",
    false
  )

  assert.match(output, /Git push rejeitado/)
  assert.match(output, /\[rejected\] main -> main/)
  assert.doesNotMatch(output, /Git push concluído/)
})

test("Jest usa as contagens de testes do resumo, não as de suítes", () => {
  const output = parseJest(`
FAIL src/one.test.ts
PASS src/two.test.ts
Tests:       1 failed, 4 passed, 5 total
Time:        1.2 s
● should work

  Expected true
  at test (/tmp/one.test.ts:2:3)
`)

  assert.match(output, /tests passed: 4/i)
  assert.match(output, /tests failed: 1/i)
  assert.match(output, /total tests: 5/i)
})

test("Jest considera zero falhas quando o campo é omitido do resumo", () => {
  const output = parseJest("PASS src/example.test.ts\nTests: 4 passed, 4 total\nTime: 0.5 s")

  assert.match(output, /tests passed: 4/i)
  assert.match(output, /tests failed: 0/i)
  assert.match(output, /total tests: 4/i)
})

test("git status separa staged, unstaged, untracked e conflitos", () => {
  const output = parseGitStatus(`
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
`)

  assert.match(output, /Staged \(2\):[\s\S]*new file: staged\.ts[\s\S]*renamed: old\.ts -> new\.ts/)
  assert.match(output, /Unstaged \(1\):[\s\S]*modified: changed\.ts/)
  assert.match(output, /Untracked \(1\):[\s\S]*untracked\.ts/)
  assert.match(output, /Conflicts \(1\):[\s\S]*both modified: conflict\.ts/)
})

test("detecção usa comando e subcomando exatos", () => {
  assert.equal(detectCommand(["git", "status", "--short"]), "git:status")
  assert.equal(detectCommand(["git", "pull", "--rebase"]), "git:rebase")
  assert.equal(detectCommand(["git", "rebase", "--continue"]), "git:rebase")
  assert.equal(detectCommand(["npm", "install", "kleur"]), "npm:install")
  assert.equal(detectCommand(["npm", "test:e2e"]), undefined)
  assert.equal(detectCommand(["echo", "git", "status"]), undefined)
  assert.equal(detectCommand(["echo", "npm", "install"]), undefined)
})

test("git push concluído sugere o link de pull request", () => {
  const output = parseGitPush(
    "To git@github.com:example/project.git\n * [new branch] feature -> feature",
    "git push origin feature",
    true
  )

  assert.match(output, /Git push concluído/)
  assert.match(output, /https:\/\/github\.com\/example\/project\/pull\/new\/feature/)
})

test("a CLI preserva argumentos com espaços e caracteres de código", async () => {
  const result = await captureConsole(() => (
    runCommand("printf", ["%s\\n", "valor com espaços; $(não executar)"])
  ))

  assert.match(result.stdout, /valor com espaços; \$\(não executar\)/)
})

test("a CLI sem comando exibe o uso e termina com falha", async () => {
  const previousExitCode = process.exitCode

  try {
    const result = await captureConsole(() => main([]))
    assert.equal(process.exitCode, 1)
    assert.match(result.stderr, /Uso: ai-term/)
    assert.doesNotMatch(result.stderr, /TypeError/)
  } finally {
    process.exitCode = previousExitCode
  }
})
