# Quick Reference

**Common commands and code snippets**

---

## 🛠️ Setup Commands

```bash
# Initial setup
npm install
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-portal

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 🧪 Testing Commands

```bash
# Start local Supabase
supabase start

# Listen for Stripe webhooks (local)
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed

# Run tests
npm run test
npm run test:coverage

# Check database
supabase db shell
SELECT * FROM subscriptions;
```

---

## 📝 Common Code Patterns

### Wrap App with Provider

```tsx
// app/layout.tsx
import { SubscriptionProvider } from 'lovable-subscription-foundation'

export default function RootLayout({ children }) {
  return (
    <SubscriptionProvider
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
    >
      {children}
    </SubscriptionProvider>
  )
}
```

### Feature Gate

```tsx
import { SubscriptionGate } from 'lovable-subscription-foundation'

<SubscriptionGate slug="advanced-analytics">
  <AdvancedAnalytics />
</SubscriptionGate>
```

### Plan Gate

```tsx
import { PlanGate } from 'lovable-subscription-foundation'

<PlanGate plan="pro">
  <ProFeature />
</PlanGate>
```

### Check Access

```tsx
import { useSubscription } from 'lovable-subscription-foundation'

const { canAccess, subscription } = useSubscription()

if (canAccess('export-data')) {
  // User can export
}

if (subscription?.plan_id === 'enterprise') {
  // Enterprise user
}
```

### Create Checkout

```tsx
import { createClient } from '@supabase/supabase-js'
import { PRICING_CONFIG } from 'lovable-subscription-foundation'

const supabase = createClient(...)
const plan = PRICING_CONFIG.plans.pro

const { data } = await supabase.functions.invoke('create-checkout', {
  body: {
    price_id: plan.stripePriceId,
    success_url: `${window.location.origin}/success`,
    cancel_url: window.location.href
  }
})

window.location.href = data.session_url
```

### Open Customer Portal

```tsx
const { data } = await supabase.functions.invoke('create-portal', {
  body: {
    return_url: window.location.href
  }
})

window.location.href = data.portal_url
```

---

## ➕ Add New Feature

**3-step process:**

1. **pricing.ts - Add feature:**
```typescript
'new-feature': {
  name: 'New Feature',
  description: 'Description here',
  plans: ['pro', 'enterprise']
}
```

2. **pricing.ts - Add to plans:**
```typescript
pro: {
  features: [..., 'new-feature']
}
```

3. **Component - Use it:**
```tsx
<SubscriptionGate slug="new-feature">
  <NewFeatureComponent />
</SubscriptionGate>
```

---

## 🔍 Debugging

### Check Subscription State

```tsx
const { subscription, loading, error } = useSubscription()

console.log({
  plan: subscription?.plan_id,
  status: subscription?.status,
  features: subscription?.features,
  loading,
  error
})
```

### View Webhook Logs

```bash
# Supabase logs
supabase functions logs stripe-webhook

# Stripe Dashboard
https://dashboard.stripe.com/webhooks
→ Click your endpoint
→ View recent deliveries
```

### Force Refetch Subscription

```tsx
const { refetch } = useSubscription()
await refetch()
```

---

## 🎨 Styling UpgradePrompt

```tsx
<SubscriptionGate
  slug="premium-feature"
  fallback={
    <UpgradePrompt
      featureSlug="premium-feature"
      className="my-custom-class"
      successUrl="/success?feature=premium"
    />
  }
>
  <PremiumFeature />
</SubscriptionGate>
```

---

## 📊 Check Plan in Pricing Config

```typescript
import { PRICING_CONFIG, getPlan, getFeature } from 'lovable-subscription-foundation'

// Get plan
const proPlan = getPlan('pro')
console.log(proPlan.price) // 29

// Get feature
const feature = getFeature('advanced-analytics')
console.log(feature.plans) // ['pro', 'enterprise']

// Check if plan includes feature
import { isPlanFeatureIncluded } from 'lovable-subscription-foundation'
const hasFeature = isPlanFeatureIncluded('pro', 'advanced-analytics')
```

---

## 🚨 Common Errors

### "useSubscription must be used within SubscriptionProvider"
**Fix:** Wrap your app with `<SubscriptionProvider>`

### "No subscription found"
**Fix:** User needs to sign up first (auth.users → subscriptions trigger)

### "Invalid price_id"
**Fix:** Update `stripePriceId` in `pricing.ts` to match Stripe Dashboard

### Webhook signature verification failed
**Fix:** Verify `STRIPE_WEBHOOK_SECRET` matches webhook in Stripe Dashboard

---

## 📁 File Locations

```
├── supabase/
│   ├── migrations/001_subscriptions_table.sql
│   └── functions/
│       ├── stripe-webhook/index.ts
│       ├── create-checkout/index.ts
│       └── create-portal/index.ts
├── src/
│   ├── config/pricing.ts
│   ├── components/
│   │   ├── SubscriptionProvider.tsx
│   │   ├── SubscriptionGate.tsx
│   │   ├── PlanGate.tsx
│   │   └── UpgradePrompt.tsx
│   └── index.ts
├── .cursorrules
├── .env.example
└── README.md
```

---

## 🔗 Quick Links

- [Full Setup Guide](./SETUP.md)
- [Architecture](./boilerplate/ARCHITECTURE.md)
- [Build Plan](./boilerplate/BUILD_PLAN.md)
- [Supabase Dashboard](https://app.supabase.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
