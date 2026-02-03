import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserProfile } from '@clerk/nextjs'
import { ensureDashboardUser } from '@/lib/user'
import { SubscriptionBlock } from '@/components/SubscriptionBlock'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await ensureDashboardUser(userId)

  return (
    <main>
      <h1>Profile</h1>
      <p className="muted">Manage your account and subscription.</p>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Account</h2>
        <UserProfile />
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <SubscriptionBlock plan={user.plan as 'free' | 'paid'} />
      </div>
    </main>
  )
}
