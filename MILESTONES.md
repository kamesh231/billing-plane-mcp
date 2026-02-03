# Lovable Subscription Foundation - Implementation Milestones

**Cursor-Driven Implementation Plan**

> Each milestone is independently testable and reversible. Complete one milestone, verify it works, then move to the next.

---

## 📋 Milestone Overview

| # | Milestone | Outcome | Time | Status |
|---|-----------|---------|------|--------|
| 1 | [Project Configuration](#milestone-1-project-configuration) | User-specific config files generated | 15 min | ⏳ |
| 2 | [Database Deployment](#milestone-2-database-deployment) | Supabase tables created with RLS | 10 min | ⏳ |
| 3 | [Stripe Webhook Handler](#milestone-3-stripe-webhook-handler) | Webhook receives and processes events | 20 min | ⏳ |
| 4 | [Checkout Edge Function](#milestone-4-checkout-edge-function) | Users can upgrade via Stripe | 15 min | ⏳ |
| 5 | [Customer Portal Edge Function](#milestone-5-customer-portal-edge-function) | Users can manage subscriptions | 10 min | ⏳ |
| 6 | [React SDK - Provider](#milestone-6-react-sdk-provider) | Subscription state available app-wide | 15 min | ⏳ |
| 7 | [React SDK - Gates](#milestone-7-react-sdk-gates) | Feature gating works | 20 min | ⏳ |
| 8 | [License Badge](#milestone-8-license-badge-monetization) | Free tier shows badge, Pro removes it | 15 min | ⏳ |
| 9 | [End-to-End Testing](#milestone-9-end-to-end-testing) | Complete subscription flow works | 30 min | ⏳ |
| 10 | [Production Deployment](#milestone-10-production-deployment) | Live and accepting payments | 20 min | ⏳ |

**Total Implementation Time:** 2.5 - 3 hours (with testing)

---

## Milestone 1: Project Configuration

### 🎯 Outcome
User-specific configuration files generated based on their Supabase and Stripe credentials.

### 📝 What Gets Created
1. `.env.local` with user's actual keys
2. `src/config/pricing.ts` with user's Stripe price IDs
3. `supabase/.env` with project reference

### 🤖 Cursor Command
```
@milestones /milestone-1

I need to configure this project with my credentials:
- Supabase Project URL: https://abcdefgh.supabase.co
- Supabase Anon Key: eyJhbGc...
- Supabase Service Role Key: eyJhbGc...
- Stripe Publishable Key: pk_test_...
- Stripe Secret Key: sk_test_...
- Stripe Pro Price ID: price_1ABc...
- Stripe Enterprise Price ID: price_xyz...

Please generate all configuration files.
```

### ✅ Verification Steps
```bash
# 1. Check files exist
ls .env.local
ls src/config/pricing.ts

# 2. Verify no placeholder values remain
grep "your-project" .env.local  # Should return nothing
grep "price_xxx" src/config/pricing.ts  # Should return nothing

# 3. Test env vars load
node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
# Should print your actual Supabase URL
```

### 🔄 Rollback
```bash
# Restore from examples
cp .env.example .env.local
git checkout src/config/pricing.ts
```

### ✓ Success Criteria
- [ ] `.env.local` contains all actual keys (no placeholders)
- [ ] `pricing.ts` has real Stripe price IDs
- [ ] No "TODO" or "your-" strings in config files
- [ ] Environment variables load correctly

---

## Milestone 2: Database Deployment

### 🎯 Outcome
Subscriptions table created in user's Supabase with RLS policies and triggers.

### 📝 What Gets Deployed
1. `subscriptions` table with all columns
2. RLS policies (users read own, service_role full access)
3. Database triggers (auto-create subscription, updated_at)
4. Indexes for performance

### 🤖 Cursor Command
```
@milestones /milestone-2

My Supabase project is linked. Please deploy the database migration.
Verify the migration runs successfully and all objects are created.
```

### ✅ Verification Steps
```bash
# 1. Check migration status
supabase db push --dry-run
# Should show: "✓ Local database is up to date"

# 2. Deploy migration
supabase db push

# 3. Verify table exists
supabase db shell
\dt subscriptions
\d subscriptions  # See all columns

# 4. Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'subscriptions';
# rowsecurity should be 't' (true)

# 5. Test auto-create trigger
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test@example.com') RETURNING id;
# Copy the ID

SELECT * FROM subscriptions WHERE user_id = '<PASTE_ID>';
# Should return 1 row with plan_id='free', status='active'

# 6. Test RLS policy
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "<PASTE_ID>"}';
SELECT * FROM subscriptions WHERE user_id = '<PASTE_ID>';
# Should return the subscription

# Try to see another user's subscription
SELECT * FROM subscriptions WHERE user_id != '<PASTE_ID>';
# Should return 0 rows (RLS blocks it)
```

### 🔄 Rollback
```bash
# Drop the migration
supabase db reset

# Or manually drop table
supabase db shell
DROP TABLE IF EXISTS subscriptions CASCADE;
```

### ✓ Success Criteria
- [ ] Table `subscriptions` exists with all columns
- [ ] RLS is enabled on subscriptions table
- [ ] Auto-create trigger works (new user → subscription created)
- [ ] RLS policies work (users only see own subscription)
- [ ] All indexes created
- [ ] No errors in migration

---

## Milestone 3: Stripe Webhook Handler

### 🎯 Outcome
Webhook Edge Function deployed and successfully processing Stripe events.

### 📝 What Gets Deployed
1. `stripe-webhook` Edge Function
2. Webhook endpoint: `https://<project>.supabase.co/functions/v1/stripe-webhook`

### 🤖 Cursor Command
```
@milestones /milestone-3

Deploy the Stripe webhook handler Edge Function.
After deployment, provide me with:
1. The webhook endpoint URL
2. Instructions to configure it in Stripe Dashboard
3. Test command to verify it works
```

### ✅ Verification Steps
```bash
# 1. Deploy function
supabase functions deploy stripe-webhook

# 2. Verify deployment
supabase functions list
# Should show: stripe-webhook | deployed | <timestamp>

# 3. Set secrets (if not already set)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# 4. Test with Stripe CLI (local forwarding)
stripe listen --forward-to https://<project>.supabase.co/functions/v1/stripe-webhook

# 5. Trigger test event
stripe trigger checkout.session.completed

# 6. Check function logs
supabase functions logs stripe-webhook --tail
# Should show: "Processing event: checkout.session.completed"

# 7. Verify database update
supabase db shell
SELECT * FROM subscriptions WHERE stripe_customer_id IS NOT NULL;
# Should show updated subscription from webhook

# 8. Test signature verification (negative test)
curl -X POST https://<project>.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"fake": "data"}'
# Should return: 400 "Missing stripe-signature header"
```

### 🔄 Rollback
```bash
# Delete the function
supabase functions delete stripe-webhook

# Or redeploy previous version
git checkout HEAD~1 supabase/functions/stripe-webhook/index.ts
supabase functions deploy stripe-webhook
```

### ✓ Success Criteria
- [ ] Function deploys without errors
- [ ] Function appears in Supabase Dashboard
- [ ] Test event from Stripe CLI processes successfully
- [ ] Database updates when webhook received
- [ ] Signature verification rejects invalid requests
- [ ] Function logs show proper event handling

### 📋 Configure in Stripe Dashboard
```
After verification passes:
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://<project>.supabase.co/functions/v1/stripe-webhook
4. Events to send:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.paid
   - invoice.payment_failed
5. Click "Add endpoint"
6. Copy "Signing secret" (whsec_...)
7. Update Supabase secret:
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Milestone 4: Checkout Edge Function

### 🎯 Outcome
Users can upgrade to paid plans via Stripe Checkout.

### 📝 What Gets Deployed
1. `create-checkout` Edge Function
2. Endpoint: `https://<project>.supabase.co/functions/v1/create-checkout`

### 🤖 Cursor Command
```
@milestones /milestone-4

Deploy the create-checkout Edge Function.
After deployment, provide a test script I can run to verify it creates
a valid Stripe Checkout session.
```

### ✅ Verification Steps
```bash
# 1. Deploy function
supabase functions deploy create-checkout

# 2. Verify deployment
supabase functions list
# Should show: create-checkout | deployed | <timestamp>

# 3. Test with authenticated request
# First, get a JWT token from Supabase Dashboard:
# Dashboard → Authentication → Users → (any user) → Copy JWT

export JWT_TOKEN="eyJhbGc..."  # Paste JWT here

# 4. Call the function
curl -X POST https://<project>.supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price_id": "price_1ABc...",
    "success_url": "http://localhost:3000/success",
    "cancel_url": "http://localhost:3000/cancel",
    "trial_period_days": 14
  }'

# Expected response:
# {
#   "session_id": "cs_test_...",
#   "session_url": "https://checkout.stripe.com/c/pay/cs_test_..."
# }

# 5. Verify session created in Stripe
echo "Open this URL in browser (from response above):"
# https://checkout.stripe.com/c/pay/cs_test_...

# 6. Test without auth (should fail)
curl -X POST https://<project>.supabase.co/functions/v1/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"price_id": "price_xxx"}'
# Should return: 401 "Missing authorization header"

# 7. Check function logs
supabase functions logs create-checkout --tail
```

### 🔄 Rollback
```bash
supabase functions delete create-checkout
```

### ✓ Success Criteria
- [ ] Function deploys without errors
- [ ] Authenticated request returns valid session URL
- [ ] Session URL opens Stripe Checkout page
- [ ] Unauthenticated request returns 401
- [ ] Trial period applies if specified
- [ ] Customer ID reused if user already has one
- [ ] Function logs show successful execution

---

## Milestone 5: Customer Portal Edge Function

### 🎯 Outcome
Users can manage their subscriptions via Stripe Customer Portal.

### 📝 What Gets Deployed
1. `create-portal` Edge Function
2. Endpoint: `https://<project>.supabase.co/functions/v1/create-portal`

### 🤖 Cursor Command
```
@milestones /milestone-5

Deploy the create-portal Edge Function.
After deployment, provide a test script that verifies portal link generation.
```

### ✅ Verification Steps
```bash
# 1. Deploy function
supabase functions deploy create-portal

# 2. Verify deployment
supabase functions list
# Should show: create-portal | deployed | <timestamp>

# 3. Test with authenticated user who has subscription
export JWT_TOKEN="eyJhbGc..."  # User JWT
export USER_ID="<user-id-with-stripe-customer>"

# First, ensure user has stripe_customer_id
supabase db shell
SELECT id, stripe_customer_id FROM subscriptions WHERE user_id = '<USER_ID>';
# Should return a row with stripe_customer_id populated

# 4. Call the function
curl -X POST https://<project>.supabase.co/functions/v1/create-portal \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "return_url": "http://localhost:3000/settings"
  }'

# Expected response:
# {
#   "portal_url": "https://billing.stripe.com/p/session/..."
# }

# 5. Open portal URL in browser
echo "Portal URL (from response above):"
# Should open Stripe Customer Portal with subscription management

# 6. Test without subscription (should fail gracefully)
# Use a user without stripe_customer_id
# Should return: 404 "No subscription found"

# 7. Check function logs
supabase functions logs create-portal --tail
```

### 🔄 Rollback
```bash
supabase functions delete create-portal
```

### ✓ Success Criteria
- [ ] Function deploys without errors
- [ ] Portal URL generated successfully for subscribed users
- [ ] Portal opens and shows subscription details
- [ ] User without subscription gets clear error message
- [ ] Unauthenticated request returns 401
- [ ] Function logs show successful execution

---

## Milestone 6: React SDK - Provider

### 🎯 Outcome
Subscription state available throughout the app via React Context.

### 📝 What Gets Implemented
1. `SubscriptionProvider` component
2. `useSubscription()` hook
3. Real-time subscription updates
4. Type-safe subscription interface

### 🤖 Cursor Command
```
@milestones /milestone-6

Implement the SubscriptionProvider component with these features:
1. Fetch user's subscription from Supabase on mount
2. Subscribe to real-time updates
3. Provide subscription state via Context
4. Include helper functions: canAccess(), isPlanActive()

Then create a test component I can use to verify it works.
```

### ✅ Verification Steps
Create test file: `test-provider.tsx`
```tsx
import { SubscriptionProvider, useSubscription } from './src'
import { createClient } from '@supabase/supabase-js'

function TestComponent() {
  const { subscription, loading, canAccess } = useSubscription()

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Subscription Test</h1>
      <pre>{JSON.stringify(subscription, null, 2)}</pre>
      <p>Can access advanced-analytics: {canAccess('advanced-analytics') ? 'YES' : 'NO'}</p>
    </div>
  )
}

export default function App() {
  return (
    <SubscriptionProvider
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
    >
      <TestComponent />
    </SubscriptionProvider>
  )
}
```

Run test:
```bash
# 1. Add test component to your app
# 2. Start dev server
npm run dev

# 3. Open browser to http://localhost:3000
# Should show:
# - Subscription data for logged-in user
# - "Can access advanced-analytics: NO" (for free tier)
# - "Can access advanced-analytics: YES" (for pro tier)

# 4. Test real-time updates
# In another terminal, update subscription:
supabase db shell
UPDATE subscriptions SET plan_id = 'pro' WHERE user_id = '<current-user-id>';

# Browser should auto-update without refresh (within 1-2 seconds)

# 5. Test without authentication
# Log out user
# Should show: subscription = null, loading = false
```

### 🔄 Rollback
```bash
git checkout src/components/SubscriptionProvider.tsx
```

### ✓ Success Criteria
- [ ] Provider wraps app without errors
- [ ] `useSubscription()` returns subscription data
- [ ] Real-time updates work (change in DB reflects in UI)
- [ ] `canAccess()` correctly checks feature access
- [ ] `isPlanActive()` correctly checks plan
- [ ] Loading state works
- [ ] Unauthenticated users handled gracefully
- [ ] No console errors

---

## Milestone 7: React SDK - Gates

### 🎯 Outcome
Feature gating components working with automatic upgrade prompts.

### 📝 What Gets Implemented
1. `SubscriptionGate` component
2. `PlanGate` component
3. `UpgradePrompt` component

### 🤖 Cursor Command
```
@milestones /milestone-7

Implement the gating components:
1. SubscriptionGate - Shows content only if user has feature access
2. PlanGate - Shows content only if user has required plan
3. UpgradePrompt - Shows upgrade UI with Stripe checkout integration

Create a test page that demonstrates all three components.
```

### ✅ Verification Steps
Create test file: `test-gates.tsx`
```tsx
import { SubscriptionGate, PlanGate, UpgradePrompt } from './src'

export default function TestGatesPage() {
  return (
    <div>
      <h1>Feature Gating Tests</h1>

      {/* Test 1: Feature Gate */}
      <section>
        <h2>Test 1: Advanced Analytics (Pro Feature)</h2>
        <SubscriptionGate slug="advanced-analytics">
          <div style={{ background: 'green', padding: 20 }}>
            ✅ You have access to Advanced Analytics!
          </div>
        </SubscriptionGate>
      </section>

      {/* Test 2: Plan Gate */}
      <section>
        <h2>Test 2: Enterprise Dashboard</h2>
        <PlanGate plan="enterprise">
          <div style={{ background: 'blue', padding: 20 }}>
            ✅ You have Enterprise access!
          </div>
        </PlanGate>
      </section>

      {/* Test 3: Multiple Plans */}
      <section>
        <h2>Test 3: Pro or Enterprise Feature</h2>
        <PlanGate plan={['pro', 'enterprise']}>
          <div style={{ background: 'purple', padding: 20 }}>
            ✅ You have Pro or Enterprise!
          </div>
        </PlanGate>
      </section>

      {/* Test 4: Hide when locked */}
      <section>
        <h2>Test 4: Navigation Item (Hide When Locked)</h2>
        <SubscriptionGate slug="white-label" hideWhenLocked>
          <button>White Label Settings</button>
        </SubscriptionGate>
        <p>^ Button should only appear for Enterprise users</p>
      </section>

      {/* Test 5: Custom Fallback */}
      <section>
        <h2>Test 5: Custom Fallback</h2>
        <SubscriptionGate
          slug="export-data"
          fallback={<p style={{ color: 'red' }}>Custom message: Upgrade to export data!</p>}
        >
          <button>Export Data</button>
        </SubscriptionGate>
      </section>
    </div>
  )
}
```

Run test:
```bash
# 1. Add test page to your app
# 2. Start dev server
npm run dev

# 3. Test as FREE user:
# - Test 1: Should show UpgradePrompt
# - Test 2: Should show UpgradePrompt
# - Test 3: Should show UpgradePrompt
# - Test 4: Button should NOT appear
# - Test 5: Should show custom message

# 4. Upgrade to PRO in database:
supabase db shell
UPDATE subscriptions SET plan_id = 'pro' WHERE user_id = '<user-id>';

# 5. Refresh page, now as PRO user:
# - Test 1: Should show ✅ green box
# - Test 2: Should still show UpgradePrompt (Enterprise only)
# - Test 3: Should show ✅ purple box
# - Test 4: Button should NOT appear (Enterprise only)
# - Test 5: Should show "Export Data" button

# 6. Test UpgradePrompt click:
# - Click "Upgrade to Pro" button
# - Should redirect to Stripe Checkout
# - Complete payment with test card: 4242 4242 4242 4242
# - Should redirect back to success URL
# - Features should unlock automatically
```

### 🔄 Rollback
```bash
git checkout src/components/SubscriptionGate.tsx
git checkout src/components/PlanGate.tsx
git checkout src/components/UpgradePrompt.tsx
```

### ✓ Success Criteria
- [ ] SubscriptionGate shows content when user has access
- [ ] SubscriptionGate shows UpgradePrompt when user lacks access
- [ ] PlanGate works with single plan
- [ ] PlanGate works with array of plans
- [ ] hideWhenLocked hides content instead of showing prompt
- [ ] Custom fallback works
- [ ] UpgradePrompt redirects to Stripe Checkout
- [ ] Upgrade flow completes successfully
- [ ] Features unlock after payment

---

## Milestone 8: License Badge (Monetization)

### 🎯 Outcome
Free tier shows "Powered by" badge with link. Pro license removes it with encrypted license key.

### 📝 What Gets Implemented
1. `LicenseBadge` component
2. License validation with AES-256 encryption
3. Unique encrypted license key per customer
4. License key generator script

### 🤖 Cursor Command
```
@milestones /milestone-8

Implement the license badge monetization system:

1. Create LicenseBadge component that shows:
   "Powered by Lovable Subscription Foundation" with link

2. Show badge by default (free tier)

3. Hide badge if user has LOVABLE_SUBSCRIPTION_PRO_LICENSE env var set

4. Badge should be:
   - Small and unobtrusive
   - Fixed position (bottom right)
   - Linked to product website
   - Styled to look professional

5. Create a LICENSE_CONFIG.ts for checking license
```

### ✅ Verification Steps
Create test file: `test-badge.tsx`
```tsx
import { LicenseBadge } from './src/components/LicenseBadge'

export default function TestBadgePage() {
  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <h1>License Badge Test</h1>
      <p>Check bottom-right corner for badge</p>

      <LicenseBadge />
    </div>
  )
}
```

Run test:
```bash
# 1. Test FREE version (no license)
# Remove any license env var
unset NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE
npm run dev

# Expected:
# - Badge appears in bottom-right
# - Shows: "Powered by Lovable Subscription Foundation"
# - Links to: https://lovable-subscription.dev (or your URL)
# - Styled professionally (subtle, not intrusive)

# 2. Test PRO version (with license)
# Add license env var to .env.local:
echo "NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE=true" >> .env.local
npm run dev

# Expected:
# - Badge should NOT appear
# - No "Powered by" text anywhere

# 3. Test badge link
# Click badge in FREE version
# Should open: https://lovable-subscription.dev in new tab

# 4. Test badge styling
# - Should be fixed position
# - Should not overlap content
# - Should be small (~12px font)
# - Should have subtle background
# - Should have hover effect

# 5. Test with SubscriptionProvider
# Badge should automatically detect license from env
```

### 📝 License Implementation

Create: `src/config/license.ts`
```typescript
export const LICENSE_CONFIG = {
  isFree: !process.env.NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE,
  isPro: !!process.env.NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE,
  productUrl: 'https://lovable-subscription.dev',
  purchaseUrl: 'https://lovable-subscription.dev/pricing',
  badge: {
    text: 'Powered by Lovable Subscription Foundation',
    show: !process.env.NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE
  }
}
```

Create: `src/components/LicenseBadge.tsx`
```tsx
import { LICENSE_CONFIG } from '../config/license'

export function LicenseBadge() {
  // Don't render if Pro license
  if (LICENSE_CONFIG.isPro) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 9999,
      fontSize: '12px',
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.05)',
      backdropFilter: 'blur(8px)',
      borderRadius: '6px',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease'
    }}>
      <a
        href={LICENSE_CONFIG.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#666',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>⚡</span>
        <span>{LICENSE_CONFIG.badge.text}</span>
      </a>
    </div>
  )
}
```

### 🔄 Rollback
```bash
rm src/components/LicenseBadge.tsx
rm src/config/license.ts
```

### ✓ Success Criteria
- [ ] Badge shows in free version
- [ ] Badge hidden in Pro version
- [ ] Badge link works and opens in new tab
- [ ] Badge styling is professional and unobtrusive
- [ ] Badge doesn't overlap important content
- [ ] Environment variable check works correctly
- [ ] Badge exports from main index.ts

### 📋 User Instructions (for README)
```markdown
## License

**Free Version:**
- Shows "Powered by Lovable Subscription Foundation" badge
- Use for 1 project
- MIT License

**Pro Version ($49):**
- Remove badge by setting environment variable:
  ```
  NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE=true
  ```
- Unlimited projects
- Commercial use allowed
- Purchase at: https://lovable-subscription.dev/pricing
```

---

## Milestone 9: End-to-End Testing

### 🎯 Outcome
Complete subscription flow verified working end-to-end.

### 📝 What Gets Tested
1. New user signup → subscription created
2. Upgrade flow → payment → features unlock
3. Webhook processing → database updates
4. Feature gating → correct behavior per plan
5. Customer portal → subscription management

### 🤖 Cursor Command
```
@milestones /milestone-9

Create an end-to-end test script that verifies the complete subscription flow.
The script should test all these scenarios and report success/failure for each.
```

### ✅ Verification Steps

Create: `test-e2e.sh`
```bash
#!/bin/bash
set -e

echo "🧪 Running End-to-End Tests..."
echo "================================"

# Test 1: Database Schema
echo "Test 1: Database Schema"
supabase db shell -c "SELECT COUNT(*) FROM subscriptions;" > /dev/null
echo "✅ Subscriptions table exists"

# Test 2: RLS Policies
echo "Test 2: RLS Policies"
supabase db shell -c "SELECT COUNT(*) FROM pg_policies WHERE tablename='subscriptions';" > /dev/null
echo "✅ RLS policies configured"

# Test 3: Edge Functions Deployed
echo "Test 3: Edge Functions"
supabase functions list | grep "stripe-webhook" > /dev/null
supabase functions list | grep "create-checkout" > /dev/null
supabase functions list | grep "create-portal" > /dev/null
echo "✅ All Edge Functions deployed"

# Test 4: Create Test User
echo "Test 4: Create Test User"
TEST_USER_ID=$(supabase db shell -c "INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) VALUES (gen_random_uuid(), 'e2e-test@example.com', crypt('password123', gen_salt('bf')), NOW(), '{}', '{}') RETURNING id;" -t | xargs)
echo "✅ Test user created: $TEST_USER_ID"

# Test 5: Subscription Auto-Created
echo "Test 5: Subscription Auto-Creation"
SUBSCRIPTION_COUNT=$(supabase db shell -c "SELECT COUNT(*) FROM subscriptions WHERE user_id='$TEST_USER_ID';" -t | xargs)
if [ "$SUBSCRIPTION_COUNT" -eq "1" ]; then
  echo "✅ Subscription auto-created"
else
  echo "❌ Subscription NOT auto-created"
  exit 1
fi

# Test 6: Webhook Handler
echo "Test 6: Webhook Handler"
curl -s -o /dev/null -w "%{http_code}" "https://$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/stripe-webhook" | grep -q "405"
echo "✅ Webhook endpoint responding"

# Test 7: Pricing Config
echo "Test 7: Pricing Configuration"
if grep -q "stripePriceId: 'price_" src/config/pricing.ts; then
  echo "✅ Pricing config has real Stripe IDs"
else
  echo "❌ Pricing config still has placeholders"
  exit 1
fi

# Test 8: License Badge (Free)
echo "Test 8: License Badge (Free Version)"
if grep -q "Powered by" src/components/LicenseBadge.tsx; then
  echo "✅ License badge implemented"
else
  echo "❌ License badge missing"
  exit 1
fi

# Test 9: Environment Variables
echo "Test 9: Environment Variables"
if [ -f .env.local ]; then
  echo "✅ .env.local exists"
else
  echo "❌ .env.local missing"
  exit 1
fi

# Test 10: Clean up
echo "Test 10: Cleanup"
supabase db shell -c "DELETE FROM auth.users WHERE email='e2e-test@example.com';" > /dev/null
echo "✅ Test data cleaned up"

echo ""
echo "================================"
echo "✅ All E2E Tests Passed!"
echo "================================"
```

Run tests:
```bash
# Make script executable
chmod +x test-e2e.sh

# Run tests
./test-e2e.sh
```

### Manual Testing Checklist

```
1. User Signup Flow:
   [ ] New user can sign up
   [ ] Subscription auto-created with plan='free'
   [ ] User sees free tier content

2. Upgrade Flow:
   [ ] Click "Upgrade to Pro"
   [ ] Redirected to Stripe Checkout
   [ ] Enter test card: 4242 4242 4242 4242
   [ ] Payment succeeds
   [ ] Redirected back to app
   [ ] Pro features immediately unlock (no refresh)

3. Feature Gating:
   [ ] Free user sees UpgradePrompt for Pro features
   [ ] Pro user sees Pro features
   [ ] Enterprise features still locked for Pro user

4. Customer Portal:
   [ ] Click "Manage Subscription"
   [ ] Portal opens with subscription details
   [ ] Can update payment method
   [ ] Can cancel subscription
   [ ] Cancellation reflects in app

5. Webhook Processing:
   [ ] Check Stripe Dashboard → Webhooks
   [ ] All events show 200 responses
   [ ] Check Supabase logs: no errors

6. License Badge:
   [ ] Badge shows in free version
   [ ] Badge links to product page
   [ ] Badge hidden when NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE=true

7. Real-time Updates:
   [ ] Manually update subscription in database
   [ ] App updates within 2 seconds (no refresh)

8. Error Handling:
   [ ] Invalid Stripe key → clear error message
   [ ] Webhook signature fail → 400 response
   [ ] Unauthenticated API call → 401 response
```

### 🔄 Rollback
Not applicable (testing only)

### ✓ Success Criteria
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] Zero errors in browser console
- [ ] Zero errors in Supabase logs
- [ ] Complete signup → upgrade → use flow works
- [ ] Customer portal works
- [ ] Webhook processes all events correctly

---

## Milestone 10: Production Deployment

### 🎯 Outcome
System deployed and accepting real payments in production.

### 📝 What Gets Deployed
1. Edge Functions to production Supabase
2. Stripe webhook configured in live mode
3. Frontend deployed to Vercel/Netlify
4. Production environment variables set

### 🤖 Cursor Command
```
@milestones /milestone-10

Guide me through production deployment:
1. Switching to Stripe live mode
2. Deploying Edge Functions to production
3. Configuring production webhook
4. Deploying frontend
5. Final production verification
```

### ✅ Verification Steps

#### Step 1: Switch to Stripe Live Mode
```bash
# 1. Get live keys from Stripe Dashboard
# Switch from "Test mode" to "Live mode" (toggle in top-right)
# Go to: Developers → API Keys
# Copy:
#   - Live Publishable Key (pk_live_...)
#   - Live Secret Key (sk_live_...)

# 2. Update .env.local for production
# (or set in Vercel/Netlify dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# 3. Update Supabase secrets for production
supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref <prod-project>
```

#### Step 2: Deploy Production Edge Functions
```bash
# 1. Link to production project
supabase link --project-ref <prod-project>

# 2. Deploy all functions
supabase functions deploy stripe-webhook --project-ref <prod-project>
supabase functions deploy create-checkout --project-ref <prod-project>
supabase functions deploy create-portal --project-ref <prod-project>

# 3. Verify deployment
supabase functions list --project-ref <prod-project>
```

#### Step 3: Configure Production Webhook
```bash
# 1. Get production webhook URL
echo "Webhook URL:"
echo "https://<prod-project>.supabase.co/functions/v1/stripe-webhook"

# 2. Add in Stripe Dashboard (LIVE MODE):
# - Go to: https://dashboard.stripe.com/webhooks (ensure "Live" mode)
# - Click "Add endpoint"
# - Endpoint URL: https://<prod-project>.supabase.co/functions/v1/stripe-webhook
# - Events: (same 6 events as test mode)
# - Click "Add endpoint"

# 3. Copy signing secret
# Click endpoint → "Reveal" signing secret
# Copy whsec_... value

# 4. Update Supabase secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref <prod-project>
```

#### Step 4: Deploy Frontend
```bash
# Option A: Vercel
vercel --prod

# Option B: Netlify
netlify deploy --prod

# Set environment variables in hosting dashboard:
# - NEXT_PUBLIC_SUPABASE_URL=https://<prod-project>.supabase.co
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### Step 5: Production Verification
```bash
# 1. Visit production URL
echo "Test at: https://your-app.vercel.app"

# 2. Sign up new user
# → Check database: subscription created

# 3. Upgrade to Pro with REAL card
# → Use your actual credit card (will be charged!)
# → Complete checkout
# → Verify features unlock

# 4. Check Stripe Dashboard (Live mode)
# → Should see customer created
# → Should see subscription active
# → Webhook should show 200 responses

# 5. Test Customer Portal
# → Click "Manage Subscription"
# → Portal should open
# → Should show real subscription

# 6. Monitor for 24 hours
# → Check Supabase logs for errors
# → Check Stripe webhook delivery status
# → Check for any user reports
```

### 🔄 Rollback
```bash
# Rollback Edge Functions
supabase functions deploy stripe-webhook@previous-version

# Rollback frontend
vercel rollback  # or netlify rollback

# Disable webhook in Stripe Dashboard
# → Go to webhook → Disable
```

### ✓ Success Criteria
- [ ] All Edge Functions deployed to production
- [ ] Production webhook configured and working
- [ ] Frontend deployed with production env vars
- [ ] Real payment completes successfully
- [ ] Features unlock after real payment
- [ ] Customer portal works in production
- [ ] Zero errors in production logs (24 hours)
- [ ] Webhook shows 200 responses in Stripe Dashboard

### 🎉 Production Checklist

```
Pre-Launch:
[ ] All test payments completed successfully
[ ] Customer portal tested
[ ] Webhook verified in test mode
[ ] Documentation complete
[ ] License badge implemented
[ ] Terms of Service and Privacy Policy added
[ ] Support email configured

Launch:
[ ] Switch to live Stripe keys
[ ] Deploy production Edge Functions
[ ] Configure production webhook
[ ] Deploy frontend to production
[ ] Update DNS (if custom domain)
[ ] Test complete flow with real card
[ ] Monitor for 24 hours

Post-Launch:
[ ] Add monitoring/alerts (Sentry, LogRocket, etc.)
[ ] Set up customer support (email, Discord, etc.)
[ ] Create launch announcement
[ ] Share on Indie Hackers, Twitter, Lovable Discord
[ ] Collect testimonials from first users
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Webhook Signature Verification Failed
**Symptoms:** Webhook returns 400, logs show "signature verification failed"

**Solution:**
```bash
# 1. Verify secret matches Stripe Dashboard
supabase secrets get STRIPE_WEBHOOK_SECRET

# 2. Ensure using correct environment (test vs live)
# Test webhook needs test secret (whsec_test_...)
# Live webhook needs live secret (whsec_...)

# 3. Redeploy webhook function
supabase functions deploy stripe-webhook
```

### Issue 2: Subscription Not Auto-Created
**Symptoms:** New user has no row in subscriptions table

**Solution:**
```bash
# 1. Check trigger exists
supabase db shell
\df on_auth_user_created

# 2. Manually create subscription
INSERT INTO subscriptions (user_id, plan_id, status)
VALUES ('<user-id>', 'free', 'active');

# 3. Re-run migration if trigger missing
supabase db reset
```

### Issue 3: Features Not Unlocking After Payment
**Symptoms:** Paid but still see free tier

**Solution:**
```bash
# 1. Check webhook received event
# Stripe Dashboard → Webhooks → Your endpoint
# Should see "checkout.session.completed" with 200 response

# 2. Check database updated
supabase db shell
SELECT * FROM subscriptions WHERE stripe_customer_id = '<customer-id>';
# plan_id should be 'pro' or 'enterprise'

# 3. Force refetch in frontend
const { refetch } = useSubscription()
await refetch()

# 4. Check pricing config
# Ensure feature is in plan's features array
```

### Issue 4: Real-Time Updates Not Working
**Symptoms:** Database changes don't reflect in UI

**Solution:**
```bash
# 1. Verify Realtime enabled in Supabase
# Dashboard → Database → Replication
# Ensure "subscriptions" table has replication enabled

# 2. Check browser console for WebSocket errors

# 3. Verify SubscriptionProvider subscribed to changes
# Should see: supabase.channel('subscription-changes')

# 4. Test manually
# Update DB, should see update within 2 seconds
```

---

## 📊 Milestone Tracking

Use this checklist to track progress:

```markdown
## Implementation Progress

- [ ] M1: Project Configuration (15 min)
- [ ] M2: Database Deployment (10 min)
- [ ] M3: Stripe Webhook Handler (20 min)
- [ ] M4: Checkout Edge Function (15 min)
- [ ] M5: Customer Portal Edge Function (10 min)
- [ ] M6: React SDK - Provider (15 min)
- [ ] M7: React SDK - Gates (20 min)
- [ ] M8: License Badge (15 min)
- [ ] M9: End-to-End Testing (30 min)
- [ ] M10: Production Deployment (20 min)

**Total Time:** _____ / 170 minutes (2.8 hours)
**Started:** _____
**Completed:** _____
```

---

## 🎯 Quick Start (TL;DR)

```bash
# Complete all milestones in order:
for milestone in {1..10}; do
  echo "Starting Milestone $milestone..."
  # Follow instructions for that milestone
  # Verify it works
  # Move to next only after verification passes
done
```

---

**Next:** Start with [Milestone 1](#milestone-1-project-configuration)
