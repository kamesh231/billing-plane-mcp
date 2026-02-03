// Lovable Subscription Foundation
// SubscriptionGate: Component-based feature gating
// Hides/shows content based on feature access

import { ReactNode } from 'react'
import { useSubscription } from './SubscriptionProvider'
import { UpgradePrompt } from './UpgradePrompt'
import { FeatureSlug } from '../config/pricing'

export interface SubscriptionGateProps {
  /**
   * Feature slug from pricing.ts config
   * Example: "advanced-analytics", "export-data"
   */
  slug: FeatureSlug

  /**
   * Content to show when user has access
   */
  children: ReactNode

  /**
   * Custom fallback to show when access is denied
   * Default: UpgradePrompt component
   */
  fallback?: ReactNode

  /**
   * Loading state component
   * Default: "Loading..."
   */
  loadingFallback?: ReactNode

  /**
   * If true, renders nothing when access denied (instead of fallback)
   * Useful for navigation items
   */
  hideWhenLocked?: boolean
}

export function SubscriptionGate({
  slug,
  children,
  fallback,
  loadingFallback = <div className="text-gray-500">Loading...</div>,
  hideWhenLocked = false
}: SubscriptionGateProps) {
  const { canAccess, loading } = useSubscription()

  // Show loading state
  if (loading) {
    return <>{loadingFallback}</>
  }

  // Check access
  const hasAccess = canAccess(slug)

  // User has access - show content
  if (hasAccess) {
    return <>{children}</>
  }

  // User doesn't have access
  if (hideWhenLocked) {
    return null
  }

  // Show custom fallback or default UpgradePrompt
  return <>{fallback || <UpgradePrompt featureSlug={slug} />}</>
}
