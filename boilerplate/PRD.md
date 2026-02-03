# PRD: Lovable Subscription Boilerplate

**Product Name:** Lovable Subscription Foundation
**Version:** 1.0
**Last Updated:** 2026-02-02
**Status:** Ready to Build

---

## 🎯 Executive Summary

**What:** A production-ready subscription billing boilerplate for Lovable (and AI app builder) users that eliminates the need to burn AI credits figuring out Stripe integration.

**Why:** Lovable users waste 500-2000 credits implementing subscription billing from scratch. This boilerplate gives them a copy-paste solution that works in 15 minutes.

**How:** Pre-built Supabase Edge Functions + React SDK + `.cursorrules` that handle the complete subscription lifecycle (trials, upgrades, cancellations, feature gating).

**Revenue:** $0 (free for 1 project) / $49 (unlimited projects, lifetime license)

**Target:** 5,000+ Lovable users, expandable to Bolt.new, v0.dev, Cursor users

---

## 🎯 Problem Statement

### Current Pain

**When Lovable users add subscriptions:**
1. ❌ Spend 500-2000 credits asking AI to implement Stripe
2. ❌ Get buggy webhook handlers (race conditions, missed events)
3. ❌ Unclear subscription state management (trial vs active vs canceled)
4. ❌ No feature gating logic (how to lock features per plan)
5. ❌ Spend 2-4 weeks iterating to get it right

**Evidence:**
- Lovable Discord: 50+ "how do I add Stripe?" messages/month
- Bolt.new subreddit: Subscription questions daily
- Indie Hackers: "Spent $200 in Claude credits on billing"

### Our Solution

**15-minute setup:**
1. Clone boilerplate repo
2. Add Stripe keys to `.env`
3. Deploy Supabase Edge Functions
4. Use `<SubscriptionGate>` in code
5. Done ✅

**Zero AI credits burned. Zero bugs. Production-ready.**

---

## 👥 Target Users

### Primary: Lovable Users
- **Who:** Non-technical founders building SaaS with Lovable
- **Pain:** High credit burn on Stripe integration
- **Need:** Copy-paste billing solution
- **Willingness to pay:** $49 (saves $100-200 in credits)

### Secondary: AI App Builder Users
- **Platforms:** Bolt.new, v0.dev, Cursor
- **Same pain, different tools**
- **Market expansion from 5K → 50K users**

### Tertiary: Indie Hackers
- **Building with Next.js + Supabase**
- **Want pre-built billing**
- **Don't want to learn Stripe**

---

## 🎯 Core Requirements

### Must-Have (MVP)

#### 1. Database Schema (Supabase)
```sql
-- Multi-tenant subscriptions table with RLS
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users NOT NULL,

  -- Stripe identifiers
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,

  -- Subscription state
  plan_id text DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  status text, -- 'trialing', 'active', 'past_due', 'canceled'

  -- Limits
  seats_limit int DEFAULT 1,
  feature_limits jsonb DEFAULT '{}'::jsonb,

  -- Dates
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

#### 2. Stripe Webhook Handler (Edge Function)
```typescript
// supabase/functions/stripe-webhook/index.ts

// Handles these events:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed
- checkout.session.completed

// Logic:
- Verify webhook signature
- Extract customer metadata (user_id)
- Update subscriptions table
- Handle edge cases (trial → paid, cancelation, etc.)
```

#### 3. Checkout Session Creator (Edge Function)
```typescript
// supabase/functions/create-checkout/index.ts

// Creates Stripe Checkout session
// Passes user_id in metadata
// Supports: trial_period_days, success_url, cancel_url
```

#### 4. Customer Portal (Edge Function)
```typescript
// supabase/functions/create-portal/index.ts

// Creates Stripe Customer Portal session
// User can manage subscription, update card, cancel
```

#### 5. React SDK
```typescript
// components/SubscriptionGate.tsx
<SubscriptionGate slug="advanced-analytics">
  <AdvancedAnalytics />
</SubscriptionGate>

// components/PlanGate.tsx
<PlanGate plan="pro">
  <ProFeature />
</PlanGate>

// hooks/useSubscription.ts
const { plan, status, features, isActive, canAccess } = useSubscription()

// hooks/useFeature.ts
const { hasAccess, upgrade } = useFeature('advanced-analytics')
```

#### 6. Pricing Configuration
```typescript
// config/pricing.ts
export const PRICING_CONFIG = {
  plans: {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      features: ['basic-analytics', 'api-access-1k']
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 29,
      stripePriceId: 'price_xxx',
      features: ['advanced-analytics', 'api-access-10k', 'export-data']
    }
  },
  features: {
    'advanced-analytics': {
      name: 'Advanced Analytics',
      plans: ['pro', 'enterprise']
    },
    'api-access-10k': {
      name: '10K API Calls/month',
      plans: ['pro', 'enterprise']
    }
  }
}
```

#### 7. .cursorrules Integration
```json
{
  "subscriptions": {
    "provider": "lovable-subscription-foundation",
    "config": "./config/pricing.ts",
    "instructions": {
      "feature_gating": "Always use <SubscriptionGate slug='feature-name'> component. Never write custom if/else logic for plans.",
      "available_slugs": ["advanced-analytics", "api-access-10k", "export-data"],
      "upgrade_flow": "Use the upgrade() function from useFeature() hook to redirect to checkout."
    }
  }
}
```

### Nice-to-Have (Post-MVP)

- Usage metering (track API calls, etc.)
- Multi-seat management
- Team invitations
- Dunning management (retry failed payments)
- Analytics dashboard (MRR, churn)
- Multi-currency support
- Annual billing (with discount)

---

## 🏗️ Technical Architecture

### Tech Stack

**Frontend:**
- React (any framework: Next.js, Vite, etc.)
- TypeScript
- TailwindCSS (optional, for UI components)

**Backend:**
- Supabase (Database + Auth + Edge Functions)
- PostgreSQL (via Supabase)
- Stripe (Payments + Subscriptions)

**Deployment:**
- Supabase (Edge Functions auto-deploy)
- Vercel / Netlify (Frontend)

### Data Flow

```
┌─────────────────────────────────────────────┐
│ User Signs Up                               │
│ → Supabase Auth creates user                │
│ → Trigger creates subscription row          │
│   (plan_id: 'free', status: 'active')       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ User Clicks "Upgrade to Pro"                │
│ → Frontend calls create-checkout function   │
│ → Edge Function creates Stripe session      │
│   with metadata: { user_id }                │
│ → Redirects to Stripe Checkout              │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ User Completes Payment                      │
│ → Stripe sends checkout.session.completed   │
│ → Webhook handler extracts user_id          │
│ → Updates subscriptions table:              │
│   SET plan_id = 'pro', status = 'active'    │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ User Access Feature                         │
│ → <SubscriptionGate slug="analytics">       │
│ → useSubscription() fetches from DB         │
│ → Checks: features.includes('analytics')    │
│ → Renders if true, shows upgrade if false   │
└─────────────────────────────────────────────┘
```

---

## 🎨 User Experience

### Setup Flow (15 minutes)

**Step 1: Clone Repository**
```bash
git clone https://github.com/yourname/lovable-subscription-foundation
cd lovable-subscription-foundation
npm install
```

**Step 2: Configure Stripe**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Step 3: Deploy Edge Functions**
```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-portal
```

**Step 4: Run Migrations**
```bash
supabase db push
```

**Step 5: Configure Stripe Products**
```bash
# Create products in Stripe dashboard
# Copy price IDs to config/pricing.ts
```

**Step 6: Start Using**
```tsx
import { SubscriptionGate } from '@/components/SubscriptionGate'

<SubscriptionGate slug="advanced-analytics">
  <MyAdvancedAnalytics />
</SubscriptionGate>
```

### Developer Experience

**Lovable AI Integration:**
```
Developer: "Add a Pro plan with advanced analytics"

Lovable AI (reads .cursorrules):
- Sees pricing config
- Knows to use <SubscriptionGate slug="advanced-analytics">
- Generates correct code
- No trial and error ✅
```

---

## 📊 Subscription State Machine

### States & Transitions

```
FREE (default)
  ├─ checkout.session.completed → TRIALING (if trial enabled)
  ├─ checkout.session.completed → ACTIVE (if no trial)
  └─ No changes allowed

TRIALING
  ├─ trial_end reached → ACTIVE (if payment method added)
  ├─ trial_end reached → CANCELED (if no payment method)
  ├─ customer.subscription.updated → ACTIVE (early conversion)
  └─ customer.subscription.deleted → CANCELED

ACTIVE
  ├─ invoice.payment_failed → PAST_DUE
  ├─ customer.subscription.updated (cancel_at_period_end: true) → ACTIVE (with flag)
  ├─ customer.subscription.deleted → CANCELED
  └─ current_period_end reached (if cancel_at_period_end) → CANCELED

PAST_DUE
  ├─ invoice.paid → ACTIVE
  ├─ retry exhausted → CANCELED
  └─ customer.subscription.deleted → CANCELED

CANCELED
  └─ checkout.session.completed → TRIALING or ACTIVE (resubscribe)
```

### Feature Access Rules

```typescript
function canAccessFeature(subscription, featureSlug) {
  const feature = PRICING_CONFIG.features[featureSlug]

  // Check subscription status
  if (!['active', 'trialing'].includes(subscription.status)) {
    return false
  }

  // Check if plan includes feature
  if (!feature.plans.includes(subscription.plan_id)) {
    return false
  }

  // Check if trial has ended (for trial users)
  if (subscription.status === 'trialing' &&
      new Date() > new Date(subscription.trial_end)) {
    return false
  }

  return true
}
```

---

## 🎯 Success Metrics

### User Metrics
- **Setup time:** < 15 minutes (vs 2-4 weeks DIY)
- **Credit savings:** 500-2000 Lovable credits saved
- **Error rate:** 0 webhook handling errors
- **Feature completeness:** 100% of subscription lifecycle handled

### Business Metrics
- **Month 1:** 10 sales ($490 revenue)
- **Month 3:** 50 sales ($2,450 revenue)
- **Month 6:** 200 sales ($9,800 revenue)
- **Consulting:** 5-10 projects @ $500-2K each

---

## 🚀 Go-to-Market

### Launch Strategy

**Week 1: Build**
- Core functionality
- Documentation
- Example project

**Week 2: Beta**
- Free version on GitHub
- 10 beta testers (Lovable Discord)
- Collect feedback

**Week 3: Launch**
- Gumroad listing ($49)
- Launch on Twitter/IH/Reddit
- Lovable Discord announcement

**Week 4: Iterate**
- Fix issues
- Add requested features
- Create tutorials

### Marketing Channels

**Primary:**
- Lovable Discord (5K members)
- Indie Hackers (Show thread)
- Twitter (#buildinpublic)

**Secondary:**
- Dev.to article
- YouTube tutorial
- Reddit (r/SideProject)

**Ongoing:**
- SEO blog posts
- Email list
- Affiliates (30% commission)

---

## 💰 Pricing & Licensing

### Tiers

**Free:**
- Full source code
- MIT license
- Personal use only (1 project)
- Community support (GitHub Discussions)

**Pro ($49 one-time):**
- Same source code
- Commercial license (unlimited projects)
- Email support (best-effort)
- Lifetime updates (1 year)

**Consulting ($500-2000):**
- Custom integration
- 1-hour setup call
- Code review
- Priority support

### License Enforcement

**Honor system + social proof:**
```
// components/LicenseCheck.tsx (optional)
// Adds small badge "Powered by Lovable Subscription Foundation"
// Removed in Pro version
```

---

## 🔒 Security Considerations

### Webhook Security
- ✅ Verify Stripe signatures
- ✅ Use webhook secrets
- ✅ Idempotency keys
- ✅ Rate limiting

### Database Security
- ✅ Row-level security (RLS)
- ✅ User can only read own subscription
- ✅ Only Edge Functions can write
- ✅ Encrypted Stripe keys in environment

### API Security
- ✅ Supabase Auth required
- ✅ Edge Functions validate user_id
- ✅ No direct Stripe API calls from frontend

---

## 🎯 Phase Breakdown

### Phase 1: Core (Week 1)
- Database schema
- Webhook handler
- Checkout creation
- Basic React components
- Documentation

### Phase 2: Polish (Week 2)
- Edge case handling
- Error messages
- Loading states
- Example project
- .cursorrules integration

### Phase 3: Launch (Week 3)
- Landing page
- Gumroad setup
- Marketing materials
- Beta testing
- Launch announcement

### Phase 4: Iterate (Week 4+)
- Bug fixes
- Feature requests
- Tutorials
- Consulting offers

---

## 🎓 Learning from Autumn

### What to Extract from useautumn/autumn

**Study these files:**
1. `server/src/external/stripe/webhooks/*`
   - How they map events to state
   - Metadata handling
   - Idempotency

2. `server/src/core/entitlements/*`
   - Feature access logic
   - Limit calculations
   - "Unlimited" handling

3. `server/src/routes/attach/*`
   - Checkout session creation
   - Metadata passing
   - Customer creation

**Don't copy code, learn patterns:**
- ✅ How to handle race conditions
- ✅ Edge cases (trial → paid, cancelation)
- ✅ State machine design
- ✅ Feature gating logic

**Then implement ourselves with:**
- Supabase Edge Functions (not Express)
- PostgreSQL (not their DB)
- Simpler, focused scope

---

## 📋 Deliverables

### Code
- ✅ Database migrations (SQL)
- ✅ 3x Edge Functions (TypeScript)
- ✅ React SDK (components + hooks)
- ✅ Pricing config (TypeScript)
- ✅ .cursorrules file
- ✅ Example app (Next.js)

### Documentation
- ✅ README (setup in 15 min)
- ✅ API reference
- ✅ Pricing config guide
- ✅ Troubleshooting guide
- ✅ Video walkthrough (10 min)

### Marketing
- ✅ Landing page
- ✅ Gumroad listing
- ✅ Launch tweet thread
- ✅ Show IH post

---

## 🎯 Success Criteria

**MVP is successful when:**
- ✅ 10 users set up in < 15 minutes
- ✅ Zero webhook errors in production
- ✅ All subscription states handled correctly
- ✅ Lovable AI uses it via .cursorrules

**Product is successful when:**
- ✅ 100 sales in 3 months ($4,900)
- ✅ 10+ testimonials
- ✅ 4.5+ star rating
- ✅ Used in production apps

---

## 🚨 Risks & Mitigations

### Risk 1: Stripe Changes API
**Mitigation:** Version lock, update guide, maintenance plan

### Risk 2: Market Too Small
**Mitigation:** Expand beyond Lovable (Bolt, v0, Cursor users)

### Risk 3: Someone Forks for Free
**Mitigation:** Free version is MIT, differentiate with support + updates

### Risk 4: Bugs in Production
**Mitigation:** Extensive testing, example app, beta period

---

## 🎉 Why This Will Work

1. **Clear pain point:** Lovable users burn 500-2000 credits
2. **Simple solution:** Copy-paste, 15 minutes setup
3. **Fair pricing:** $49 saves $100-200 in credits
4. **Quality execution:** Study Autumn, implement better
5. **Fast to market:** 2-3 weeks to launch
6. **Low risk:** Small investment, clear validation

**This is a focused, achievable product with real demand.** ✅

---

**Next: Architecture & Build Plan →**
