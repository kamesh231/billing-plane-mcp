# 🚀 Lovable Subscription Foundation

> **Stop burning AI credits on Stripe integration. Add subscription billing to your Lovable app in 15 minutes.**

Pre-built, production-ready subscription billing with Stripe and Supabase. Zero bugs. Zero configuration hell. Just copy, paste, and ship.

---

## 🎯 What is this?

A complete subscription billing boilerplate specifically designed for **Lovable users** (and other AI app builders). Stop wasting 500-2000 credits asking AI to implement Stripe webhooks, feature gating, and subscription state management.

This boilerplate gives you:

✅ **Supabase Edge Functions** - Webhook handler, checkout creator, customer portal
✅ **React SDK** - `<SubscriptionGate>`, `<PlanGate>`, `useSubscription()` hook
✅ **Database Schema** - Subscriptions table with RLS policies
✅ **Pricing Configuration** - Type-safe feature and plan definitions
✅ **`.cursorrules` Integration** - Lovable AI knows how to use it automatically
✅ **Production-Ready** - Handles trials, cancelations, payment failures, edge cases

---

## 🎯 Implementation Approach

**This project uses a milestone-based implementation designed for Cursor AI.**

✅ **10 milestones** - Each with clear outcome and verification
✅ **2.5-3 hours** - Complete implementation time
✅ **Testable** - Verify each step before moving forward
✅ **Reversible** - Rollback if something goes wrong

**Read:** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for complete instructions
**Follow:** [MILESTONES.md](./MILESTONES.md) for step-by-step implementation

### Quick Start with Cursor

```bash
# Open in Cursor
cursor .

# In Cursor chat, start Milestone 1:
@milestones /milestone-1
# Follow prompts...
```

---

## ⚡ Manual Setup (15 minutes)

### 1. Clone or Install

```bash
# Option A: Clone this repository
git clone https://github.com/yourusername/lovable-subscription-foundation
cd lovable-subscription-foundation

# Option B: Install as package (coming soon)
# npm install lovable-subscription-foundation
```

### 2. Set up Supabase

```bash
# Create a new Supabase project at https://supabase.com

# Initialize Supabase locally
supabase init

# Start local Supabase (optional, for testing)
supabase start

# Run migrations
supabase db push
```

### 3. Configure Stripe

```bash
# Create products in Stripe Dashboard:
# 1. Go to https://dashboard.stripe.com/products
# 2. Create "Pro" plan with monthly price
# 3. Create "Enterprise" plan with monthly price
# 4. Copy price IDs (price_xxx) to src/config/pricing.ts

# Set up webhook:
# 1. Go to https://dashboard.stripe.com/webhooks
# 2. Add endpoint: https://your-project.supabase.co/functions/v1/stripe-webhook
# 3. Select events: checkout.session.completed, customer.subscription.*, invoice.*
# 4. Copy webhook signing secret (whsec_...)
```

### 4. Set Environment Variables

```bash
# Copy example env file
cp .env.example .env.local

# Fill in your keys:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Set Supabase secrets (for Edge Functions)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-portal
```

### 6. Use in Your App

```tsx
// app/layout.tsx
import { SubscriptionProvider } from 'lovable-subscription-foundation'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SubscriptionProvider
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
        >
          {children}
        </SubscriptionProvider>
      </body>
    </html>
  )
}
```

```tsx
// app/analytics/page.tsx
import { SubscriptionGate } from 'lovable-subscription-foundation'

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>

      {/* Free tier */}
      <BasicAnalytics />

      {/* Pro tier */}
      <SubscriptionGate slug="advanced-analytics">
        <AdvancedAnalytics />
      </SubscriptionGate>
    </div>
  )
}
```

**Done! 🎉** Your app now has subscription billing.

---

## 🎨 Usage Examples

### Feature Gating

```tsx
import { SubscriptionGate } from 'lovable-subscription-foundation'

// Show feature only to users with access
<SubscriptionGate slug="export-data">
  <ExportButton />
</SubscriptionGate>

// Custom fallback
<SubscriptionGate
  slug="team-collaboration"
  fallback={<p>Upgrade to Pro for team features</p>}
>
  <TeamDashboard />
</SubscriptionGate>

// Hide when locked (for navigation)
<SubscriptionGate slug="advanced-analytics" hideWhenLocked>
  <NavItem href="/analytics">Advanced Analytics</NavItem>
</SubscriptionGate>
```

### Plan Gating

```tsx
import { PlanGate } from 'lovable-subscription-foundation'

// Restrict to specific plan
<PlanGate plan="pro">
  <ProFeature />
</PlanGate>

// Allow multiple plans
<PlanGate plan={['pro', 'enterprise']}>
  <PremiumFeature />
</PlanGate>
```

### Programmatic Access Checks

```tsx
import { useSubscription } from 'lovable-subscription-foundation'

function MyComponent() {
  const { subscription, canAccess, isPlanActive } = useSubscription()

  // Check feature access
  if (canAccess('advanced-analytics')) {
    return <AdvancedAnalytics />
  }

  // Check plan
  if (isPlanActive('enterprise')) {
    return <EnterpriseDashboard />
  }

  // Check status
  if (subscription?.status === 'trialing') {
    return <TrialBanner />
  }

  return <FreeTierDashboard />
}
```

### Pricing Page

```tsx
import { PRICING_CONFIG, createClient } from 'lovable-subscription-foundation'

export function PricingPage() {
  const supabase = createClient(...)

  async function handleUpgrade(planId: string) {
    const plan = PRICING_CONFIG.plans[planId]

    const { data } = await supabase.functions.invoke('create-checkout', {
      body: {
        price_id: plan.stripePriceId,
        success_url: `${window.location.origin}/success`,
        cancel_url: window.location.href
      }
    })

    window.location.href = data.session_url
  }

  return (
    <div>
      {Object.values(PRICING_CONFIG.plans).map(plan => (
        <PricingCard
          key={plan.id}
          plan={plan}
          onUpgrade={() => handleUpgrade(plan.id)}
        />
      ))}
    </div>
  )
}
```

### Customer Portal (Manage Subscription)

```tsx
import { createClient } from '@supabase/supabase-js'

export function SettingsPage() {
  const supabase = createClient(...)

  async function openCustomerPortal() {
    const { data } = await supabase.functions.invoke('create-portal', {
      body: {
        return_url: window.location.href
      }
    })

    window.location.href = data.portal_url
  }

  return (
    <div>
      <h1>Subscription Settings</h1>
      <button onClick={openCustomerPortal}>
        Manage Subscription
      </button>
    </div>
  )
}
```

---

## 🧩 Adding New Features

**It's a 3-step process:**

### 1. Add to pricing config

```typescript
// src/config/pricing.ts

export const PRICING_CONFIG = {
  // ...
  features: {
    'team-collaboration': {
      name: 'Team Collaboration',
      description: 'Invite team members to your workspace',
      plans: ['pro', 'enterprise']
    }
  }
}
```

### 2. Add to plan features

```typescript
// src/config/pricing.ts

pro: {
  features: [
    'basic-analytics',
    'advanced-analytics',
    'team-collaboration' // ← Add here
  ]
}
```

### 3. Use in your component

```tsx
<SubscriptionGate slug="team-collaboration">
  <TeamCollaboration />
</SubscriptionGate>
```

**No backend changes needed!** The webhook handler automatically syncs features from the pricing config.

---

## 🤖 Lovable AI Integration

This boilerplate includes a `.cursorrules` file that tells Lovable (and other AI assistants) how to use the subscription system.

**What this means:**

When you ask Lovable to "Add a premium feature for exporting data", it will:

1. ✅ Add the feature to `pricing.ts`
2. ✅ Assign it to the right plans
3. ✅ Use `<SubscriptionGate slug="export-data">` automatically
4. ✅ No trial and error needed

**Example:**

```
You: "Make the Export button require a Pro subscription"

Lovable: [Reads .cursorrules, generates this code automatically]

<SubscriptionGate slug="export-data">
  <button onClick={handleExport}>Export CSV</button>
</SubscriptionGate>
```

---

## 📊 Architecture

### System Flow

```
User Signs Up
    ↓
Supabase Auth creates user
    ↓
Database trigger creates subscription (plan: 'free', status: 'active')
    ↓
User clicks "Upgrade to Pro"
    ↓
Frontend calls create-checkout Edge Function
    ↓
Redirects to Stripe Checkout
    ↓
User pays
    ↓
Stripe sends webhook to stripe-webhook Edge Function
    ↓
Webhook updates subscriptions table (plan: 'pro', status: 'active')
    ↓
Frontend detects change via real-time subscription
    ↓
Pro features unlock automatically
```

### Database Schema

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  plan_id text DEFAULT 'free',
  status text DEFAULT 'active',
  -- ... (see supabase/migrations/001_subscriptions_table.sql)
)
```

### Edge Functions

1. **stripe-webhook** - Handles all Stripe events (checkout, subscription updates, payments)
2. **create-checkout** - Creates Stripe Checkout session for upgrades
3. **create-portal** - Creates Stripe Customer Portal for subscription management

---

## 🔒 Security

- ✅ **Row Level Security (RLS)** - Users can only read their own subscription
- ✅ **Webhook Signature Verification** - All Stripe webhooks verified
- ✅ **Service Role Keys** - Edge Functions use service_role (never exposed to frontend)
- ✅ **No Direct Stripe Calls** - Frontend never calls Stripe API directly

---

## 🧪 Testing

### Local Testing

```bash
# Start Supabase
supabase start

# Start Stripe CLI (in another terminal)
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
```

### Production Testing

1. Use Stripe test mode (keys start with `pk_test_` and `sk_test_`)
2. Test cards: `4242 4242 4242 4242` (Visa)
3. Test webhook events in Stripe Dashboard

---

## 📚 Documentation

- [Architecture Document](./boilerplate/ARCHITECTURE.md) - System design and data flow
- [Build Plan](./boilerplate/BUILD_PLAN.md) - Implementation roadmap
- [PRD](./boilerplate/PRD.md) - Product requirements

---

## 🎓 Learn More

### Stripe Resources

- [Stripe Billing Docs](https://stripe.com/docs/billing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

### Supabase Resources

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime)

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

---

## 💰 Monetization & Licensing

This boilerplate includes a built-in monetization strategy:

### Free Tier (MIT License)
- ✅ Full source code and features
- ✅ Use for **1 project**
- ✅ Shows "Powered by Lovable Subscription Foundation" badge
- ✅ Community support

**Badge Example:**
```tsx
import { LicenseBadge } from 'lovable-subscription-foundation'

<LicenseBadge />  // Shows in bottom-right corner
```

### Pro License ($49 one-time)
- ✅ Everything in Free
- ✅ **Remove license badge**
- ✅ **Unlimited projects**
- ✅ Commercial use allowed
- ✅ Email support (best-effort)
- ✅ Lifetime updates (1 year)

**To remove badge:**
```bash
# Add to .env.local:
NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE=true

# Badge automatically disappears ✨
```

### Badge Variants

```tsx
// Fixed position (default)
<LicenseBadge position="bottom-right" />

// Inline badge (for footers)
<InlineLicenseBadge />

// Footer badge (styled for page footer)
<FooterLicenseBadge />
```

**Purchase Pro License:** [Your Product Page]

---

## 📄 License

See [LICENSE](./LICENSE) for full details.

**Honor System:** License checking is client-side only (no tracking, respects privacy)

---

## 🚨 Troubleshooting

### Subscription not updating after payment

**Problem:** Paid but still shows free tier

**Solutions:**
1. Check Stripe webhook is configured: `https://your-project.supabase.co/functions/v1/stripe-webhook`
2. Verify `STRIPE_WEBHOOK_SECRET` is set in Supabase
3. Check webhook logs: `supabase functions logs stripe-webhook`
4. Ensure subscription includes `metadata: { user_id }`

### Features not unlocking

**Problem:** Upgraded but can't access Pro features

**Solutions:**
1. Check `pricing.ts` includes feature in plan's `features` array
2. Verify feature slug matches exactly (case-sensitive)
3. Confirm subscription status is `'active'` or `'trialing'`
4. Force refetch: `const { refetch } = useSubscription(); await refetch()`

### Checkout fails to open

**Problem:** Click upgrade button, nothing happens

**Solutions:**
1. Check browser console for errors
2. Verify Stripe price IDs in `pricing.ts` match Stripe dashboard
3. Ensure `STRIPE_SECRET_KEY` is set in Supabase secrets
4. Confirm user is authenticated (JWT token present)

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/lovable-subscription-foundation/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/lovable-subscription-foundation/discussions)
- **Email:** support@yourproduct.com (Pro license holders)

---

## ⭐ Credits

Built with:
- [Stripe](https://stripe.com) - Payment processing
- [Supabase](https://supabase.com) - Backend and database
- [React](https://react.dev) - UI components

Inspired by patterns from [Autumn](https://github.com/useautumn/autumn).

---

**Made with ❤️ for Lovable users**

Stop burning credits. Start shipping. 🚀
