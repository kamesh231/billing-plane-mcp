import { SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>BillingPlane</h1>
      <p className="muted">MCP distribution for Lovable – add subscription billing to your apps.</p>

      <SignedIn>
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>Your MCP connections</h2>
          <p className="muted">Go to Connectors to generate OAuth and connect BillingPlane to Lovable.</p>
          <Link href="/connectors" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            Connectors
          </Link>
        </div>
      </SignedIn>

      <SignedOut>
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <p>Sign in to generate MCP connections and manage your subscription.</p>
          <Link href="/sign-in" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            Sign in
          </Link>
        </div>
      </SignedOut>
    </main>
  )
}
