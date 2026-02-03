// Lovable Subscription Foundation
// Pricing Configuration
// This file defines all plans, features, and their relationships

export const PRICING_CONFIG = {
  plans: {
    free: {
      id: 'free',
      name: 'Free',
      description: 'Perfect for trying out the platform',
      price: 0,
      interval: null,
      stripePriceId: null,
      trialDays: 0,
      features: [
        'basic-analytics',
        'api-access-1k',
        'email-support'
      ],
      limits: {
        seats: 1,
        storage_gb: 1,
        api_calls_per_month: 1000,
      }
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      description: 'For growing teams and products',
      price: 29,
      interval: 'month' as const,
      stripePriceId: 'price_pro_monthly', // TODO: Replace with actual Stripe price ID
      trialDays: 14,
      features: [
        'basic-analytics',
        'advanced-analytics',
        'api-access-10k',
        'export-data',
        'priority-support',
        'custom-branding'
      ],
      limits: {
        seats: 5,
        storage_gb: 50,
        api_calls_per_month: 10000,
      },
      popular: true, // Show "Most Popular" badge
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large teams with advanced needs',
      price: 99,
      interval: 'month' as const,
      stripePriceId: 'price_enterprise_monthly', // TODO: Replace with actual Stripe price ID
      trialDays: 0,
      features: [
        'basic-analytics',
        'advanced-analytics',
        'api-access-unlimited',
        'export-data',
        'white-label',
        'dedicated-support',
        'sla-guarantee',
        'custom-branding',
        'priority-support'
      ],
      limits: {
        seats: -1, // Unlimited
        storage_gb: -1, // Unlimited
        api_calls_per_month: -1, // Unlimited
      }
    }
  },

  features: {
    'basic-analytics': {
      name: 'Basic Analytics',
      description: 'View essential usage metrics and trends',
      plans: ['free', 'pro', 'enterprise']
    },
    'advanced-analytics': {
      name: 'Advanced Analytics',
      description: 'Custom reports, cohort analysis, and insights',
      plans: ['pro', 'enterprise']
    },
    'api-access-1k': {
      name: '1K API Calls/month',
      description: 'Up to 1,000 API requests per month',
      plans: ['free']
    },
    'api-access-10k': {
      name: '10K API Calls/month',
      description: 'Up to 10,000 API requests per month',
      plans: ['pro']
    },
    'api-access-unlimited': {
      name: 'Unlimited API Calls',
      description: 'No limits on API usage',
      plans: ['enterprise']
    },
    'export-data': {
      name: 'Export Data',
      description: 'Download reports as CSV, PDF, or Excel',
      plans: ['pro', 'enterprise']
    },
    'white-label': {
      name: 'White Label',
      description: 'Remove all branding and use your own',
      plans: ['enterprise']
    },
    'custom-branding': {
      name: 'Custom Branding',
      description: 'Add your logo and brand colors',
      plans: ['pro', 'enterprise']
    },
    'email-support': {
      name: 'Email Support',
      description: 'Email support with 48-hour response time',
      plans: ['free', 'pro', 'enterprise']
    },
    'priority-support': {
      name: 'Priority Support',
      description: 'Priority email support with 24-hour response',
      plans: ['pro', 'enterprise']
    },
    'dedicated-support': {
      name: 'Dedicated Support',
      description: 'Dedicated Slack channel and 4-hour response SLA',
      plans: ['enterprise']
    },
    'sla-guarantee': {
      name: '99.9% SLA',
      description: 'Uptime guarantee with service credits',
      plans: ['enterprise']
    }
  }
} as const

// TypeScript types
export type PlanId = keyof typeof PRICING_CONFIG.plans
export type FeatureSlug = keyof typeof PRICING_CONFIG.features

export type Plan = typeof PRICING_CONFIG.plans[PlanId]
export type Feature = typeof PRICING_CONFIG.features[FeatureSlug]

// Helper functions
export function getPlan(planId: PlanId): Plan {
  return PRICING_CONFIG.plans[planId]
}

export function getFeature(featureSlug: FeatureSlug): Feature {
  return PRICING_CONFIG.features[featureSlug]
}

export function isPlanFeatureIncluded(planId: PlanId, featureSlug: FeatureSlug): boolean {
  const feature = getFeature(featureSlug)
  return (feature.plans as readonly PlanId[]).includes(planId)
}

export function getPlansWithFeature(featureSlug: FeatureSlug): PlanId[] {
  const feature = getFeature(featureSlug)
  return [...feature.plans] as PlanId[]
}

// Get the minimum plan that includes a feature
export function getMinimumPlanForFeature(featureSlug: FeatureSlug): PlanId {
  const plans = getPlansWithFeature(featureSlug)
  const planOrder: PlanId[] = ['free', 'pro', 'enterprise']

  for (const planId of planOrder) {
    if (plans.includes(planId)) {
      return planId
    }
  }

  return 'pro' // Fallback
}
