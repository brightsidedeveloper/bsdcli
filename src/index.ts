#!/usr/bin/env node

import { program } from 'commander'
import genBrightBase from './commands/genBrightBase'
import createBrightSideApp from './commands/createBrightSideApp'

program.command('genbb').description('Generate types and instantiate tables for BrightBase').action(genBrightBase)

program.command('dsb <name>').description('Create a new Brightside app').action(createBrightSideApp)

program.parse(process.argv)
