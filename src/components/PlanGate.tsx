// Lovable Subscription Foundation
// PlanGate: Plan-based access control
// Hides/shows content based on subscription plan

import { ReactNode } from 'react'
import { useSubscription } from './SubscriptionProvider'
import { UpgradePrompt } from './UpgradePrompt'
import { PlanId } from '../config/pricing'

export interface PlanGateProps {
  /**
   * Required plan(s) to access this content
   * Example: "pro" or ["pro", "enterprise"]
   */
  plan: PlanId | PlanId[]

  /**
   * Content to show when user has required plan
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
   * If true, renders nothing when access denied
   */
  hideWhenLocked?: boolean
}

export function PlanGate({
  plan,
  children,
  fallback,
  loadingFallback = <div className="text-gray-500">Loading...</div>,
  hideWhenLocked = false
}: PlanGateProps) {
  const { subscription, loading } = useSubscription()

  // Show loading state
  if (loading) {
    return <>{loadingFallback}</>
  }

  // Normalize plan to array
  const allowedPlans = Array.isArray(plan) ? plan : [plan]

  // Check if user's plan is in allowed plans AND subscription is active
  const hasAccess = subscription &&
    allowedPlans.includes(subscription.plan_id) &&
    ['active', 'trialing'].includes(subscription.status)

  // User has access - show content
  if (hasAccess) {
    return <>{children}</>
  }

  // User doesn't have access
  if (hideWhenLocked) {
    return null
  }

  // Show custom fallback or default UpgradePrompt with first required plan
  return <>{fallback || <UpgradePrompt requiredPlan={allowedPlans[0]} />}</>
}
