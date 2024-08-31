#!/usr/bin/env node

import { program } from 'commander'
import genBrightBase from './commands/genBrightBase'
import createBrightSideApp from './commands/createBrightSideApp'
import createBrightSideExtension from './commands/createBrightSideExtension'

program.command('genbb').description('Generate types and instantiate tables for BrightBase').action(genBrightBase)

program.command('dsb <name>').description('Create a new BrightSide App').action(createBrightSideApp)
program.command('ext <name>').description('Create a new BrightSide Extension').action(createBrightSideExtension)

program.parse(process.argv)
