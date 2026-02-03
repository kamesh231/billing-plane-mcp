// Lovable Subscription Foundation
// Main export file

// Components
export { SubscriptionProvider, useSubscription } from './components/SubscriptionProvider'
export type {
  Subscription,
  SubscriptionContextValue,
  SubscriptionProviderProps
} from './components/SubscriptionProvider'

export { SubscriptionGate } from './components/SubscriptionGate'
export type { SubscriptionGateProps } from './components/SubscriptionGate'

export { PlanGate } from './components/PlanGate'
export type { PlanGateProps } from './components/PlanGate'

export { UpgradePrompt } from './components/UpgradePrompt'
export type { UpgradePromptProps } from './components/UpgradePrompt'

export {
  LicenseBadge,
  InlineLicenseBadge,
  FooterLicenseBadge
} from './components/LicenseBadge'
export type { LicenseBadgeProps } from './components/LicenseBadge'

// Configuration
export {
  PRICING_CONFIG,
  getPlan,
  getFeature,
  isPlanFeatureIncluded,
  getPlansWithFeature,
  getMinimumPlanForFeature
} from './config/pricing'

export type {
  PlanId,
  FeatureSlug,
  Plan,
  Feature
} from './config/pricing'

// License
export {
  LICENSE_CONFIG,
  hasProLicense,
  isFreeTier,
  getPurchaseUrl
} from './config/license'
