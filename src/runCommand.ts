import { spawn } from "child_process"
import { constants } from "os"
import { detectCommand } from "./detectCommand"
import { normalizeLog, NormalizedLog } from "./normalizeLog"
import { parserEngine } from "./parsers"
import { ParserEngine } from "./parsers/engine"
import { ParserContext } from "./parsers/types"
import { renderSummary, RenderOptions } from "./renderSummary"

const MAX_CAPTURE_BYTES = 10 * 1024 * 1024
const DEFAULT_MAX_ITEMS = 5
const DEFAULT_MAX_CHARS = 12_000

export interface RunCommandOptions {
  raw?: boolean
  maxItems?: number
  maxChars?: number
}

export interface LogProcessingServices {
  normalize(log: string): NormalizedLog
  parserEngine: ParserEngine
  render(summary: Parameters<typeof renderSummary>[0], options: RenderOptions): string
}

const defaultServices: LogProcessingServices = {
  normalize: normalizeLog,
  parserEngine,
  render: renderSummary
}

type OutputStream = "stdout" | "stderr"
interface OutputChunk {
  stream: OutputStream
  value: Buffer
}

function signalExitCode(signal: NodeJS.Signals | null) {
  if (!signal) return 1
  return 128 + (constants.signals[signal] || 0)
}

export function runCommand(
  command: string,
  args: string[] = [],
  options: RunCommandOptions = {},
  services: LogProcessingServices = defaultServices
): Promise<void> {
  const commandType = detectCommand([command, ...args])

  return new Promise(resolve => {
    const captureOutput = !options.raw && Boolean(commandType)
    const child = spawn(command, args, {
      shell: false,
      stdio: captureOutput ? ["inherit", "pipe", "pipe"] : "inherit"
    })

    let settled = false
    let rawMode = !captureOutput
    let capturedBytes = 0
    const chunks: OutputChunk[] = []

    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const writeChunk = ({ stream, value }: OutputChunk) => {
      const destination = stream === "stdout" ? process.stdout : process.stderr
      destination.write(value)
    }

    const handleChunk = (stream: OutputStream, value: Buffer) => {
      if (rawMode) {
        writeChunk({ stream, value })
        return
      }

      chunks.push({ stream, value })
      capturedBytes += value.length

      if (capturedBytes > MAX_CAPTURE_BYTES) {
        rawMode = true
        console.error("Output exceeded 10 MiB; switching to raw mode.")
        chunks.forEach(writeChunk)
        chunks.length = 0
      }
    }

    child.stdout?.on("data", (value: Buffer) => handleChunk("stdout", value))
    child.stderr?.on("data", (value: Buffer) => handleChunk("stderr", value))

    child.on("error", error => {
      process.exitCode = 1
      console.error(`Unable to start "${command}": ${error.message}`)
      finish()
    })

    child.on("close", (code, signal) => {
      if (settled) return

      const succeeded = code === 0
      if (!succeeded) process.exitCode = code ?? signalExitCode(signal)

      if (rawMode) {
        finish()
        return
      }

      const original = Buffer.concat(chunks.map(chunk => chunk.value)).toString("utf8")
      const normalized = services.normalize(original)
      const parserContext: ParserContext = {
        command,
        args,
        succeeded,
        cwd: process.cwd()
      }
      const result = services.parserEngine.parse(
        commandType,
        normalized.text,
        parserContext
      )

      if (!result.matched) {
        chunks.forEach(writeChunk)
        finish()
        return
      }

      if (normalized.omittedLines) {
        result.summary.omitted.logs =
          (result.summary.omitted.logs || 0) + normalized.omittedLines
      }

      console.log(services.render(result.summary, {
        maxItems: options.maxItems || DEFAULT_MAX_ITEMS,
        maxChars: options.maxChars || DEFAULT_MAX_CHARS,
        cwd: process.cwd()
      }))
      finish()
    })
  })
}
