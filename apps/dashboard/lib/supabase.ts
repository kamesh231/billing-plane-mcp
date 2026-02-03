import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

export type DashboardUser = {
  id: string
  clerk_user_id: string
  plan: 'free' | 'paid'
  polar_customer_id: string | null
  created_at: string
  updated_at: string
}

export type DashboardConnection = {
  id: string
  user_id: string
  name: string
  token_hash: string
  created_at: string
}

export type McpProjectUsage = {
  id: string
  user_id: string
  project_id: string
  first_used_at: string
}
