// Lovable Subscription Foundation
// UpgradePrompt: UI component shown when user tries to access locked features
// Provides one-click upgrade flow

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PRICING_CONFIG, PlanId, FeatureSlug, getMinimumPlanForFeature } from '../config/pricing'

export interface UpgradePromptProps {
  /**
   * Feature that triggered this prompt (optional)
   */
  featureSlug?: FeatureSlug

  /**
   * Required plan (optional, overrides featureSlug)
   */
  requiredPlan?: PlanId

  /**
   * Success URL after checkout
   * Default: current page
   */
  successUrl?: string

  /**
   * Cancel URL
   * Default: current page
   */
  cancelUrl?: string

  /**
   * Supabase client (required for calling Edge Functions)
   */
  supabaseUrl?: string
  supabaseAnonKey?: string

  /**
   * Custom className for styling
   */
  className?: string
}

export function UpgradePrompt({
  featureSlug,
  requiredPlan,
  successUrl,
  cancelUrl,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  className = ''
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine which plan to upgrade to
  let targetPlanId: PlanId
  if (requiredPlan) {
    targetPlanId = requiredPlan
  } else if (featureSlug) {
    targetPlanId = getMinimumPlanForFeature(featureSlug)
  } else {
    targetPlanId = 'pro' // Default fallback
  }

  const targetPlan = PRICING_CONFIG.plans[targetPlanId]
  const feature = featureSlug ? PRICING_CONFIG.features[featureSlug] : null

  async function handleUpgrade() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // Call create-checkout Edge Function
      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout', {
        body: {
          price_id: targetPlan.stripePriceId,
          success_url: successUrl || window.location.href,
          cancel_url: cancelUrl || window.location.href,
          trial_period_days: targetPlan.trialDays || 0
        }
      })

      if (invokeError) throw invokeError

      if (!data?.session_url) {
        throw new Error('No session URL returned')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.session_url

    } catch (err) {
      console.error('Upgrade error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start upgrade process')
      setLoading(false)
    }
  }

  return (
    <div className={`
      border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50
      ${className}
    `}>
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {feature ? feature.name : 'Premium Feature'}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          {feature
            ? feature.description
            : `Upgrade to ${targetPlan.name} to unlock this feature`}
        </p>

        {/* Plan info */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Upgrade to</div>
          <div className="text-2xl font-bold text-gray-900">
            {targetPlan.name}
          </div>
          {targetPlan.price > 0 && (
            <div className="text-lg text-gray-600 mt-1">
              ${targetPlan.price}
              <span className="text-sm text-gray-500">/{targetPlan.interval}</span>
            </div>
          )}
          {targetPlan.trialDays && targetPlan.trialDays > 0 && (
            <div className="text-sm text-green-600 mt-2">
              {targetPlan.trialDays}-day free trial
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Upgrade button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="
            w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading...
            </span>
          ) : (
            <>
              Upgrade to {targetPlan.name}
              {targetPlan.trialDays && targetPlan.trialDays > 0 && ' - Start Free Trial'}
            </>
          )}
        </button>

        {/* Fine print */}
        <p className="text-xs text-gray-500 mt-4">
          You can cancel anytime. No credit card required for trial.
        </p>
      </div>
    </div>
  )
}
