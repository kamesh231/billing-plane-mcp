'use client'

import { useState, useCallback } from 'react'

type Connection = { id: string; name: string; created_at: string }

const FEATURES = [
  { feature: 'Projects', free: '1', paid: 'Unlimited' },
  { feature: 'Watermark', free: 'Yes (lovable-sub)', paid: 'No' },
  { feature: 'Support', free: 'Discord only', paid: 'Discord + on-call' },
]

export function LovableConnectorCard({
  connections,
  plan,
  onConnectionCreated,
  onConnectionRevoked,
}: {
  connections: Connection[]
  plan: 'free' | 'paid'
  onConnectionCreated: () => void
  onConnectionRevoked: () => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [generated, setGenerated] = useState<{ server_url: string; token: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  const canGenerate = plan === 'paid' || connections.length < 1

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/connections', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create connection')
        return
      }
      setGenerated({ server_url: data.server_url, token: data.token })
      onConnectionCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [onConnectionCreated])

  const handleRevoke = useCallback(
    async (id: string) => {
      if (!confirm('Revoke this connection? The token will stop working.')) return
      setRevokingId(id)
      setRevokeError(null)
      try {
        const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' })
        if (res.ok) {
          onConnectionRevoked()
        } else {
          const data = await res.json()
          setRevokeError(data.error || 'Failed to revoke connection')
        }
      } catch (e) {
        setRevokeError(e instanceof Error ? e.message : 'Request failed')
      } finally {
        setRevokingId(null)
      }
    },
    [onConnectionRevoked]
  )

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setGenerated(null)
    setError(null)
  }, [])

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lovable</h2>
        <p className="muted">
          Use BillingPlane MCP in Lovable to set up subscription billing (Stripe, Supabase) from chat.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
        >
          Generate OAuth
        </button>
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Your connections</h3>
          {connections.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
              No connections yet. Generate OAuth above to add one.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {connections.map((c) => (
                <li
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>{c.name}</span>
                  <span className="muted" style={{ flexShrink: 0 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleRevoke(c.id)}
                    disabled={revokingId === c.id}
                    style={{ fontSize: '0.875rem', minWidth: '5rem' }}
                  >
                    {revokingId === c.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {revokeError && (
            <p style={{ color: 'crimson', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: 0 }}>{revokeError}</p>
          )}
        </div>
      </div>

      {modalOpen && (
        <GenerateOAuthModal
          onClose={closeModal}
          plan={plan}
          canGenerate={canGenerate}
          connectionsCount={connections.length}
          generated={generated}
          loading={loading}
          error={error}
          onGenerate={handleGenerate}
        />
      )}
    </>
  )
}

function GenerateOAuthModal({
  onClose,
  plan,
  canGenerate,
  connectionsCount,
  generated,
  loading,
  error,
  onGenerate,
}: {
  onClose: () => void
  plan: 'free' | 'paid'
  canGenerate: boolean
  connectionsCount: number
  generated: { server_url: string; token: string } | null
  loading: boolean
  error: string | null
  onGenerate: () => void
}) {
  const [copied, setCopied] = useState<'url' | 'token' | null>(null)

  const copy = (value: string, key: 'url' | 'token') => {
    navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 520,
          margin: '1rem',
          background: 'var(--background)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Generate OAuth</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>Feature</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>Free</th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>Paid</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row) => (
              <tr key={row.feature}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>{row.feature}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>{row.free}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>{row.paid}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!generated ? (
          <>
            {plan === 'free' && connectionsCount >= 1 && (
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Free plan allows one connection. Upgrade to add more.
              </p>
            )}
            {canGenerate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onGenerate}
                disabled={loading}
              >
                {loading ? 'Generating…' : 'Generate'}
              </button>
            )}
            {!canGenerate && (
              <a
                href={process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Upgrade to add more
              </a>
            )}
            {error && <p style={{ color: 'crimson', marginTop: '0.5rem', fontSize: '0.875rem' }}>{error}</p>}
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: '0.5rem' }}>
              Add this in Lovable: Settings → Connectors → New MCP server. Use the Server URL and Bearer token below.
            </p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Server URL</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, padding: '0.5rem', background: 'var(--border)', borderRadius: 4, fontSize: '0.875rem', overflow: 'auto' }}>
                  {generated.server_url}
                </code>
                <button type="button" className="btn" onClick={() => copy(generated.server_url, 'url')}>
                  {copied === 'url' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Bearer token</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, padding: '0.5rem', background: 'var(--border)', borderRadius: 4, fontSize: '0.875rem', overflow: 'auto', wordBreak: 'break-all' }}>
                  {generated.token}
                </code>
                <button type="button" className="btn" onClick={() => copy(generated.token, 'token')}>
                  {copied === 'token' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="muted" style={{ fontSize: '0.75rem' }}>
              Store the token securely. It will not be shown again.
            </p>
          </>
        )}

        <button type="button" className="btn" onClick={onClose} style={{ marginTop: '1rem' }}>
          Close
        </button>
      </div>
    </div>
  )
}
