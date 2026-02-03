# Lovable Subscription Foundation - Build Plan

**Version:** 1.0
**Last Updated:** 2026-02-03
**Estimated Timeline:** 2-3 weeks
**Status:** Ready to Execute

---

## 🎯 Overview

**Goal:** Build a production-ready subscription billing boilerplate in 2-3 weeks

**Approach:**
1. **Week 1:** Core infrastructure (database, Edge Functions, Stripe integration)
2. **Week 2:** React SDK, example app, testing
3. **Week 3:** Documentation, polish, launch prep

**Key Principle:** Ship working code every day, test continuously

---

## 📅 Week-by-Week Breakdown

### Week 1: Core Infrastructure (Days 1-7)

**Goal:** Database + Edge Functions + Stripe integration working end-to-end

#### Day 1: Project Setup & Database Schema

**Morning: Project Scaffolding (2-3 hours)**
```bash
# Create Supabase project
supabase init

# Project structure
mkdir -p supabase/migrations
mkdir -p supabase/functions/{stripe-webhook,create-checkout,create-portal}
mkdir -p src/{components,hooks,config}
mkdir -p example-app
```

**Files to create:**
- `supabase/config.toml` - Supabase configuration
- `package.json` - Dependencies
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules

**Afternoon: Database Schema (2-3 hours)**

**File: `supabase/migrations/001_subscriptions_table.sql`**
```sql
-- Create subscriptions table
-- Auto-create subscription on user signup
-- RLS policies
-- Indexes
-- Triggers (updated_at, on_auth_user_created)
```

**Testing:**
```bash
# Start local Supabase
supabase start

# Apply migration
supabase db reset

# Verify:
# 1. Table exists with correct columns
# 2. RLS policies active
# 3. Trigger creates subscription on user insert
# 4. Indexes exist

# Test script:
psql postgresql://postgres:postgres@localhost:54322/postgres <<EOF
-- Insert test user
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test@example.com');
-- Check if subscription auto-created
SELECT * FROM public.subscriptions;
EOF
```

**Success criteria:**
- ✅ Migration runs without errors
- ✅ RLS policies prevent unauthorized access
- ✅ Trigger auto-creates subscription
- ✅ Updated_at auto-updates on changes

---

#### Day 2: Pricing Configuration & Types

**Morning: Pricing Config (2 hours)**

**File: `src/config/pricing.ts`**
```typescript
export const PRICING_CONFIG = {
  plans: {
    free: { /* ... */ },
    pro: { /* ... */ },
    enterprise: { /* ... */ }
  },
  features: {
    'basic-analytics': { /* ... */ },
    'advanced-analytics': { /* ... */ },
    // ... all features
  }
}

export type PlanId = keyof typeof PRICING_CONFIG.plans
export type FeatureSlug = keyof typeof PRICING_CONFIG.features
```

**Testing:**
```typescript
// Test: All plans have valid features
Object.values(PRICING_CONFIG.plans).forEach(plan => {
  plan.features.forEach(featureSlug => {
    assert(PRICING_CONFIG.features[featureSlug], `Feature ${featureSlug} not defined`)
  })
})
```

**Afternoon: Study Autumn Patterns (3-4 hours)**

**Tasks:**
1. Clone Autumn repository:
```bash
git clone https://github.com/useautumn/autumn /tmp/autumn
```

2. Study these files:
   - `server/src/external/stripe/webhooks/customer.subscription.updated.ts`
   - `server/src/external/stripe/webhooks/invoice.paid.ts`
   - `server/src/core/entitlements/check.ts`
   - `server/src/routes/attach/create-checkout.ts`

3. **Document patterns** (create `AUTUMN_PATTERNS.md`):
   - How they extract metadata from webhooks
   - How they handle idempotency
   - How they calculate feature access
   - How they handle race conditions
   - Edge cases they cover

**Success criteria:**
- ✅ Pricing config complete with all features
- ✅ Types export correctly
- ✅ Autumn patterns documented
- ✅ Understand webhook flow completely

---

#### Day 3: Stripe Webhook Handler (Part 1)

**Morning: Webhook Skeleton (2 hours)**

**File: `supabase/functions/stripe-webhook/index.ts`**

Create basic structure:
```typescript
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  // 1. Verify signature
  // 2. Parse event
  // 3. Route to handler
  // 4. Return 200
})
```

**Afternoon: Implement Event Handlers (3-4 hours)**

Implement handlers for:
1. `checkout.session.completed`
2. `customer.subscription.updated`
3. `customer.subscription.deleted`
4. `invoice.paid`
5. `invoice.payment_failed`

**Testing:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local Edge Function
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed

# Verify database updates
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT * FROM subscriptions"
```

**Success criteria:**
- ✅ Signature verification works
- ✅ All 5 event types handled
- ✅ Database updates correctly for each event
- ✅ Idempotency prevents duplicate processing
- ✅ Error handling returns proper status codes

---

#### Day 4: Stripe Webhook Handler (Part 2) + Testing

**Morning: Edge Cases (2-3 hours)**

Handle edge cases from Autumn study:
1. **Race conditions:** Webhook arrives before user_id exists
2. **Missing metadata:** Fallback to customer email lookup
3. **Partial updates:** Only update changed fields
4. **Trial → Paid transition:** Handle correctly
5. **Immediate cancelation vs cancel_at_period_end**

**Afternoon: Integration Testing (3-4 hours)**

**Create: `tests/webhook-integration.test.ts`**

Test scenarios:
```typescript
describe('Webhook Integration', () => {
  test('new subscription creates record', async () => {
    // Create user
    // Trigger checkout.session.completed
    // Verify subscription created with correct plan
  })

  test('payment failure moves to past_due', async () => {
    // Create active subscription
    // Trigger invoice.payment_failed
    // Verify status = 'past_due'
  })

  test('successful retry moves back to active', async () => {
    // Create past_due subscription
    // Trigger invoice.paid
    // Verify status = 'active'
  })

  test('duplicate events are idempotent', async () => {
    // Trigger same event twice
    // Verify only processed once
  })

  // ... 10+ more test cases
})
```

Run tests:
```bash
deno test tests/webhook-integration.test.ts --allow-net --allow-env
```

**Success criteria:**
- ✅ All edge cases handled
- ✅ 15+ integration tests passing
- ✅ No flaky tests
- ✅ Webhook handles malformed events gracefully

---

#### Day 5: Create-Checkout Edge Function

**Morning: Implementation (2 hours)**

**File: `supabase/functions/create-checkout/index.ts`**

```typescript
Deno.serve(async (req) => {
  // 1. Authenticate user (JWT)
  // 2. Parse request body
  // 3. Get/create Stripe customer
  // 4. Create Checkout session with metadata
  // 5. Return session URL
})
```

**Afternoon: Testing (2-3 hours)**

**Create: `tests/create-checkout.test.ts`**

Test scenarios:
```typescript
test('creates checkout session for new customer', async () => {
  // Call Edge Function
  // Verify Stripe customer created
  // Verify session created with correct metadata
})

test('reuses existing customer', async () => {
  // User already has stripe_customer_id
  // Verify no duplicate customer
})

test('includes trial period if specified', async () => {
  // Pass trial_period_days: 14
  // Verify subscription_data.trial_period_days set
})

test('rejects unauthenticated requests', async () => {
  // No JWT
  // Verify 401 response
})
```

**Manual testing:**
```bash
# Start local Edge Function
supabase functions serve create-checkout

# Call with curl
curl -X POST http://localhost:54321/functions/v1/create-checkout \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "price_id": "price_pro_monthly",
    "success_url": "http://localhost:3000/success",
    "cancel_url": "http://localhost:3000/cancel"
  }'

# Click returned URL, complete checkout
# Verify webhook fires and updates database
```

**Success criteria:**
- ✅ Checkout session created successfully
- ✅ Metadata passed correctly
- ✅ Trial period works
- ✅ Existing customers reused
- ✅ All tests passing

---

#### Day 6: Create-Portal Edge Function

**Morning: Implementation (1 hour)**

**File: `supabase/functions/create-portal/index.ts`**

```typescript
Deno.serve(async (req) => {
  // 1. Authenticate user
  // 2. Get stripe_customer_id from database
  // 3. Create portal session
  // 4. Return portal URL
})
```

**Afternoon: Deploy to Supabase (2 hours)**

```bash
# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...

# Deploy functions
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-portal

# Verify deployment
curl https://<project>.supabase.co/functions/v1/stripe-webhook -I
# Should return 405 (Method Not Allowed) - means it's running
```

**Configure Stripe Webhook:**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://<project>.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook signing secret
5. Update Supabase secret: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

**Testing:**
```bash
# Trigger test payment in Stripe Dashboard
# → Verify webhook received
# → Verify database updated
# → Check Supabase logs: supabase functions logs stripe-webhook
```

**Success criteria:**
- ✅ All 3 Edge Functions deployed
- ✅ Stripe webhook configured
- ✅ Test payment processes correctly
- ✅ Database updates in real-time

---

#### Day 7: Week 1 Wrap-up & Buffer

**Morning: End-to-End Test (2 hours)**

Complete user flow:
1. Sign up new user
2. Call create-checkout
3. Complete payment in Stripe
4. Verify webhook updates database
5. Call create-portal
6. Cancel subscription in portal
7. Verify webhook updates database

**Afternoon: Fix Issues + Documentation (3 hours)**

- Fix any bugs found in E2E test
- Document setup process (for future reference)
- Create `WEEK1_CHECKLIST.md` with completion status

**Success criteria:**
- ✅ Complete subscription lifecycle works
- ✅ Zero critical bugs
- ✅ All Edge Functions deployed and tested
- ✅ Ready to build React SDK

---

### Week 2: React SDK & Example App (Days 8-14)

#### Day 8: SubscriptionProvider Context

**Morning: Implementation (2-3 hours)**

**File: `src/components/SubscriptionProvider.tsx`**

```typescript
export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch subscription
    // Subscribe to real-time updates
  }, [])

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, canAccess, isPlanActive }}>
      {children}
    </SubscriptionContext.Provider>
  )
}
```

**Afternoon: Testing (2-3 hours)**

**Create: `tests/SubscriptionProvider.test.tsx`**

```typescript
import { render, waitFor } from '@testing-library/react'
import { SubscriptionProvider, useSubscription } from './SubscriptionProvider'

test('fetches subscription on mount', async () => {
  // Mock Supabase client
  // Render provider
  // Verify fetch called
  // Verify subscription set
})

test('real-time updates trigger re-fetch', async () => {
  // Mock real-time subscription
  // Trigger update event
  // Verify subscription re-fetched
})

test('canAccess returns false for inactive subscription', () => {
  // Set subscription status = 'canceled'
  // Verify canAccess('pro-feature') = false
})
```

**Success criteria:**
- ✅ Context fetches subscription correctly
- ✅ Real-time updates work
- ✅ canAccess() logic correct
- ✅ All tests passing

---

#### Day 9: SubscriptionGate & PlanGate Components

**Morning: Implementation (2 hours)**

**File: `src/components/SubscriptionGate.tsx`**
```typescript
export function SubscriptionGate({ slug, children, fallback }) {
  const { canAccess, loading } = useSubscription()
  if (loading) return <div>Loading...</div>
  if (canAccess(slug)) return <>{children}</>
  return <>{fallback || <UpgradePrompt featureSlug={slug} />}</>
}
```

**File: `src/components/PlanGate.tsx`**
```typescript
export function PlanGate({ plan, children, fallback }) {
  const { subscription, loading } = useSubscription()
  if (loading) return <div>Loading...</div>
  const allowedPlans = Array.isArray(plan) ? plan : [plan]
  if (subscription && allowedPlans.includes(subscription.plan_id)) {
    return <>{children}</>
  }
  return <>{fallback || <UpgradePrompt requiredPlan={allowedPlans[0]} />}</>
}
```

**Afternoon: UpgradePrompt Component (2-3 hours)**

**File: `src/components/UpgradePrompt.tsx`**

```typescript
export function UpgradePrompt({ featureSlug, requiredPlan }) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade(planId) {
    // Call create-checkout Edge Function
    // Redirect to Stripe Checkout
  }

  return (
    <div className="upgrade-prompt">
      <h3>Premium Feature</h3>
      <p>Upgrade to unlock this feature</p>
      <button onClick={() => handleUpgrade('pro')}>
        Upgrade to Pro
      </button>
    </div>
  )
}
```

**Testing:**
```typescript
test('SubscriptionGate shows children when access granted', () => {
  // Mock canAccess = true
  // Render <SubscriptionGate slug="pro-feature"><div>Content</div></SubscriptionGate>
  // Verify "Content" rendered
})

test('SubscriptionGate shows fallback when access denied', () => {
  // Mock canAccess = false
  // Verify UpgradePrompt shown
})

test('UpgradePrompt calls create-checkout on click', async () => {
  // Mock supabase.functions.invoke
  // Click upgrade button
  // Verify function called with correct params
})
```

**Success criteria:**
- ✅ All 3 components implemented
- ✅ Feature gating works correctly
- ✅ Upgrade flow triggers checkout
- ✅ Tests passing

---

#### Day 10: Example App Scaffolding

**Morning: Next.js Setup (2 hours)**

```bash
cd example-app
npx create-next-app@latest . --typescript --tailwind --app
```

**Install dependencies:**
```bash
npm install @supabase/supabase-js
npm install ../src # Link to SDK (or publish to npm later)
```

**Create pages:**
- `app/page.tsx` - Landing page with pricing
- `app/dashboard/page.tsx` - Protected dashboard
- `app/settings/page.tsx` - Subscription management
- `app/analytics/page.tsx` - Feature-gated analytics

**Afternoon: Supabase Integration (2-3 hours)**

**File: `lib/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**File: `app/layout.tsx`**
```typescript
import { SubscriptionProvider } from '../src/components/SubscriptionProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SubscriptionProvider>
          {children}
        </SubscriptionProvider>
      </body>
    </html>
  )
}
```

**Success criteria:**
- ✅ Next.js app running
- ✅ Supabase configured
- ✅ SubscriptionProvider wraps app
- ✅ Basic pages created

---

#### Day 11: Example App - Feature Gating Demo

**Morning: Analytics Page (Gated) (2 hours)**

**File: `app/analytics/page.tsx`**
```tsx
import { SubscriptionGate } from '@/src/components/SubscriptionGate'

export default function AnalyticsPage() {
  return (
    <div>
      <h1>Analytics</h1>

      {/* Basic analytics - free tier */}
      <div>
        <h2>Basic Analytics</h2>
        <p>Total users: 1,234</p>
      </div>

      {/* Advanced analytics - Pro tier */}
      <SubscriptionGate slug="advanced-analytics">
        <div>
          <h2>Advanced Analytics</h2>
          <LineChart data={...} />
          <PieChart data={...} />
        </div>
      </SubscriptionGate>
    </div>
  )
}
```

**Afternoon: Settings Page (Subscription Management) (2-3 hours)**

**File: `app/settings/page.tsx`**
```tsx
import { useSubscription } from '@/src/components/SubscriptionProvider'
import { createClient } from '@supabase/supabase-js'

export default function SettingsPage() {
  const { subscription, loading } = useSubscription()
  const supabase = createClient(...)

  async function openCustomerPortal() {
    const { data } = await supabase.functions.invoke('create-portal', {
      body: { return_url: window.location.href }
    })
    window.location.href = data.portal_url
  }

  return (
    <div>
      <h1>Subscription Settings</h1>

      <p>Current plan: {subscription?.plan_id}</p>
      <p>Status: {subscription?.status}</p>

      {subscription?.status === 'active' && (
        <button onClick={openCustomerPortal}>
          Manage Subscription
        </button>
      )}

      {subscription?.plan_id === 'free' && (
        <button onClick={() => window.location.href = '/pricing'}>
          Upgrade to Pro
        </button>
      )}
    </div>
  )
}
```

**Success criteria:**
- ✅ Feature gating works in real app
- ✅ Settings page shows subscription details
- ✅ Customer portal link works
- ✅ Upgrade flow works

---

#### Day 12: Example App - Pricing Page

**Morning: Pricing Page UI (2-3 hours)**

**File: `app/pricing/page.tsx`**
```tsx
import { PRICING_CONFIG } from '@/src/config/pricing'
import { createClient } from '@supabase/supabase-js'

export default function PricingPage() {
  const supabase = createClient(...)

  async function handleUpgrade(planId: string) {
    const plan = PRICING_CONFIG.plans[planId]
    const { data } = await supabase.functions.invoke('create-checkout', {
      body: {
        price_id: plan.stripePriceId,
        success_url: `${window.location.origin}/success`,
        cancel_url: window.location.href,
        trial_period_days: plan.trialDays
      }
    })
    window.location.href = data.session_url
  }

  return (
    <div className="pricing-grid">
      {Object.values(PRICING_CONFIG.plans).map(plan => (
        <PricingCard
          key={plan.id}
          plan={plan}
          features={plan.features.map(slug => PRICING_CONFIG.features[slug])}
          onUpgrade={() => handleUpgrade(plan.id)}
        />
      ))}
    </div>
  )
}
```

**Afternoon: Success/Cancel Pages (1-2 hours)**

**File: `app/success/page.tsx`**
```tsx
export default function SuccessPage() {
  useEffect(() => {
    // Poll for subscription update
    // Show success message when detected
  }, [])

  return (
    <div>
      <h1>Welcome to Pro! 🎉</h1>
      <p>Your subscription is being activated...</p>
    </div>
  )
}
```

**File: `app/cancel/page.tsx`**
```tsx
export default function CancelPage() {
  return (
    <div>
      <h1>Upgrade Canceled</h1>
      <p>No charges were made. You can upgrade anytime.</p>
      <a href="/pricing">View Plans</a>
    </div>
  )
}
```

**Success criteria:**
- ✅ Pricing page displays all plans
- ✅ Upgrade flow works end-to-end
- ✅ Success page detects subscription activation
- ✅ Cancel page provides clear next steps

---

#### Day 13: .cursorrules Integration

**Morning: Create .cursorrules (1 hour)**

**File: `.cursorrules`**
```json
{
  "subscriptions": {
    "provider": "lovable-subscription-foundation",
    "config_file": "./config/pricing.ts",
    "instructions": {
      "feature_gating": {
        "rule": "Always use <SubscriptionGate slug='feature-name'> component.",
        "example": "<SubscriptionGate slug=\"advanced-analytics\"><AdvancedAnalytics /></SubscriptionGate>"
      },
      "available_features": [
        "basic-analytics",
        "advanced-analytics",
        "api-access-1k",
        "api-access-10k",
        "export-data"
      ]
    }
  }
}
```

**Afternoon: Test with Lovable/Cursor (3-4 hours)**

**Scenario 1:** Ask AI to "Add a new premium feature: Team Collaboration"

**Expected:** AI should:
1. Add to `config/pricing.ts`
2. Update plan features
3. Use `<SubscriptionGate slug="team-collaboration">`

**Scenario 2:** Ask AI to "Lock the Export button behind Pro plan"

**Expected:** AI should:
```tsx
<SubscriptionGate slug="export-data">
  <button onClick={handleExport}>Export CSV</button>
</SubscriptionGate>
```

**Scenario 3:** Ask AI to "Create a Pro-only dashboard"

**Expected:**
```tsx
<PlanGate plan="pro">
  <ProDashboard />
</PlanGate>
```

**Success criteria:**
- ✅ .cursorrules follows documented format
- ✅ AI correctly interprets rules
- ✅ AI uses components correctly
- ✅ No manual intervention needed

---

#### Day 14: Week 2 Wrap-up & Testing

**Morning: Integration Testing (2-3 hours)**

Test complete flow:
1. Sign up new user
2. Browse app (free tier)
3. Attempt to access Pro feature → see upgrade prompt
4. Click upgrade → checkout → payment
5. Return to app → Pro features unlocked
6. Go to settings → open customer portal → cancel
7. Features locked again

**Afternoon: Bug Fixes & Polish (3-4 hours)**

- Fix any UX issues
- Improve loading states
- Add error handling
- Polish upgrade prompts
- Create `WEEK2_CHECKLIST.md`

**Success criteria:**
- ✅ Complete user flow works perfectly
- ✅ Zero critical bugs
- ✅ React SDK production-ready
- ✅ Example app deployable

---

### Week 3: Documentation, Polish & Launch (Days 15-21)

#### Day 15: README & Setup Guide

**File: `README.md`** (2-3 hours)

**Sections:**
1. **What is this?**
   - 2-paragraph pitch
   - Key features
   - Who it's for

2. **Quick Start (15 minutes)**
   - Step-by-step setup
   - Environment variables
   - Deploy commands

3. **How it works**
   - Architecture diagram
   - Data flow
   - State machine

4. **Usage Examples**
   - SubscriptionGate
   - PlanGate
   - useSubscription hook

5. **Deployment**
   - Vercel
   - Netlify
   - Supabase

**File: `SETUP.md`** (1-2 hours)

Detailed setup guide:
1. Create Supabase project
2. Create Stripe account
3. Configure webhook
4. Deploy Edge Functions
5. Deploy example app
6. Test payment flow

**Success criteria:**
- ✅ README clear and comprehensive
- ✅ Setup guide step-by-step (15 min target)
- ✅ All links work
- ✅ Screenshots included

---

#### Day 16: API Reference & Troubleshooting

**File: `API_REFERENCE.md`** (2-3 hours)

Document:
- `SubscriptionProvider` props
- `SubscriptionGate` props
- `PlanGate` props
- `useSubscription()` return values
- `PRICING_CONFIG` structure
- Edge Function endpoints
- Database schema

**File: `TROUBLESHOOTING.md`** (2-3 hours)

Common issues:
- "Webhook not receiving events" → Check signature
- "Subscription not updating" → Check RLS policies
- "User can't upgrade" → Check Stripe keys
- "Features not unlocking" → Check pricing config
- "Portal not opening" → Check customer_id

**Success criteria:**
- ✅ All public APIs documented
- ✅ 15+ troubleshooting scenarios
- ✅ Clear solutions for each issue

---

#### Day 17: Video Walkthrough

**Morning: Script & Recording (3-4 hours)**

**Video structure (10 minutes):**
1. **Intro (1 min):** What it is, why you need it
2. **Setup (3 min):** Clone → Configure → Deploy
3. **Usage (3 min):** Add feature gate, test upgrade flow
4. **Lovable integration (2 min):** .cursorrules demo
5. **Outro (1 min):** Next steps, GitHub link

**Tools:**
- Loom or OBS for recording
- Edit in iMovie/Premiere

**Afternoon: Thumbnail & Upload (1-2 hours)**

- Create thumbnail in Figma
- Upload to YouTube
- Add to README

**Success criteria:**
- ✅ 10-minute walkthrough recorded
- ✅ Clear audio and video
- ✅ All steps shown working
- ✅ Uploaded and linked

---

#### Day 18: Example Projects & Showcase

**Morning: Create 3 Example Projects (3-4 hours)**

**Example 1: SaaS Analytics Dashboard**
- Free: Basic charts
- Pro: Advanced reports, export
- Enterprise: API access, white-label

**Example 2: Content Platform**
- Free: 10 posts/month
- Pro: Unlimited posts, analytics
- Enterprise: Multi-user, custom domain

**Example 3: API Service**
- Free: 1K calls/month
- Pro: 10K calls/month
- Enterprise: Unlimited + priority

**Afternoon: Deploy Examples (2 hours)**

Deploy to:
- Vercel
- Add to README as live demos

**Success criteria:**
- ✅ 3 working examples deployed
- ✅ Each demonstrates different use case
- ✅ Links in README

---

#### Day 19: Testing & QA

**Morning: Beta Testing (2-3 hours)**

Recruit 3-5 beta testers:
- Post in Lovable Discord
- Ask to set up from README
- Track time to completion
- Note friction points

**Afternoon: Fix Issues (3-4 hours)**

Based on feedback:
- Clarify confusing steps
- Fix setup bugs
- Improve error messages
- Update documentation

**Success criteria:**
- ✅ 5 beta testers complete setup
- ✅ Average setup time < 20 minutes
- ✅ All reported issues fixed
- ✅ 4+ star feedback

---

#### Day 20: Polish & Licensing

**Morning: Code Cleanup (2-3 hours)**

- Remove console.logs
- Add JSDoc comments
- Consistent formatting (Prettier)
- Remove unused code
- Add TypeScript strict mode

**File: `LICENSE`**
```
MIT License (for free version)
```

**File: `COMMERCIAL_LICENSE.md`**
```
Commercial License Terms:
- $49 one-time payment
- Unlimited projects
- Commercial use allowed
- 1 year of updates
```

**Afternoon: Prepare for Gumroad (2-3 hours)**

1. **Create product listing:**
   - Title: "Lovable Subscription Foundation - Pro License"
   - Price: $49
   - Description: (sales copy)
   - Files: ZIP with full source

2. **Create landing page:**
   - Hosted on Vercel
   - Stripe pricing table
   - Testimonials (from beta)
   - Live demo link

**Success criteria:**
- ✅ Code polished and production-ready
- ✅ License files clear
- ✅ Gumroad product created
- ✅ Landing page deployed

---

#### Day 21: Launch!

**Morning: Final Checks (2 hours)**

Checklist:
- [ ] README complete
- [ ] All tests passing
- [ ] Example app deployed
- [ ] Video uploaded
- [ ] Gumroad ready
- [ ] Twitter thread drafted
- [ ] Show HN post drafted
- [ ] Lovable Discord post drafted

**Afternoon: Launch (2-3 hours)**

1. **Push to GitHub:**
```bash
git tag v1.0.0
git push origin main --tags
```

2. **Post on Indie Hackers:**
   - Title: "Show IH: Lovable Subscription Foundation - Add Stripe billing in 15 min"
   - Body: Problem → Solution → Demo → Link

3. **Post on Lovable Discord:**
   - #show-and-tell channel
   - "Built a boilerplate to add Stripe subscriptions to Lovable apps in 15 min"

4. **Twitter thread:**
   - Problem (burn credits)
   - Solution (boilerplate)
   - Demo video
   - Free + Pro links

**Evening: Monitor & Respond (2 hours)**

- Reply to all comments
- Fix any urgent issues
- Track analytics
- Celebrate! 🎉

**Success criteria:**
- ✅ Launched publicly
- ✅ Posted on 3+ platforms
- ✅ Getting signups
- ✅ First sale! 💰

---

## 📋 File-by-File Implementation Checklist

### Database & Migrations
- [ ] `supabase/config.toml` - Supabase configuration
- [ ] `supabase/migrations/001_subscriptions_table.sql` - Main table + RLS
- [ ] `supabase/seed.sql` - Test data (optional)

### Edge Functions
- [ ] `supabase/functions/stripe-webhook/index.ts` - Webhook handler
- [ ] `supabase/functions/create-checkout/index.ts` - Checkout session creator
- [ ] `supabase/functions/create-portal/index.ts` - Customer portal
- [ ] `supabase/functions/_shared/stripe.ts` - Shared Stripe utilities

### React SDK (Core)
- [ ] `src/config/pricing.ts` - Pricing configuration
- [ ] `src/components/SubscriptionProvider.tsx` - Context provider
- [ ] `src/components/SubscriptionGate.tsx` - Feature gate component
- [ ] `src/components/PlanGate.tsx` - Plan gate component
- [ ] `src/components/UpgradePrompt.tsx` - Upgrade UI
- [ ] `src/hooks/useSubscription.ts` - Hook (re-export from provider)
- [ ] `src/index.ts` - Main export file

### React SDK (Types)
- [ ] `src/types/subscription.ts` - TypeScript types
- [ ] `src/types/pricing.ts` - Pricing types

### Example App
- [ ] `example-app/app/page.tsx` - Landing page
- [ ] `example-app/app/pricing/page.tsx` - Pricing page
- [ ] `example-app/app/dashboard/page.tsx` - Protected dashboard
- [ ] `example-app/app/analytics/page.tsx` - Feature-gated page
- [ ] `example-app/app/settings/page.tsx` - Subscription settings
- [ ] `example-app/app/success/page.tsx` - Post-checkout success
- [ ] `example-app/app/cancel/page.tsx` - Checkout canceled
- [ ] `example-app/lib/supabase.ts` - Supabase client

### Documentation
- [ ] `README.md` - Main documentation
- [ ] `SETUP.md` - Setup guide
- [ ] `API_REFERENCE.md` - API documentation
- [ ] `TROUBLESHOOTING.md` - Common issues
- [ ] `CHANGELOG.md` - Version history
- [ ] `CONTRIBUTING.md` - Contribution guide
- [ ] `.cursorrules` - AI integration rules

### Tests
- [ ] `tests/webhook-integration.test.ts` - Webhook tests
- [ ] `tests/create-checkout.test.ts` - Checkout tests
- [ ] `tests/SubscriptionProvider.test.tsx` - Provider tests
- [ ] `tests/SubscriptionGate.test.tsx` - Gate tests

### Config Files
- [ ] `.env.example` - Environment variables template
- [ ] `.gitignore` - Git ignore rules
- [ ] `package.json` - Dependencies
- [ ] `tsconfig.json` - TypeScript config
- [ ] `LICENSE` - MIT license
- [ ] `COMMERCIAL_LICENSE.md` - Pro license terms

---

## 🧪 Testing Strategy

### Unit Tests (Days 1-14)

**Tools:** Vitest, React Testing Library

**Coverage target:** 80%+

**What to test:**
1. **Pricing config:** All features exist, plans valid
2. **Webhook handlers:** Each event type, edge cases
3. **React components:** Rendering, state, props
4. **Utility functions:** Feature access logic, state transitions

**Run tests:**
```bash
npm run test
npm run test:coverage
```

### Integration Tests (Days 8-14)

**Tools:** Playwright (E2E)

**Scenarios:**
1. Complete signup → upgrade → use feature flow
2. Payment failure → retry → success flow
3. Cancelation → resubscribe flow
4. Trial expiration flow

**Run tests:**
```bash
npm run test:e2e
```

### Manual Testing Checklist

**Stripe Integration:**
- [ ] Checkout session creation
- [ ] Payment success webhook
- [ ] Payment failure webhook
- [ ] Subscription update webhook
- [ ] Cancelation webhook
- [ ] Customer portal access

**Feature Gating:**
- [ ] Free user sees upgrade prompt
- [ ] Pro user sees feature
- [ ] Expired subscription locks features
- [ ] Real-time updates work

**Edge Cases:**
- [ ] Duplicate webhooks (idempotency)
- [ ] Rapid plan changes
- [ ] Trial to paid transition
- [ ] Immediate vs end-of-period cancelation

---

## 🚀 Launch Checklist

### Pre-Launch (Day 20)
- [ ] All tests passing (unit + integration)
- [ ] Example app deployed and working
- [ ] Documentation complete (README, SETUP, API, TROUBLESHOOTING)
- [ ] Video walkthrough recorded and uploaded
- [ ] Beta testers provided positive feedback
- [ ] License files added
- [ ] Gumroad product created
- [ ] Landing page deployed

### Launch Day (Day 21)
- [ ] Git tag v1.0.0 created
- [ ] Repository pushed to GitHub (public)
- [ ] Posted on Indie Hackers (Show IH)
- [ ] Posted in Lovable Discord
- [ ] Twitter thread published
- [ ] Product Hunt launch scheduled (next day)
- [ ] Monitor for issues
- [ ] Respond to all comments within 1 hour

### Post-Launch (Week 4)
- [ ] Collect feedback (issues, feature requests)
- [ ] Fix critical bugs within 24 hours
- [ ] Update documentation based on feedback
- [ ] Create tutorial blog post
- [ ] Reach out to first 10 customers for testimonials
- [ ] Plan v1.1 features

---

## 📊 Success Metrics

### Week 1
- ✅ All Edge Functions deployed and tested
- ✅ Complete subscription lifecycle working
- ✅ Zero critical bugs in core infrastructure

### Week 2
- ✅ React SDK complete with 80%+ test coverage
- ✅ Example app deployed and working
- ✅ Beta testers complete setup in < 20 min

### Week 3
- ✅ 5+ beta testers provide positive feedback
- ✅ Documentation complete (README + guides)
- ✅ Launched on 3+ platforms
- ✅ First paying customer! 🎉

### Week 4 (Post-Launch)
- Target: 10 sales ($490 revenue)
- Target: 50+ GitHub stars
- Target: 100+ example app deployments
- Target: 5+ testimonials

---

## 🎯 Daily Standup Template

Use this every morning:

**Yesterday:**
- What did I complete?
- Any blockers?

**Today:**
- What am I working on?
- Expected completion time?

**Blockers:**
- Do I need help with anything?

**Example:**
```
Day 3 Standup:
Yesterday:
  ✅ Completed pricing config
  ✅ Studied Autumn webhook patterns
  ⚠️ Blocked on idempotency strategy

Today:
  🎯 Implement webhook signature verification (2h)
  🎯 Build checkout.session.completed handler (3h)
  🎯 Test with Stripe CLI (1h)

Blockers:
  ❓ Need to decide on idempotency storage (Redis vs DB)
  → Decision: Use in-memory Set for MVP, document upgrade path
```

---

## 🛠️ Tools & Resources

### Development
- **Supabase CLI:** `npm install -g supabase`
- **Stripe CLI:** `brew install stripe/stripe-cli/stripe`
- **Deno:** For Edge Functions testing

### Testing
- **Vitest:** Unit testing
- **Playwright:** E2E testing
- **React Testing Library:** Component testing

### Documentation
- **Excalidraw:** Architecture diagrams
- **Loom:** Video recording
- **Grammarly:** Docs proofreading

### Launch
- **Gumroad:** Payment processing
- **Vercel:** Hosting
- **Twitter:** Marketing
- **Indie Hackers:** Community

---

## 💡 Tips for Success

### 1. Ship Daily
- Commit working code every day
- Deploy to staging daily
- Get feedback early

### 2. Test Continuously
- Write tests as you code (not after)
- Run full test suite before each commit
- Manual test critical paths daily

### 3. Document as You Build
- Write README sections as features complete
- Capture setup steps immediately
- Document problems + solutions

### 4. Study Autumn Deeply
- Don't just copy, understand WHY
- Extract patterns, not code
- Test their edge cases

### 5. Focus on UX
- Setup should feel magical (< 15 min)
- Error messages should be helpful
- Components should "just work"

### 6. Get Early Feedback
- Share WIP with 1-2 people
- Fix friction immediately
- Iterate based on real usage

---

## 🎯 Completion Criteria

**Week 1:** ✅
- All Edge Functions working
- Database schema complete
- Stripe integration tested

**Week 2:** ✅
- React SDK production-ready
- Example app deployed
- .cursorrules tested with AI

**Week 3:** ✅
- Documentation complete
- Video walkthrough published
- Launched publicly

**Overall:** ✅
- 5+ beta testers successful
- Setup time < 20 minutes
- Zero critical bugs
- First paying customer

---

**Status:** Ready to Execute
**Next Step:** Start Day 1 - Project Setup & Database Schema

Let's build! 🚀
