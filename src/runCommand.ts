import { spawn } from "child_process"
import { constants } from "os"
import { detectCommand } from "./detectCommand"
import { parsers } from "./parsers"

const MAX_CAPTURE_BYTES = 10 * 1024 * 1024

type OutputStream = "stdout" | "stderr"
interface OutputChunk {
  stream: OutputStream
  value: Buffer
}

function signalExitCode(signal: NodeJS.Signals | null) {
  if (!signal) return 1
  return 128 + (constants.signals[signal] || 0)
}

export function runCommand(command: string, args: string[] = []): Promise<void> {
  const commandArgs = [command, ...args]
  const commandType = detectCommand(commandArgs)

  return new Promise(resolve => {
    const captureOutput = Boolean(commandType)
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

      const fullOutput = Buffer.concat(chunks.map(chunk => chunk.value)).toString("utf8")
      let parserKey: string | undefined = commandType

      if (commandType === "test") {
        parserKey = /\b(?:Test Suites|Tests):\s*[^\r\n]+/i.test(fullOutput) ? "jest" : undefined
      } else if (
        commandType === "git:push" &&
        /(non-fast-forward|\[rejected\]|fetch first|tip of your current branch is behind|failed to push some refs)/i.test(fullOutput)
      ) {
        parserKey = "git:push:conflict"
      }

      const parser = parserKey ? parsers[parserKey] : undefined
      const result = parser?.(fullOutput, { command, args, succeeded })

      if (!result?.matched) {
        chunks.forEach(writeChunk)
        finish()
        return
      }

      console.log("\nOptimized logs:")
      console.log(result.output)
      finish()
    })
  })
}
