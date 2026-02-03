import { getSupabaseAdmin } from './supabase'
import type { DashboardUser } from './supabase'

export async function ensureDashboardUser(clerkUserId: string): Promise<DashboardUser> {
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('dashboard_users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (existing) return existing as DashboardUser

  const { data: inserted, error } = await supabase
    .from('dashboard_users')
    .insert({
      clerk_user_id: clerkUserId,
      plan: 'free',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create dashboard user: ${error.message}`)
  return inserted as DashboardUser
}

export async function getDashboardUserByTokenHash(tokenHash: string): Promise<DashboardUser | null> {
  const supabase = getSupabaseAdmin()
  const { data: conn } = await supabase
    .from('dashboard_connections')
    .select('user_id')
    .eq('token_hash', tokenHash)
    .single()
  if (!conn) return null

  const { data: user } = await supabase
    .from('dashboard_users')
    .select('*')
    .eq('id', conn.user_id)
    .single()
  return user as DashboardUser | null
}
