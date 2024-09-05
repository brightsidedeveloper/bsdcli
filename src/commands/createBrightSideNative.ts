import path from 'path'
import displayBanner from '../utils/displayBanner'
import signale from 'signale'
import fs from 'fs'
import prompts from 'prompts'
import { execAsync } from '../execAsync'

export default async function createBrightSideNativeApp(name: string) {
  displayBanner()

  const currentDir = process.cwd()
  const targetDir = path.join(currentDir, name)

  // Check if the target directory already exists
  if (fs.existsSync(targetDir)) {
    signale.error(`Error: Directory '${name}' already exists. Please choose a different name or remove the existing directory.`)
    process.exit(1)
  } else {
    fs.mkdirSync(targetDir)
  }

  const answers = await prompts([
    { type: 'text', name: 'supabaseRefId', message: 'Enter your Supabase Reference ID:' },
    { type: 'text', name: 'supabaseUrl', message: 'Enter your Supabase URL:' },
    { type: 'text', name: 'supabaseAnonKey', message: 'Enter your Supabase Anon Key:' },
  ])

  // Clone the repository containing both web and native folders
  const repoUrl = 'https://github.com/brightsidedeveloper/create-brightside-native.git'
  const cloneCommand = `git clone ${repoUrl} ${targetDir}`

  signale.pending(`Creating your BrightSide app in '${name}'... 🚀`)
  const { error: cloneError } = await execAsync(cloneCommand)
  if (cloneError) {
    signale.error(`Error cloning repository: ${cloneError.message}`)
    return
  }

  // Remove git directory
  signale.start('Cleaning up the repository...')
  const gitDir = path.join(targetDir, '.git')
  fs.rmSync(gitDir, { recursive: true })
  signale.success('Cleaned up the repository')

  signale.start('Installing BrightSide dependencies...')
  const { error: initError } = await execAsync(`cd ${targetDir} && npm install`)
  if (initError) {
    signale.error(`Error installing BrightSide dependencies: ${initError.message}`)
    return
  }

  // Update Web App package.json
  const webFolder = path.join(targetDir, 'web')
  const webPackageJsonPath = path.join(webFolder, 'package.json')
  const webPackageJson = JSON.parse(fs.readFileSync(webPackageJsonPath, 'utf8'))
  webPackageJson.name = `${name}-web`
  webPackageJson.scripts.gen = webPackageJson.scripts.gen.replace('$SUPABASE_REFERENCE_ID', answers.supabaseRefId.trim())

  fs.writeFileSync(webPackageJsonPath, JSON.stringify(webPackageJson, null, 2))
  signale.success('Updated web package.json')

  // Create .env file for Web App
  const webEnvContent = `VITE_SUPABASE_URL=${answers.supabaseUrl.trim()}\nVITE_SUPABASE_ANON_KEY=${answers.supabaseAnonKey.trim()}\n`
  const webEnvFilePath = path.join(webFolder, '.env')
  fs.writeFileSync(webEnvFilePath, webEnvContent)
  signale.success('Created .env file for web app')

  // Install Web App dependencies
  signale.start('Installing web app dependencies...')
  const { error: webInstallError } = await execAsync(`cd ${webFolder} && npm install`)
  if (webInstallError) {
    signale.error(`Error installing web dependencies: ${webInstallError.message}`)
    return
  }

  signale.success('Web app dependencies installed successfully!')

  // Install Native App dependencies
  const nativeFolder = path.join(targetDir, 'native')
  signale.start('Installing native app dependencies...')
  const { error: nativeInstallError } = await execAsync(`cd ${nativeFolder} && npm install`)
  if (nativeInstallError) {
    signale.error(`Error installing native dependencies: ${nativeInstallError.message}`)
    return
  }

  signale.success('Native app dependencies installed successfully!')

  // Final Success Message
  signale.success('All done! Your BrightSide app is ready to go! 🚀')

  signale.info(`Let's start it!`)

  signale.start('Launching...')
  const { error: finalError } = await execAsync(`cd ${targetDir} && npm start`)
  if (finalError) {
    signale.error(`Error launching: ${finalError.message}`)
    return
  }
}
