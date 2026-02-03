import { AsyncLocalStorage } from 'node:async_hooks'

export type AuthContext = {
  user_id: string
  plan: 'free' | 'paid'
}

export const authStorage = new AsyncLocalStorage<AuthContext>()

export function getAuthContext(): AuthContext | undefined {
  return authStorage.getStore()
}

export function normalizeProjectId(supabaseUrl: string): string {
  try {
    const u = new URL(supabaseUrl)
    return u.origin.toLowerCase().replace(/\/$/, '')
  } catch {
    return supabaseUrl
  }
}

const DASHBOARD_URL = process.env.DASHBOARD_API_URL || 'http://localhost:3000'

export async function validateToken(bearerToken: string): Promise<AuthContext | null> {
  const res = await fetch(`${DASHBOARD_URL}/api/connections/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { user_id?: string; plan?: string }
  if (!data.user_id || !data.plan) return null
  return { user_id: data.user_id, plan: data.plan as 'free' | 'paid' }
}

export async function checkProject(userId: string, projectId: string): Promise<{ allowed: boolean; message?: string }> {
  const res = await fetch(`${DASHBOARD_URL}/api/mcp/check-project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, project_id: projectId }),
  })
  const data = (await res.json()) as { allowed?: boolean; message?: string }
  return { allowed: data.allowed === true, message: data.message }
}

const WATERMARK = '\n\nPowered by lovable-sub (BillingPlane)'

export function appendWatermark(content: Array<{ type: 'text'; text: string }>, plan: string): void {
  if (plan !== 'free') return
  for (const part of content) {
    if (part.type === 'text' && part.text) {
      part.text += WATERMARK
    }
  }
}
