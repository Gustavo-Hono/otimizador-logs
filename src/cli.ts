#!/usr/bin/env node

import { runCommand } from "./runCommand"

const command = process.argv.slice(2).join(" ")

runCommand(command)