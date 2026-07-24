const assert = require("node:assert/strict")
const { chmodSync, mkdtempSync, readFileSync, writeFileSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const test = require("node:test")

const { main, parseCliArguments } = require("../dist/cli")
const { detectCommand } = require("../dist/detectCommand")
const { normalizeLog } = require("../dist/normalizeLog")
const { parseLog } = require("../dist/parsers")
const { RegistryParserEngine } = require("../dist/parsers/engine")
const { renderSummary } = require("../dist/renderSummary")
const { runCommand } = require("../dist/runCommand")

const fixtureRoot = path.join(__dirname, "fixtures")

function fixture(tool) {
  return readFileSync(path.join(fixtureRoot, tool, "failure.log"), "utf8").trim()
}

function context(command, args = [], succeeded = false) {
  return { command, args, succeeded, cwd: "/workspace" }
}

function parse(type, log, parserContext) {
  const normalized = normalizeLog(log)
  const result = parseLog(type, normalized.text, parserContext)
  assert.equal(result.matched, true)
  if (normalized.omittedLines) result.summary.omitted.logs = normalized.omittedLines
  return result.summary
}

function compact(type, tool, command = tool) {
  return renderSummary(parse(type, fixture(tool), context(command)), {
    maxItems: 5,
    maxChars: 12_000,
    cwd: "/workspace"
  })
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

test("normalization strips ANSI, spinner frames, carriage returns, and duplicate lines", () => {
  const result = normalizeLog("\u001b[31merror\u001b[0m\r⠋ loading\r⠙ loading\nsame\nsame\n")
  assert.equal(result.text, "error\nloading\nsame")
  assert.equal(result.omittedLines, 2)
})

test("normalization preserves structural leading whitespace", () => {
  const normalized = normalizeLog(" M .gitignore\nM  staged.ts\n")
  assert.equal(normalized.text, " M .gitignore\nM  staged.ts")

  const output = renderSummary(
    parse("git:status", normalized.text, context("git", ["status", "--short"], true)),
    { maxItems: 5, maxChars: 12_000 }
  )
  assert.match(output, /staged=1 unstaged=1/)
  assert.match(output, /\.gitignore \| unstaged/)
  assert.match(output, /staged\.ts \| staged/)
})

test("Jest failure output has a deterministic compact snapshot", () => {
  assert.equal(compact("jest", "jest"), [
    "jest FAIL tests=10/12 failed=2 suites=2/3 failedSuites=1 time=1.24s",
    "1) ./src/user.test.ts:18:7 | UserService › creates user",
    "   Expected: 201",
    "   Received: 500",
    "   stack: ./src/user.test.ts:18:7",
    "2) ./src/user.test.ts:31:5 | UserService › rejects duplicate email",
    "   Error: duplicate email was accepted",
    "   stack: ./src/user.test.ts:31:5",
    "omitted: frames=1"
  ].join("\n"))
})

test("Vitest failure output preserves metrics, assertion, and project location", () => {
  const output = compact("vitest", "vitest")
  assert.match(output, /^vitest FAIL tests=8\/9 failed=1 files=2\/3 failedFiles=1 time=1\.18s/m)
  assert.match(output, /src\/cart\.test\.ts:14:22/)
  assert.match(output, /Expected: 10/)
  assert.doesNotMatch(output, /node_modules/)
})

test("TypeScript groups diagnostics by code and location", () => {
  assert.equal(compact("typescript", "typescript", "tsc"), [
    "tsc FAIL errors=2 warnings=1",
    "1) src/api/client.ts:12:5 | [TS2322] Type 'string' is not assignable to type 'number'.",
    "2) src/api/client.ts:19:18 | [TS2304] Cannot find name 'payload'.",
    "3) src/config.ts:7:3 | [TS6133] 'legacyValue' is declared but its value is never read."
  ].join("\n"))
})

test("ESLint stylish output preserves rules and locations", () => {
  const output = compact("eslint", "eslint")
  assert.match(output, /^eslint FAIL errors=1 warnings=1 files=1/)
  assert.match(output, /\[@typescript-eslint\/no-unused-vars\]/)
  assert.match(output, /\[no-console\]/)
})

test("ESLint JSON output is supported", () => {
  const log = JSON.stringify([{
    filePath: "/workspace/src/a.ts",
    messages: [{
      ruleId: "no-unused-vars",
      severity: 2,
      message: "'x' is unused.",
      line: 2,
      column: 7
    }]
  }])
  const output = renderSummary(parse("eslint", log, context("eslint")), {
    maxItems: 5, maxChars: 12_000, cwd: "/workspace"
  })
  assert.equal(output, [
    "eslint FAIL errors=1 warnings=0 files=1",
    "1) ./src/a.ts:2:7 | [no-unused-vars] 'x' is unused."
  ].join("\n"))
})

test("Mocha output preserves the failing test and removes internal frames", () => {
  const output = compact("mocha", "mocha")
  assert.match(output, /^mocha FAIL passed=1 failed=1 time=24ms/)
  assert.match(output, /User repository > returns missing user/)
  assert.match(output, /AssertionError: expected undefined to equal null/)
  assert.doesNotMatch(output, /node:internal/)
})

test("Node output preserves code, message, and first project frame", () => {
  const output = compact("node", "node")
  assert.match(output, /^\s*node FAIL errors=1/)
  assert.match(output, /\[ERR_MODULE_NOT_FOUND\]/)
  assert.match(output, /\.\/src\/index\.js:4:1/)
  assert.doesNotMatch(output, /node:internal/)
})

test("package manager errors preserve the factual error code only", () => {
  const output = compact("npm:install", "npm")
  assert.equal(output, [
    "npm FAIL errors=1",
    "1) [ERESOLVE] npm ERR! code ERESOLVE"
  ].join("\n"))
})

test("Playwright and Cypress preserve failed test identity and project frame", () => {
  const playwright = compact("playwright", "playwright")
  const cypress = compact("cypress", "cypress")

  assert.match(playwright, /^playwright FAIL passed=11 failed=1 time=4\.2s/)
  assert.match(playwright, /Authentication › signs in/)
  assert.match(playwright, /\.\/tests\/login\.spec\.ts:18:21/)
  assert.match(cypress, /^cypress FAIL passed=2 failed=1/)
  assert.match(cypress, /Checkout > submits an order/)
  assert.match(cypress, /\.\/cypress\/e2e\/checkout\.cy\.ts:28:12/)
})

test("Vite, Next.js, and webpack builds use compact factual diagnostics", () => {
  const vite = compact("vite", "vite")
  const next = compact("next", "next")
  const webpack = compact("webpack", "webpack")

  assert.match(vite, /^vite FAIL modules=42/)
  assert.match(vite, /src\/main\.ts:8:4/)
  assert.match(vite, /RollupError/)
  assert.match(next, /^next FAIL version=15\.2\.0/)
  assert.match(next, /\.\/src\/page\.tsx:14:9/)
  assert.match(webpack, /^webpack FAIL errors=1 warnings=0 time=1240ms/)
  assert.match(webpack, /\.\/src\/index\.ts:12:4/)
})

test("Docker BuildKit output keeps step metrics and terminal failure", () => {
  const output = compact("docker", "docker")
  assert.equal(output, [
    "docker FAIL steps=3 cached=1",
    "1) process \"/bin/sh -c npm test\" did not complete successfully: exit code: 1"
  ].join("\n"))
})

test("Git merge and fetch operations are summarized without remediation", () => {
  const merge = parse("git:operation", [
    "Auto-merging src/a.ts",
    "CONFLICT (content): Merge conflict in src/a.ts",
    "Automatic merge failed; fix conflicts and then commit the result."
  ].join("\n"), context("git", ["merge", "feature"]))
  const fetch = parse(
    "git:operation",
    "abc..def main -> origin/main",
    context("git", ["fetch"], true)
  )

  assert.equal(renderSummary(merge, { maxItems: 5, maxChars: 12_000 }), [
    "git-merge FAIL conflicts=1",
    "1) src/a.ts | [CONFLICT] merge conflict"
  ].join("\n"))
  assert.equal(renderSummary(fetch, { maxItems: 5, maxChars: 12_000 }), (
    "git-fetch PASS refs=1"
  ))
})

test("recognized successes use one line", () => {
  const jest = parse("jest", [
    "PASS src/a.test.ts",
    "Test Suites: 2 passed, 2 total",
    "Tests: 8 passed, 8 total",
    "Time: 0.8 s"
  ].join("\n"), context("jest", [], true))
  const tsc = parse("typescript", "", context("tsc", [], true))
  const npmTsc = parse(
    "auto",
    "> project@1.0.0 typecheck\n> tsc --noEmit",
    context("npm", ["run", "typecheck"], true)
  )

  assert.equal(renderSummary(jest, { maxItems: 5, maxChars: 12_000 }), (
    "jest PASS tests=8/8 suites=2/2 time=0.8s"
  ))
  assert.equal(renderSummary(tsc, { maxItems: 5, maxChars: 12_000 }), (
    "tsc PASS errors=0"
  ))
  assert.equal(renderSummary(npmTsc, { maxItems: 5, maxChars: 12_000 }), (
    "tsc PASS errors=0"
  ))
})

test("renderer deduplicates diagnostics and enforces item limits", () => {
  const diagnostics = [
    { severity: "error", title: "same", details: [], stack: [] },
    { severity: "error", title: "same", details: [], stack: [] },
    { severity: "error", title: "second", details: [], stack: [] },
    { severity: "error", title: "third", details: [], stack: [] }
  ]
  const output = renderSummary({
    tool: "demo",
    status: "fail",
    metrics: { errors: 4 },
    diagnostics,
    omitted: {}
  }, { maxItems: 2, maxChars: 12_000 })

  assert.match(output, /1\) same/)
  assert.match(output, /2\) second/)
  assert.match(output, /omitted: duplicates=1 diagnostics=1/)
})

test("renderer enforces the character budget and reports truncation", () => {
  const output = renderSummary({
    tool: "demo",
    status: "fail",
    metrics: {},
    diagnostics: [{
      severity: "error",
      title: "x".repeat(2_000),
      details: [],
      stack: []
    }],
    omitted: {}
  }, { maxItems: 5, maxChars: 300 })

  assert.ok(output.length <= 300)
  assert.match(output, /omitted: chars=/)
})

test("large recognized logs are reduced below thirty percent", () => {
  const noisy = `${fixture("jest")}\n${"console noise from passing test\n".repeat(500)}`
  const output = renderSummary(parse("jest", noisy, context("jest")), {
    maxItems: 5, maxChars: 12_000, cwd: "/workspace"
  })
  assert.ok(output.length / noisy.length < 0.3)
})

test("compact output contains no investigative guidance", () => {
  const outputs = [
    compact("jest", "jest"),
    compact("vitest", "vitest"),
    compact("typescript", "typescript", "tsc"),
    compact("eslint", "eslint"),
    compact("mocha", "mocha"),
    compact("node", "node"),
    compact("npm:install", "npm")
  ]
  for (const output of outputs) {
    assert.doesNotMatch(output, /suggested next steps|root cause|try running|recommended fix/i)
  }
})

test("command detection handles direct tools, runners, and package scripts", () => {
  assert.equal(detectCommand(["tsc", "--noEmit"]), "typescript")
  assert.equal(detectCommand(["npx", "vitest", "run"]), "vitest")
  assert.equal(detectCommand(["pnpm", "exec", "eslint", "."]), "eslint")
  assert.equal(detectCommand(["yarn", "exec", "mocha"]), "mocha")
  assert.equal(detectCommand(["npm", "run", "typecheck"]), "auto")
  assert.equal(detectCommand(["npm", "test:e2e"]), "auto")
  assert.equal(detectCommand(["npx", "playwright", "test"]), "playwright")
  assert.equal(detectCommand(["yarn", "cypress", "run"]), "cypress")
  assert.equal(detectCommand(["docker", "build", "."]), "docker")
  assert.equal(detectCommand(["git", "merge", "feature"]), "git:operation")
  assert.equal(detectCommand(["echo", "tsc"]), undefined)
})

test("auto detection selects a parser by log signature", () => {
  const output = renderSummary(parse("auto", fixture("vitest"), context("npm", ["test"])), {
    maxItems: 5, maxChars: 12_000, cwd: "/workspace"
  })
  assert.match(output, /^vitest FAIL/)
})

test("parser engine is open to new registrations without executor changes", () => {
  const engine = new RegistryParserEngine([{
    commandTypes: ["auto"],
    autoDetect: true,
    parser: log => log === "custom"
      ? {
          matched: true,
          summary: {
            tool: "custom",
            status: "info",
            metrics: {},
            diagnostics: [],
            omitted: {}
          }
        }
      : { matched: false }
  }])

  const result = engine.parse("auto", "custom", context("custom", [], true))
  assert.equal(result.matched, true)
  assert.equal(result.summary.tool, "custom")
})

test("unknown auto-detected output is rejected for raw fallback", () => {
  const result = parseLog("auto", "custom script output", context("npm", ["run", "custom"], true))
  assert.equal(result.matched, false)
})

test("CLI options are parsed only before the child command", () => {
  assert.deepEqual(parseCliArguments([
    "--max-items", "10", "--max-chars=20000", "git", "--raw"
  ]), {
    command: "git",
    args: ["--raw"],
    options: { maxItems: 10, maxChars: 20_000 }
  })
  assert.equal(parseCliArguments(["--max-items", "nope", "git"]).error, (
    "--max-items requires a positive integer"
  ))
})

test("the CLI preserves child exit codes and signals", async () => {
  const previousExitCode = process.exitCode
  try {
    await captureConsole(() => runCommand(process.execPath, ["-e", "process.exit(7)"]))
    assert.equal(process.exitCode, 7)
  } finally {
    process.exitCode = previousExitCode
  }

  if (process.platform !== "win32") {
    const signal = runCli([
      process.execPath,
      "-e",
      "process.kill(process.pid, 'SIGTERM')"
    ])
    assert.equal(signal.status, 143)
  }
})

test("the CLI preserves spaces and shell metacharacters", () => {
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

test("--raw bypasses a recognized parser", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ai-term-raw-"))
  const fakeTsc = path.join(directory, "tsc")
  writeFileSync(fakeTsc, "#!/bin/sh\nprintf \"src/a.ts(1,2): error TS1: broken\\n\"\nexit 1\n")
  chmodSync(fakeTsc, 0o755)
  const env = { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` }

  const compactResult = runCli(["tsc"], { env })
  const rawResult = runCli(["--raw", "tsc"], { env })
  assert.match(compactResult.stdout, /^tsc FAIL/)
  assert.equal(rawResult.stdout, "src/a.ts(1,2): error TS1: broken\n")
})

test("--max-items controls the rendered diagnostic count", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ai-term-items-"))
  const fakeTsc = path.join(directory, "tsc")
  writeFileSync(fakeTsc, [
    "#!/bin/sh",
    "printf \"a.ts(1,1): error TS1: one\\nb.ts(2,2): error TS2: two\\n\"",
    "exit 1",
    ""
  ].join("\n"))
  chmodSync(fakeTsc, 0o755)
  const result = runCli(["--max-items", "1", "tsc"], {
    env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` }
  })
  assert.match(result.stdout, /1\) a\.ts:1:1/)
  assert.doesNotMatch(result.stdout, /2\) b\.ts/)
  assert.match(result.stdout, /omitted: diagnostics=1/)
})

test("missing executables and empty CLI invocation fail cleanly", async () => {
  const missing = runCli(["definitely-not-an-installed-command"])
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /Unable to start/)
  assert.doesNotMatch(missing.stderr, /\n\s+at /)

  const previousExitCode = process.exitCode
  try {
    const empty = await captureConsole(() => main([]))
    assert.equal(process.exitCode, 1)
    assert.match(empty.stderr, /Usage: ai-term/)
  } finally {
    process.exitCode = previousExitCode
  }
})

test("CLI exposes help and version", () => {
  const help = runCli(["--help"])
  const version = runCli(["--version"])
  assert.equal(help.status, 0)
  assert.match(help.stdout, /--max-items/)
  assert.equal(version.status, 0)
  assert.match(version.stdout, /^\d+\.\d+\.\d+\s*$/)
})

test("recognized output above 10 MiB switches to raw mode", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ai-term-large-"))
  const fakeTsc = path.join(directory, "tsc")
  writeFileSync(fakeTsc, `#!/usr/bin/env node
process.stdout.write("x".repeat(10 * 1024 * 1024 + 1))
`)
  chmodSync(fakeTsc, 0o755)
  const result = runCli(["tsc"], {
    env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}` },
    maxBuffer: 12 * 1024 * 1024
  })
  assert.equal(result.status, 0)
  assert.match(result.stderr, /switching to raw mode/)
  assert.equal(Buffer.byteLength(result.stdout), 10 * 1024 * 1024 + 1)
})
