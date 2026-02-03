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

      // Fetch subscription
      const { data, error: fetchError } = await supabase
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

    // Subscribe to real-time changes
    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
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

  // Check if user can access a specific feature
  const canAccess = (featureSlug: FeatureSlug): boolean => {
    if (!subscription) return false

    // Check if subscription is active or trialing
    if (!['active', 'trialing'].includes(subscription.status)) {
      return false
    }

    // Check if trial has ended (for trialing subscriptions)
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end)
      if (new Date() > trialEnd) {
        return false
      }
    }

    // Check if feature is included in plan
    return subscription.features.includes(featureSlug)
  }

  // Check if user has a specific plan active
  const isPlanActive = (planId: PlanId): boolean => {
    if (!subscription) return false
    return subscription.plan_id === planId && ['active', 'trialing'].includes(subscription.status)
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
