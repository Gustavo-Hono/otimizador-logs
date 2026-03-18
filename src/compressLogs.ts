export function compressLogs(log: string) {

  const passed = log.match(/PASS/g)?.length || 0
  const failed = log.match(/FAIL/g)?.length || 0

  const testMatch = log.match(/Tests:\s+(\d+)/)

  return `
Tests passed: ${passed}
Tests failed: ${failed}
`
}