import { CommandType } from "../detectCommand"
import { LogParser, ParseResult, ParserContext, unmatched } from "./types"

export interface ParserRegistration {
  commandTypes: readonly CommandType[]
  parser: LogParser
  autoDetect?: boolean
  accepts?: (log: string, context: ParserContext) => boolean
}

export interface ParserEngine {
  parse(
    commandType: CommandType | undefined,
    log: string,
    context: ParserContext
  ): ParseResult
}

export class RegistryParserEngine implements ParserEngine {
  constructor(private readonly registrations: readonly ParserRegistration[]) {}

  parse(
    commandType: CommandType | undefined,
    log: string,
    context: ParserContext
  ): ParseResult {
    if (!commandType) return unmatched()

    const candidates = this.registrations.filter(registration => (
      commandType === "auto"
        ? registration.autoDetect
        : registration.commandTypes.includes(commandType)
    ))

    for (const registration of candidates) {
      if (registration.accepts && !registration.accepts(log, context)) continue
      const result = registration.parser(log, context)
      if (result.matched) return result
    }
    return unmatched()
  }
}
