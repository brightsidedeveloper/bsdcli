import { exec } from 'child_process'

interface ExecResult {
  stdout: string
  stderr: string
  error: Error | null
}

export const execAsync = (command: string, options: { shell?: string } = {}): Promise<ExecResult> => {
  return new Promise((resolve) => {
    exec(command, options, (error, stdout, stderr) => {
      resolve({
        stdout,
        stderr,
        error,
      })
    })
  })
}
