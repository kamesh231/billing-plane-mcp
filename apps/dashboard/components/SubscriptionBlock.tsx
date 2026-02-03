'use client'

export function SubscriptionBlock({ plan }: { plan: 'free' | 'paid' }) {
  const portalUrl = process.env.NEXT_PUBLIC_POLAR_PORTAL_URL || 'https://polar.sh/dashboard'

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Subscription</h2>
      <p className="muted" style={{ marginBottom: '0.5rem' }}>
        Plan: {plan === 'paid' ? 'Paid (Lifetime)' : 'Free'}
      </p>
      <a
        href={portalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary"
      >
        Manage Subscription
      </a>
    </>
  )
}
