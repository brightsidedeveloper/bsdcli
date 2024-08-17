#!/usr/bin/env node

const { program } = require('commander')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

program
  .command('gen-brightbase')
  .description('Generate types and instantiate tables for BrightBase')
  .action(() => {
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

    // Read the generated database.types.ts file
    fs.readFile(dbTypesFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading types file:', err)
        process.exit(1)
      }

      // Extract table names
      const tableNames = extractTableDetails(data)

      // Generate the content for the Tables.ts file
      const fileContent = generateTablesContent(tableNames)

      // Write the content to Tables.ts
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
  .description('This will eventually create a new Brightside app')
  .action((name) => {
    const command = `echo "Testing out passing args, you passed: ${name}"`

    exec(command, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`)
        return
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`)
        return
      }

      console.log(`stdout: ${stdout}`)
    })
  })

program.parse(process.argv)

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
