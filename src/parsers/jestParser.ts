export function parseJest(log: string) {

  const passed = log.match(/PASS/g)?.length || 0
  const failed = log.match(/FAIL/g)?.length || 0

  return `
tests passed: ${passed}
tests failed: ${failed}
`
}