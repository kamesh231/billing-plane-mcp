import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id: userId, project_id: projectId } = body as { user_id?: string; project_id?: string }
    if (!userId || !projectId) {
      return NextResponse.json(
        { error: 'Missing user_id or project_id' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: user, error: userError } = await supabase
      .from('dashboard_users')
      .select('plan')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.plan === 'paid') {
      return NextResponse.json({ allowed: true })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('dashboard_mcp_project_usage')
      .select('project_id')
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!existing) {
      const { error: insertError } = await supabase
        .from('dashboard_mcp_project_usage')
        .insert({ user_id: userId, project_id: projectId })
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
      return NextResponse.json({ allowed: true })
    }

    if (existing.project_id === projectId) {
      return NextResponse.json({ allowed: true })
    }

    return NextResponse.json({
      allowed: false,
      message:
        "You've already used this connection for another project. Upgrade to use BillingPlane in multiple projects.",
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Check failed' },
      { status: 500 }
    )
  }
}
