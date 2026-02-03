/**
 * Run Supabase CLI
 *
 * Runs supabase subcommands (db, functions, secrets only) for migrations,
 * deploy, and secrets. Redacts secret values in output.
 */

import { execSync } from 'child_process'

const ALLOWED_PREFIXES = ['db', 'functions', 'secrets']

function isAllowed(command: string): boolean {
  const trimmed = command.trim()
  const first = trimmed.split(/\s+/)[0]
  return ALLOWED_PREFIXES.includes(first)
}

function redactSecrets(output: string): string {
  return output.replace(/secrets set \S+=\S+/g, 'secrets set ***=***')
}

export interface RunSupabaseCliInput {
  command: string
  cwd?: string
}

export async function runSupabaseCli(args: RunSupabaseCliInput): Promise<{
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}> {
  const { command, cwd } = args

  if (!command || typeof command !== 'string') {
    return {
      content: [{ type: 'text', text: 'run_supabase_cli: command is required' }],
      isError: true,
    }
  }

  if (!isAllowed(command)) {
    return {
      content: [
        {
          type: 'text',
          text: `run_supabase_cli: only subcommands "db", "functions", and "secrets" are allowed. Got: ${command.split(/\s+/)[0]}`,
        },
      ],
      isError: true,
    }
  }

  try {
    const fullCommand = `supabase ${command}`
    const result = execSync(fullCommand, {
      encoding: 'utf-8',
      cwd: cwd ?? process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    })
    const out = redactSecrets(String(result ?? ''))
    const summary = out.slice(-2000)
    return {
      content: [
        {
          type: 'text',
          text: `Command succeeded.\n\n${summary || '(no output)'}`,
        },
      ],
    }
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string }
    const stderr = execErr?.stderr ?? execErr?.message ?? String(err)
    const stdout = execErr?.stdout ?? ''
    const combined = redactSecrets(`${stdout}\n${stderr}`.trim())
    const summary = combined.slice(-2000)
    return {
      content: [
        {
          type: 'text',
          text: `Command failed.\n\n${summary || '(no output)'}`,
        },
      ],
      isError: true,
    }
  }
}
