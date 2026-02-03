import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ensureDashboardUser } from '@/lib/user'
import { generateToken, hashToken } from '@/lib/auth'

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://mcp.billingplane.com'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await ensureDashboardUser(userId)
    const supabase = getSupabaseAdmin()
    const { data: connections, error } = await supabase
      .from('dashboard_connections')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ connections: connections || [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to list connections' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await ensureDashboardUser(userId)

    if (user.plan === 'free') {
      const supabase = getSupabaseAdmin()
      const { count, error: countError } = await supabase
        .from('dashboard_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
      if ((count ?? 0) >= 1) {
        return NextResponse.json(
          { error: 'Free plan allows one connection. Upgrade to add more.' },
          { status: 403 }
        )
      }
    }

    const plainToken = generateToken()
    const tokenHash = hashToken(plainToken)
    const supabase = getSupabaseAdmin()
    const { data: conn, error } = await supabase
      .from('dashboard_connections')
      .insert({
        user_id: user.id,
        name: 'Lovable',
        token_hash: tokenHash,
      })
      .select('id, name, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      connection: conn,
      server_url: MCP_SERVER_URL,
      token: plainToken,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create connection' },
      { status: 500 }
    )
  }
}
