#!/usr/bin/env node

const { program } = require('commander')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const prompts = require('prompts')
const signale = require('signale')

// Custom logger for a cool banner
function displayBanner() {
  signale.star('Welcome to BrightSide!')
  signale.info("Let's create something amazing! 🚀")
}

program
  .command('gen-brightbase')
  .description('Generate types and instantiate tables for BrightBase')
  .action(() => {
    displayBanner()

    const dbTypesFilePath = path.join(process.cwd(), 'src/types', 'database.types.ts')
    const brightTypesFilePath = path.join(process.cwd(), 'src/types', 'bright.types.ts')
    const outputFilePath = path.join(process.cwd(), 'src/api', 'Tables.ts')

    fs.writeFile(
      brightTypesFilePath,
      `export type { Tables as BrightTable } from './database.types.ts'\n\nexport interface RealtimeEvents {\n  [event: string]: { [key: string]: unknown }\n}\n\nexport type EventCallback<K extends RealtimeEvents, T extends keyof K> = (payload: K[T]) => void`,
      (err) => {
        if (err) {
          signale.error('Error writing file:', err)
          process.exit(1)
        }
      }
    )

    fs.readFile(dbTypesFilePath, 'utf8', (err, data) => {
      if (err) {
        signale.error('Error reading types file:', err)
        process.exit(1)
      }

      const tableNames = extractTableDetails(data)
      const fileContent = generateTablesContent(tableNames)

      fs.writeFile(outputFilePath, fileContent, (err) => {
        if (err) {
          signale.error('Error writing file:', err)
          process.exit(1)
        }
        signale.success('Tables successfully generated!')
      })
    })
  })

program
  .command('create-brightside-app <name>')
  .description('Create a new Brightside app')
  .action(async (name) => {
    displayBanner()

    const currentDir = process.cwd()
    let targetDir = currentDir

    // If the name is not '.', then create or use a new directory with that name
    if (name !== '.') {
      targetDir = path.join(currentDir, name)
      if (fs.existsSync(targetDir)) {
        signale.error(`Error: Directory '${name}' already exists. Please choose a different name or remove the existing directory.`)
        process.exit(1)
      } else {
        fs.mkdirSync(targetDir)
      }
    } else if (fs.readdirSync(currentDir).length !== 0) {
      signale.error(`Error: The current directory is not empty. Please specify a different project name or use an empty directory.`)
      process.exit(1)
    }

    const answers = await prompts([
      { type: 'text', name: 'supabaseRefId', message: 'Enter your Supabase Reference ID:' },
      { type: 'text', name: 'supabaseUrl', message: 'Enter your Supabase URL:' },
      { type: 'text', name: 'supabaseAnonKey', message: 'Enter your Supabase Anon Key:' },
    ])

    const repoUrl = 'https://github.com/brightsidedeveloper/create-brightside-app.git'
    const cloneCommand = `git clone ${repoUrl} ${targetDir}`

    signale.pending(`What's up, ${name === '.' ? 'in the current directory' : name}! Let's create your new Brightside app! 🚀`)
    exec(cloneCommand, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        signale.error(`Error cloning repository: ${error.message}`)
        return
      }

      // Remove the .git directory
      signale.start('Setting up your project...')
      const gitDir = path.join(targetDir, '.git')
      fs.rmSync(gitDir, { recursive: true })
      signale.success('Cleaned up the repository')

      signale.start('Customizing your project...')

      // Update package.json
      const packageJsonPath = path.join(targetDir, 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      packageJson.name = name === '.' ? path.basename(currentDir) : name
      packageJson.scripts.gen = packageJson.scripts.gen.replace('$SUPABASE_REFERENCE_ID', answers.supabaseRefId.trim())

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
      signale.success('Updated package.json')

      // Create .env file
      const envContent = `VITE_SUPABASE_URL=${answers.supabaseUrl.trim()}\nVITE_SUPABASE_ANON_KEY=${answers.supabaseAnonKey.trim()}\n`
      const envFilePath = path.join(targetDir, '.env')
      fs.writeFileSync(envFilePath, envContent)
      signale.success('Created .env file')

      // Install dependencies and start the dev server
      signale.start('Installing dependencies...')
      exec(`cd ${targetDir} && npm install`, { shell: true }, (error, stdout, stderr) => {
        if (error) {
          signale.error(`Error installing dependencies: ${error.message}`)
          return
        }

        signale.success('Dependencies installed successfully!')

        signale.start('Generating with Supabase...')
        exec(`cd ${targetDir} && npm run gen`, { shell: true }, (error, stdout, stderr) => {
          if (error) {
            signale.error(`Error starting development server: ${error.message}`)
            return
          }

          signale.success('Done! Run "npm run dev" to start the development server.')
          exec(`code ${targetDir}`, { shell: true })
        })
      })
    })
  })

program.parse(process.argv)

/* Helper Functions */

/**
 * Extracts the table names and their corresponding Row types from the database.types.ts file content.
 * @param {string} data - The content of the database.types.ts file.
 * @returns {Array<{ tableName: string, typeName: string }>} An array of table details with tableName and typeName.
 */
function extractTableDetails(data) {
  const tableDetails = []
  const regex = /(\w+):\s*{\s*Row:\s*{[^}]*}/g
  let match

  while ((match = regex.exec(data)) !== null) {
    const tableName = match[1]
    const typeName = capitalizeAndCamelCase(tableName)
    tableDetails.push({ tableName, typeName })
  }

  return tableDetails
}

/**
 * Generates the content for the Tables.ts file.
 * @param {Array<{ tableName: string, typeName: string }>} tableDetails - An array of table details with tableName and typeName.
 * @returns {string} The content to be written to the Tables.ts file.
 */
function generateTablesContent(tableDetails) {
  const imports = `import { BrightBaseCRUD } from 'brightside-developer'\nimport { BrightTable } from '../types/bright.types'\n\n`

  const typeDefinitions = tableDetails
    .map(({ tableName, typeName }) => {
      return `
export type ${typeName} = BrightTable<'${tableName}'>
export interface ${typeName}CreateOptions {
  OmitOnCreate: 'id' | 'created_at' // Add or Remove fields that are omitted on create
  OptionalOnCreate: never // Add fields that are optional on create
}
export type ${typeName}ReadOptions = Parameters<typeof Tables.${tableName}.read>

export type ${typeName}InfiniteReadOptions = [
  Parameters<typeof Tables.${tableName}.read>[0],
  Omit<Parameters<typeof Tables.${tableName}.read>[1], 'limit' | 'offset'>,
]
      `
    })
    .join('\n')

  const tablesObject = `const Tables = {\n  ${tableDetails
    .map(({ tableName, typeName }) => {
      return `${tableName}: new BrightBaseCRUD<${typeName}, ${typeName}CreateOptions>('${tableName}')`
    })
    .join(',\n  ')}\n}\n`

  return `${imports}\n${tablesObject}\n${typeDefinitions}\nexport default Tables\n`
}

/**
 * Capitalizes the first letter and converts snake_case or kebab-case to CamelCase.
 * @param {string} str - The input string.
 * @returns {string} The string formatted in CamelCase.
 */
function capitalizeAndCamelCase(str) {
  return str
    .split(/_|-/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}
