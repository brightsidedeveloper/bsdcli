import path from 'path'
import displayBanner from '../utils/displayBanner'
import signale from 'signale'
import fs from 'fs'
import prompts from 'prompts'
import { execAsync } from '../execAsync'

export default async function createBrightSideApp(name: string) {
  displayBanner()

  const currentDir = process.cwd()
  let targetDir = currentDir

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

  signale.pending(`What's up, ${name === '.' ? 'in the current directory' : name}! Let's create your new BrightSide app! 🚀`)

  // Execute the clone command
  const { error: cloneError } = await execAsync(cloneCommand)
  if (cloneError) {
    signale.error(`Error cloning repository: ${cloneError.message}`)
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

  // Install dependencies
  signale.start('Installing dependencies...')
  const { error: installError } = await execAsync(`cd ${targetDir} && npm install`)
  if (installError) {
    signale.error(`Error installing dependencies: ${installError.message}`)
    return
  }

  signale.success('Dependencies installed successfully!')

  // Run the generate command
  signale.start('Generating with Supabase...')
  const { error: genError } = await execAsync(`cd ${targetDir} && npm run gen`)
  if (genError) {
    signale.error(`Error starting development server: ${genError.message}`)
    return
  }

  signale.success('Done! Run "npm run dev" to start the development server.')
}
