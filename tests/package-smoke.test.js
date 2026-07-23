const assert = require("node:assert/strict")
const { execFileSync, spawnSync } = require("node:child_process")
const { existsSync, mkdtempSync, readdirSync, readFileSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")

const projectRoot = path.join(__dirname, "..")
const workspace = mkdtempSync(path.join(tmpdir(), "ai-term-package-"))
const installRoot = path.join(workspace, "install")
const npmCache = process.env.npm_config_cache || path.join(workspace, "npm-cache")
const environment = { ...process.env, npm_config_cache: npmCache }

execFileSync("npm", ["pack", "--silent", "--pack-destination", workspace], {
  cwd: projectRoot,
  env: environment,
  stdio: "inherit"
})

const tarballName = readdirSync(workspace).find(file => file.endsWith(".tgz"))
assert.ok(tarballName, "npm pack should create a tarball")
const tarball = path.join(workspace, tarballName)

execFileSync("npm", ["install", "--ignore-scripts", "--prefix", installRoot, tarball], {
  env: environment,
  stdio: "inherit"
})

const packageRoot = path.join(installRoot, "node_modules", "ai-terminal-optimizer")
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"))
assert.equal(packageJson.bin["ai-term"], "./dist/cli.js")
assert.ok(existsSync(path.join(packageRoot, "dist", "cli.js")), "dist/cli.js should be published")
assert.equal(existsSync(path.join(packageRoot, "src")), false, "TypeScript sources should not be published")
assert.equal(existsSync(path.join(packageRoot, ".github")), false, "workflows should not be published")

const executable = process.platform === "win32"
  ? path.join(installRoot, "node_modules", ".bin", "ai-term.cmd")
  : path.join(installRoot, "node_modules", ".bin", "ai-term")

const versionResult = spawnSync(executable, ["--version"], { encoding: "utf8" })
assert.equal(versionResult.status, 0, versionResult.stderr)
assert.equal(versionResult.stdout.trim(), packageJson.version)

const passthroughResult = spawnSync(executable, [
  process.execPath,
  "-e",
  "process.stdout.write('package smoke passed')"
], { encoding: "utf8" })
assert.equal(passthroughResult.status, 0, passthroughResult.stderr)
assert.equal(passthroughResult.stdout, "package smoke passed")

console.log(`Package smoke test passed: ${tarballName}`)
