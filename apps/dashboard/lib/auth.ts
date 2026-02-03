import { createHash, randomBytes } from 'crypto'

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function normalizeProjectId(supabaseUrl: string): string {
  try {
    const u = new URL(supabaseUrl)
    return u.origin.toLowerCase().replace(/\/$/, '')
  } catch {
    return createHash('sha256').update(supabaseUrl).digest('hex')
  }
}
