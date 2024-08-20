import path from 'path'
import displayBanner from '../utils/displayBanner'
import fs from 'fs'
import signale from 'signale'

export default function genBrightbase() {
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
}

interface TableDetails {
  tableName: string
  typeName: string
}

function extractTableDetails(data: string): TableDetails[] {
  const tableDetails: TableDetails[] = []
  const regex = /(\w+):\s*{\s*Row:\s*{[^}]*}/g
  let match

  while ((match = regex.exec(data)) !== null) {
    const tableName = match[1]
    const typeName = capitalizeAndCamelCase(tableName)
    tableDetails.push({ tableName, typeName })
  }

  return tableDetails
}

function generateTablesContent(tableDetails: TableDetails[]): string {
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

function capitalizeAndCamelCase(str: string): string {
  return str
    .split(/_|-/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}
