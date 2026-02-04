// Lovable Subscription Foundation
// SubscriptionProvider: Context provider for subscription state
// This fetches the user's subscription once and provides it to all components

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { PRICING_CONFIG, PlanId, FeatureSlug } from '../config/pricing'

// Subscription interface matching database schema
export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_id: PlanId
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
  seats_limit: number
  feature_limits: Record<string, any>
  trial_end: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
  // Computed
  features: FeatureSlug[]
}

export interface SubscriptionContextValue {
  subscription: Subscription | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  // Helper functions
  canAccess: (featureSlug: FeatureSlug) => boolean
  isPlanActive: (planId: PlanId) => boolean
  isFeatureActive: (featureSlug: FeatureSlug) => boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

export interface SubscriptionProviderProps {
  children: ReactNode
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseClient?: SupabaseClient // Optional: provide your own client
}

export function SubscriptionProvider({
  children,
  supabaseUrl,
  supabaseAnonKey,
  supabaseClient: providedClient
}: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use provided client or create new one
  const supabase = providedClient || createClient(supabaseUrl, supabaseAnonKey)

  async function fetchSubscription() {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        setSubscription(null)
        setLoading(false)
        return
      }

      // Ensure Stripe Customer exists for free users (so Upgrade CTA can open Portal without Checkout first)
      try {
        await supabase.functions.invoke('ensure-stripe-customer')
      } catch (_) {
        // Non-blocking: fetch subscription anyway
      }

      // Fetch subscription (billing schema)
      const { data, error: fetchError } = await supabase
        .schema('billing')
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError

      if (!data) {
        setSubscription(null)
        setLoading(false)
        return
      }

      // Augment with features from pricing config
      const plan = PRICING_CONFIG.plans[data.plan_id as PlanId]
      const features = [...(plan?.features || [])] as FeatureSlug[]

      setSubscription({
        ...data,
        features
      } as Subscription)

      setLoading(false)

    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err as Error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscription()

    // Subscribe to real-time changes (billing schema)
    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'billing',
        table: 'subscriptions'
      }, (payload) => {
        console.log('Subscription updated:', payload)
        fetchSubscription()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /** Has paid access: active/trialing, or canceled/past_due but still within current_period_end (Milestone 3). */
  const hasAccessUntilPeriodEnd = (): boolean => {
    if (!subscription) return false
    if (['active', 'trialing'].includes(subscription.status)) {
      if (subscription.status === 'trialing' && subscription.trial_end) {
        if (new Date() > new Date(subscription.trial_end)) return false
      }
      return true
    }
    // Allow access until current_period_end (e.g. canceled with cancel_at_period_end)
    if (subscription.current_period_end) {
      if (new Date() < new Date(subscription.current_period_end)) return true
    }
    return false
  }

  // Check if user can access a specific feature
  const canAccess = (featureSlug: FeatureSlug): boolean => {
    if (!subscription) return false
    if (!hasAccessUntilPeriodEnd()) return false
    return subscription.features.includes(featureSlug)
  }

  // Check if user has a specific plan active
  const isPlanActive = (planId: PlanId): boolean => {
    if (!subscription) return false
    return subscription.plan_id === planId && hasAccessUntilPeriodEnd()
  }

  // Check if a feature is currently accessible
  const isFeatureActive = (featureSlug: FeatureSlug): boolean => {
    return canAccess(featureSlug)
  }

  const value: SubscriptionContextValue = {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    canAccess,
    isPlanActive,
    isFeatureActive
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

// Hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
