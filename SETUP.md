# Lovable Subscription Foundation - Setup Guide

**Complete setup in 15 minutes ⏱️**

---

## Prerequisites

Before you begin, make sure you have:

- ✅ Node.js 18+ installed
- ✅ A Supabase account ([sign up free](https://supabase.com))
- ✅ A Stripe account ([sign up free](https://stripe.com))
- ✅ Supabase CLI installed: `npm install -g supabase`
- ✅ Stripe CLI installed (optional, for testing): `brew install stripe/stripe-cli/stripe`

---

## Step 1: Create Supabase Project (3 minutes)

1. **Go to [Supabase Dashboard](https://app.supabase.com)**

2. **Click "New Project"**
   - Organization: Select or create one
   - Name: Your project name (e.g., "my-saas-app")
   - Database Password: Generate strong password (save it!)
   - Region: Choose closest to your users
   - Click "Create new project"

3. **Wait for provisioning** (~2 minutes)

4. **Get your credentials**
   - Go to Settings → API
   - Copy these values:
     - Project URL (e.g., `https://abcdefgh.supabase.co`)
     - `anon` / `public` key (starts with `eyJhbG...`)
     - `service_role` key (starts with `eyJhbG...`) ⚠️ Keep this secret!

---

## Step 2: Create Stripe Account & Products (5 minutes)

1. **Go to [Stripe Dashboard](https://dashboard.stripe.com)**

2. **Enable Test Mode**
   - Toggle switch in top-right: "Test mode"

3. **Create Products**

   **Pro Plan:**
   - Go to: Products → Add Product
   - Name: `Pro`
   - Description: `For growing teams`
   - Pricing:
     - Model: Standard pricing
     - Price: `$29` / month
     - Click "Add pricing"
   - Copy the **Price ID** (starts with `price_`)
     - Example: `price_1ABc2dEFghIjklMno3pQrSTu`

   **Enterprise Plan:**
   - Repeat above steps
   - Name: `Enterprise`
   - Price: `$99` / month
   - Copy the **Price ID**

4. **Get API Keys**
   - Go to: Developers → API Keys
   - Copy:
     - **Publishable key** (starts with `pk_test_`)
     - **Secret key** (starts with `sk_test_`) ⚠️ Keep this secret!

5. **Set up Webhook** (we'll come back to this in Step 4)

---

## Step 3: Configure Project (2 minutes)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/lovable-subscription-foundation
   cd lovable-subscription-foundation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```

4. **Fill in `.env.local`**
   ```bash
   # Supabase (from Step 1)
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

   # Stripe (from Step 2)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

5. **Update pricing config with Stripe Price IDs**

   Edit `src/config/pricing.ts`:
   ```typescript
   pro: {
     // ...
     stripePriceId: 'price_1ABc2dEFghIjklMno3pQrSTu', // ← Your Pro price ID
   },
   enterprise: {
     // ...
     stripePriceId: 'price_xyz...', // ← Your Enterprise price ID
   }
   ```

---

## Step 4: Deploy to Supabase (3 minutes)

1. **Link to your Supabase project**
   ```bash
   supabase link --project-ref abcdefgh
   # Enter your database password from Step 1
   ```

2. **Run database migrations**
   ```bash
   supabase db push
   ```

   This creates:
   - **Billing schema** (`billing`): all billing tables live under `billing` (e.g. `billing.subscriptions`, `billing.products`, `billing.prices`, `billing.entitlements`, `billing.product_entitlements`, `billing.subscription_items`).
   - RLS policies on `billing.*` (users read own subscription; service_role full; catalog read for authenticated).
   - Trigger on `auth.users`: every new user gets one row in `billing.subscriptions` (plan_id=free, status=active). The app calls the `ensure-stripe-customer` Edge Function after login so free users get a Stripe Customer and can open Customer Portal for upgrade without going through Checkout first.

   **Expose billing schema (if required):** In Supabase Dashboard → Project Settings → API → "Exposed schemas", ensure `billing` is included so the REST/JS client can access `billing.*` tables. (Some projects expose all schemas by default.)

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy create-checkout
   supabase functions deploy create-portal
   supabase functions deploy ensure-stripe-customer
   ```

4. **Set Supabase secrets** ⚠️ Important!
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... # We'll get this in Step 5
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # From Step 1
   ```

---

## Step 5: Configure Stripe Webhook (2 minutes)

1. **Get your webhook endpoint URL**
   ```
   https://abcdefgh.supabase.co/functions/v1/stripe-webhook
   ```
   Replace `abcdefgh` with your Supabase project ref.

2. **Add webhook in Stripe**
   - Go to: Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://abcdefgh.supabase.co/functions/v1/stripe-webhook`
   - Description: `Lovable Subscription Foundation`
   - Events to send:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.paid`
     - ✅ `invoice.payment_failed`
   - Click "Add endpoint"

3. **Copy webhook signing secret**
   - Click on your new webhook endpoint
   - Click "Reveal" under "Signing secret"
   - Copy the secret (starts with `whsec_`)

4. **Update Supabase secret**
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Step 6: Test It! (5 minutes)

### Option A: Local Testing

1. **Start Supabase locally**
   ```bash
   supabase start
   ```

2. **Forward Stripe webhooks**
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```

3. **Trigger test checkout**
   ```bash
   stripe trigger checkout.session.completed
   ```

4. **Check database**
   ```bash
   supabase db shell
   SELECT * FROM subscriptions;
   ```

### Option B: Production Testing

1. **Deploy your frontend** (Vercel, Netlify, etc.)

2. **Sign up a test user**

3. **Click "Upgrade to Pro"**

4. **Use test card:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

5. **Complete checkout**

6. **Verify Pro features unlock** ✅

---

## ✅ Success Checklist

After setup, verify everything works:

- [ ] Database migration ran successfully
- [ ] Edge Functions deployed (check in Supabase Dashboard → Edge Functions)
- [ ] Stripe webhook receives events (check Stripe Dashboard → Webhooks → your endpoint)
- [ ] Test user can sign up
- [ ] Free tier works
- [ ] Upgrade to Pro works
- [ ] Pro features unlock after payment
- [ ] Customer Portal opens and works

---

## 🐛 Troubleshooting

### "Permission denied" when deploying functions
**Solution:** Make sure you ran `supabase link` first.

### "Invalid signature" in webhook logs
**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
2. Copy the secret from the correct endpoint (test mode vs live mode)

### Subscription not updating after payment
**Solution:**
1. Check Stripe Dashboard → Webhooks → your endpoint
2. Look for failed deliveries
3. Click on event → "Resend"
4. Check Supabase logs: `supabase functions logs stripe-webhook`

### Features not unlocking
**Solution:**
1. Verify feature slug matches exactly in `pricing.ts`
2. Check subscription status: `SELECT * FROM subscriptions WHERE user_id = '...'`
3. Force refetch in frontend: `const { refetch } = useSubscription(); refetch()`

### Edge Function not receiving webhooks
**Solution:**
1. Verify endpoint URL is correct: `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook`
2. Check webhook is in test mode (if using test keys)
3. Ensure endpoint is enabled in Stripe Dashboard

---

## 🎉 You're Done!

Your app now has:

✅ Subscription billing
✅ Feature gating
✅ Automatic state management
✅ Customer portal
✅ Trial support
✅ Production-ready error handling

**Next steps:**

1. Customize `pricing.ts` with your plans and features
2. Add `<SubscriptionGate>` to your components
3. Build your pricing page
4. Ship it! 🚀

---

## 📚 Learn More

- [Usage Examples](./README.md#usage-examples)
- [Architecture](./boilerplate/ARCHITECTURE.md)
- [Build Plan](./boilerplate/BUILD_PLAN.md)

---

**Need help?** [Open an issue](https://github.com/yourusername/lovable-subscription-foundation/issues)
