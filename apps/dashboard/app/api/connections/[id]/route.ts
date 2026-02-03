import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ensureDashboardUser } from '@/lib/user'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await ensureDashboardUser(userId)
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data: conn, error: fetchError } = await supabase
      .from('dashboard_connections')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('dashboard_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to revoke connection' },
      { status: 500 }
    )
  }
}
