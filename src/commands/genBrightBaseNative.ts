import path from 'path'
import displayBanner from '../utils/displayBanner'
import fs from 'fs'
import signale from 'signale'

export default function genBrightBaseNative() {
  displayBanner()

  const dbTypesFilePath = path.join(process.cwd(), 'types', 'database.types.ts')
  const brightTypesFilePath = path.join(process.cwd(), 'types', 'bright.types.ts')
  const tablesOutputFilePath = path.join(process.cwd(), 'api', 'Tables.ts')
  const rpcOutputFilePath = path.join(process.cwd(), 'api', 'Rpc.ts')

  // Step 1: Generate bright.types.ts
  generateBrightTypes(brightTypesFilePath)

  // Step 2: Read database.types.ts and generate Tables.ts and Rpc.ts
  fs.readFile(dbTypesFilePath, 'utf8', (err, data) => {
    if (err) {
      signale.error('Error reading types file:', err)
      process.exit(1)
    }

    // Extract table details and generate Tables.ts content
    const tableNames = extractTableDetails(data)
    const tablesFileContent = generateTablesContent(tableNames)

    fs.writeFile(tablesOutputFilePath, tablesFileContent, (err) => {
      if (err) {
        signale.error('Error writing file:', err)
        process.exit(1)
      }
      signale.success('Tables successfully generated!')
    })

    // Step 3: Extract RPC function details and generate RpcFunctions.ts content
    const rpcFunctions = extractRpcFunctions(data)
    if (rpcFunctions.length > 0) {
      const rpcFileContent = generateRpcFunctionsContent(rpcFunctions)

      fs.writeFile(rpcOutputFilePath, rpcFileContent, (err) => {
        if (err) {
          signale.error('Error writing file:', err)
          process.exit(1)
        }
        signale.success('RPC functions successfully generated!')
      })
    } else {
      signale.info('No RPC functions found. Skipping Rpc.ts generation.')

      // Check if Rpc.ts already exists and delete it if present
      if (fs.existsSync(rpcOutputFilePath)) {
        fs.unlink(rpcOutputFilePath, (err) => {
          if (err) {
            signale.error('Error deleting existing Rpc.ts file:', err)
            process.exit(1)
          }
          signale.success('Existing Rpc.ts file deleted successfully.')
        })
      }
    }
  })
}

// Step 1: Generate bright.types.ts
function generateBrightTypes(brightTypesFilePath: string) {
  const content = `import { Database } from './database.types'
export type { Tables as BrightTable } from './database.types.ts'
// Utility types to infer Args and Returns from the Database's Functions type
type FunctionArgs<F extends keyof Database['public']['Functions']> = Database['public']['Functions'][F]['Args']
type FunctionReturns<F extends keyof Database['public']['Functions']> = Database['public']['Functions'][F]['Returns']

// Helper type to generate the FunctionsType
export type GenerateFunctionsType = {
  [K in keyof Database['public']['Functions']]: {
    args: FunctionArgs<K>
    returns: FunctionReturns<K>
  }
}

export interface RealtimeEvents {
  [event: string]: { [key: string]: unknown }
}

export type EventCallback<K extends RealtimeEvents, T extends keyof K> = (payload: K[T]) => void

`

  fs.writeFile(brightTypesFilePath, content, (err) => {
    if (err) {
      signale.error('Error writing bright.types.ts file:', err)
      process.exit(1)
    }
    signale.success('bright.types.ts successfully generated!')
  })
}

// Interface for extracted table details
interface TableDetails {
  tableName: string
  typeName: string
}

// Interface for extracted RPC function details
interface RpcFunctionDetails {
  functionName: string
  argsType: string
  returnType: string
}

// Function to extract table details
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

// Function to generate Tables.ts content
function generateTablesContent(tableDetails: TableDetails[]): string {
  const imports = `import { BrightBaseCRUD } from 'bsdweb'\nimport { BrightTable } from '../types/bright.types'\n\n`

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

// Function to extract RPC function details
function extractRpcFunctions(data: string): RpcFunctionDetails[] {
  const rpcFunctions: RpcFunctionDetails[] = []
  const regex = /(\w+):\s*{\s*Args:\s*{([^}]*)}\s*Returns:\s*([^}]*)}/g
  let match

  while ((match = regex.exec(data)) !== null) {
    const functionName = match[1]
    const argsType = match[2].trim().replace(/\s+/g, ' ')
    const returnType = match[3].trim()
    rpcFunctions.push({ functionName, argsType, returnType })
  }

  return rpcFunctions
}

// Updated function to generate Rpc.ts content
function generateRpcFunctionsContent(rpcFunctions: RpcFunctionDetails[]): string {
  const functionsList = rpcFunctions.map(({ functionName }) => `'${functionName}'`).join(', ')

  return `import { GenerateFunctionsType } from '@/types/bright.types';
import { BrightBaseFunctions } from 'bsdweb';

const Functions: (keyof FunctionsType)[] = [${functionsList}];

type FunctionsType = GenerateFunctionsType;

const functions = new BrightBaseFunctions<FunctionsType>(Functions).functions;

export default functions;
`
}

// Helper function to capitalize and camel case a string
function capitalizeAndCamelCase(str: string): string {
  return str
    .split(/_|-/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}
