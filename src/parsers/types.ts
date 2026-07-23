export interface ParserContext {
  command: string
  args: readonly string[]
  succeeded: boolean
}

export type ParseResult =
  | { matched: true; output: string }
  | { matched: false }

export type LogParser = (log: string, context: ParserContext) => ParseResult

export const parsed = (output: string): ParseResult => ({ matched: true, output })
export const unmatched = (): ParseResult => ({ matched: false })
