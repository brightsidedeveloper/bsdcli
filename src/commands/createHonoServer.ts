import path from 'path'
import displayBanner from '../utils/displayBanner'
import signale from 'signale'
import fs from 'fs'
import { execAsync } from '../execAsync'

export default async function createBrightSideServer(name: string) {
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

  const repoUrl = 'https://github.com/brightsidedeveloper/create-hono-server.git'
  const cloneCommand = `git clone ${repoUrl} ${targetDir}`

  signale.pending(`Creating your BrightSide Server in '${name}'... 🚀`)
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

  signale.start('Installing Hono dependencies...')
  const { error: initError } = await execAsync(`cd ${targetDir} && npm install`)
  if (initError) {
    signale.error(`Error installing BrightSide dependencies: ${initError.message}`)
    return
  }

  signale.success('All done! Your BrightSide Server is ready to go! 🚀')

  signale.info(`Let's start it!`)

  signale.start('Launching...')
  const { error: finalError } = await execAsync(`cd ${targetDir} && npm run dev`)
  if (finalError) {
    signale.error(`Error launching: ${finalError.message}`)
    return
  }
}
