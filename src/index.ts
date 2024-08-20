#!/usr/bin/env node

import { program } from 'commander'
import genBrightBase from './commands/genBrightBase'
import createBrightSideApp from './commands/createBrightSideApp'

program.command('gen-brightbase').description('Generate types and instantiate tables for BrightBase').action(genBrightBase)

program.command('create-brightside-app <name>').description('Create a new Brightside app').action(createBrightSideApp)

program.parse(process.argv)
