#!/usr/bin/env node

import { program } from 'commander'
import genBrightBase from './commands/genBrightBase'
import createBrightSideApp from './commands/createBrightSideApp'
import createBrightSideExtension from './commands/createBrightSideExtension'
import createBrightSideNativeApp from './commands/createBrightSideNative'
import createBrightSideServer from './commands/createHonoServer'
import genBrightBaseNative from './commands/genBrightBaseNative'

program.command('genbbn').description('Generate types and instantiate tables for BrightBase').action(genBrightBaseNative)
program.command('genbb').description('Generate types and instantiate tables for BrightBase').action(genBrightBase)
program
  .command('cool')
  .description('Generate types and instantiate tables for BrightBase')
  .action(() => console.log('Cool!'))

program.command('web <name>').description('Create a new BrightSide App').action(createBrightSideApp)
program.command('native <name>').description('Create a new BrightSide App').action(createBrightSideNativeApp)
program.command('serv <name>').description('Create a new BrightSide App').action(createBrightSideServer)
program.command('ext <name>').description('Create a new BrightSide Extension').action(createBrightSideExtension)

program.parse(process.argv)
