// Lovable Subscription Foundation
// License Badge - Monetization Component
//
// Free Version: Shows this badge
// Pro Version ($49): Badge hidden when NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE=true

import { LICENSE_CONFIG } from '../config/license'

export interface LicenseBadgeProps {
  /**
   * Position of the badge
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

  /**
   * Custom className for styling
   */
  className?: string

  /**
   * Custom text (overrides default)
   */
  text?: string

  /**
   * Force hide badge (for testing)
   */
  forceHide?: boolean
}

export function LicenseBadge({
  position = 'bottom-right',
  className = '',
  text,
  forceHide = false
}: LicenseBadgeProps) {
  // Don't render if Pro license or force hidden
  if (LICENSE_CONFIG.isPro || forceHide) {
    return null
  }

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'top-left': { top: '16px', left: '16px' },
  }

  const displayText = text || LICENSE_CONFIG.badge.text

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        fontSize: '12px',
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '6px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        ...({
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }
        } as any)
      }}
    >
      <a
        href={LICENSE_CONFIG.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#666',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: 500,
        }}
        title="Click to upgrade to Pro and remove this badge"
      >
        <span role="img" aria-label="lightning">{LICENSE_CONFIG.badge.emoji}</span>
        <span>{displayText}</span>
      </a>
    </div>
  )
}

/**
 * Inline variant - smaller, for embedding in UI
 */
export function InlineLicenseBadge({
  className = ''
}: {
  className?: string
}) {
  // Don't render if Pro license
  if (LICENSE_CONFIG.isPro) {
    return null
  }

  return (
    <a
      href={LICENSE_CONFIG.purchaseUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color: '#888',
        textDecoration: 'none',
        padding: '4px 8px',
        borderRadius: '4px',
        background: 'rgba(0, 0, 0, 0.03)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease',
      }}
      title="Remove badge with Pro license"
    >
      <span>{LICENSE_CONFIG.badge.emoji}</span>
      <span>Powered by LSF</span>
    </a>
  )
}

/**
 * Footer variant - for placing in page footer
 */
export function FooterLicenseBadge({
  className = ''
}: {
  className?: string
}) {
  // Don't render if Pro license
  if (LICENSE_CONFIG.isPro) {
    return null
  }

  return (
    <div
      className={className}
      style={{
        textAlign: 'center',
        padding: '16px',
        fontSize: '12px',
        color: '#888',
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <a
        href={LICENSE_CONFIG.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#666',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>{LICENSE_CONFIG.badge.emoji}</span>
        <span>{LICENSE_CONFIG.badge.text}</span>
      </a>
      {' • '}
      <a
        href={LICENSE_CONFIG.purchaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#0066cc',
          textDecoration: 'none',
        }}
      >
        Remove badge
      </a>
    </div>
  )
}
