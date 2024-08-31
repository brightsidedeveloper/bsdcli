import path from 'path'
import displayBanner from '../utils/displayBanner'
import signale from 'signale'
import fs from 'fs'
import { execAsync } from '../execAsync'

export default async function createBrightSideExtension(name: string) {
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

  const repoUrl = 'https://github.com/brightsidedeveloper/react-extension.git'
  const cloneCommand = `git clone ${repoUrl} ${targetDir}`

  signale.pending(`What's up, ${name === '.' ? 'in the current directory' : name}! Let's create your new BrightSide Extension! 🚀`)

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

  // Install dependencies for `popup`
  signale.start('Installing dependencies for popup...')
  const popupDir = path.join(targetDir, 'popup')
  const { error: installPopupError } = await execAsync(`cd ${popupDir} && npm install`)
  if (installPopupError) {
    signale.error(`Error installing dependencies in popup: ${installPopupError.message}`)
    return
  }

  // Install dependencies for `injection`
  signale.start('Installing dependencies for injection...')
  const injectionDir = path.join(targetDir, 'injection')
  const { error: installInjectError } = await execAsync(`cd ${injectionDir} && npm install`)
  if (installInjectError) {
    signale.error(`Error installing dependencies in injection: ${installInjectError.message}`)
    return
  }

  signale.start('Building extension...')
  const { error: buildError } = await execAsync(`cd ${targetDir} && npm run build`)
  if (buildError) {
    signale.error(`Error building extension: ${buildError.message}`)
    return
  }

  signale.success('Dependencies installed successfully!')

  signale.success(`Your BrightSide Extension is ready! 🎉`)
}
