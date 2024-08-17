#!/usr/bin/env node

const { program } = require('commander')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const inquirer = require('inquirer')

program
  .command('gen-brightbase')
  .description('Generate types and instantiate tables for BrightBase')
  .action(() => {
    // Existing 'gen-brightbase' command logic
    const dbTypesFilePath = path.join(process.cwd(), 'src/types', 'database.types.ts')
    const brightTypesFilePath = path.join(process.cwd(), 'src/types', 'bright.types.ts')
    const outputFilePath = path.join(process.cwd(), 'src/api', 'Tables.ts')

    fs.writeFile(
      brightTypesFilePath,
      `export type { Tables as BrightTable } from './database.types.ts'\n\nexport interface RealtimeEvents {\n  [event: string]: unknown\n}\n\nexport type EventCallback<K extends RealtimeEvents, T extends keyof K> = (payload: K[T]) => void`,
      (err) => {
        if (err) {
          console.error('Error writing file:', err)
          process.exit(1)
        }
      }
    )

    fs.readFile(dbTypesFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading types file:', err)
        process.exit(1)
      }

      const tableNames = extractTableDetails(data)
      const fileContent = generateTablesContent(tableNames)

      fs.writeFile(outputFilePath, fileContent, (err) => {
        if (err) {
          console.error('Error writing file:', err)
          process.exit(1)
        }
        console.log('Tables successfully generated!')
      })
    })
  })

program
  .command('create-brightside-app <name>')
  .description('Create a new Brightside app')
  .action((name) => {
    const repoUrl = 'https://github.com/brightsidedeveloper/create-brightside-app.git'
    const cloneCommand = `git clone ${repoUrl} ${name}`

    console.log(`Cloning the repository into ${name}...`)
    exec(cloneCommand, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error cloning repository: ${error.message}`)
        return
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`)
        return
      }

      console.log(`stdout: ${stdout}`)
      console.log('Repository cloned successfully!')

      inquirer
        .prompt([
          { name: 'supabaseRefId', message: 'Enter your Supabase Reference ID:' },
          { name: 'supabaseUrl', message: 'Enter your Supabase URL:' },
          { name: 'supabaseAnonKey', message: 'Enter your Supabase Anon Key:' },
        ])
        .then((answers) => {
          // Update package.json
          const packageJsonPath = path.join(process.cwd(), name, 'package.json')
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
          packageJson.name = name
          packageJson.scripts.gen = packageJson.scripts.gen.replace('$SUPABASE_REFERENCE_ID', answers.supabaseRefId)

          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
          console.log('Updated package.json')

          // Create .env file
          const envContent = `VITE_SUPABASE_URL=${answers.supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${answers.supabaseAnonKey}\n`
          const envFilePath = path.join(process.cwd(), name, '.env')
          fs.writeFileSync(envFilePath, envContent)
          console.log('Created .env file')

          // Install dependencies and start the dev server
          console.log('Installing dependencies...')
          exec(`cd ${name} && npm install`, { shell: true }, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error installing dependencies: ${error.message}`)
              return
            }

            if (stderr) {
              console.error(`stderr: ${stderr}`)
              return
            }

            console.log(`stdout: ${stdout}`)
            console.log('Dependencies installed successfully!')

            console.log('Starting the development server...')
            exec(`cd ${name} && npm run dev`, { shell: true }, (error, stdout, stderr) => {
              if (error) {
                console.error(`Error starting development server: ${error.message}`)
                return
              }

              if (stderr) {
                console.error(`stderr: ${stderr}`)
                return
              }

              console.log(`stdout: ${stdout}`)
              console.log('Development server started!')
            })
          })
        })
    })
  })

program.parse(process.argv)

/* Helper Functions */

// Add your existing helper functions here...

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
      return `export type ${typeName} = BrightTable<'${tableName}'>\nexport interface ${typeName}CreateOptions {\n  OmitOnCreate: 'id' | 'created_at'\n  OptionalOnCreate: never\n}\nexport type ${typeName}ReadOptions = Parameters<typeof Tables.${tableName}.read>\n`
    })
    .join('\n')

  const tablesObject = `const Tables = {\n  ${tableDetails
    .map(({ tableName, typeName }) => {
      return `${tableName}: new BrightBaseCRUD<${typeName}, ${typeName}CreateOptions>('${tableName}')`
    })
    .join(',\n  ')}\n}\n`

  return `${imports}${typeDefinitions}\n${tablesObject}\nexport default Tables\n`
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
