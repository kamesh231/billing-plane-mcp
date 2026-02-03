import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ensureDashboardUser } from '@/lib/user'
import { ConnectorsRefresh } from '@/components/ConnectorsRefresh'

export default async function ConnectorsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await ensureDashboardUser(userId)
  const supabase = getSupabaseAdmin()
  const { data: connections } = await supabase
    .from('dashboard_connections')
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main>
      <h1>Connectors</h1>
      <p className="muted">Connect BillingPlane to your tools. Generate OAuth to use the MCP server in Lovable.</p>

      <div style={{ marginTop: '1.5rem' }}>
        <ConnectorsRefresh connections={connections ?? []} plan={user.plan as 'free' | 'paid'} />
      </div>
    </main>
  )
}
