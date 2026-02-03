# Lovable Subscription Foundation - Architecture

**Version:** 1.0
**Last Updated:** 2026-02-03
**Status:** Design Complete

---

## 🎯 System Overview

**What:** A pre-built subscription billing boilerplate that runs entirely on Supabase + Stripe.

**Architecture Pattern:** Serverless event-driven architecture with PostgreSQL as source of truth.

**Key Principles:**
1. **Database as Truth** - All state lives in PostgreSQL
2. **Stripe as Events** - Webhooks drive state changes
3. **Edge Functions as Logic** - Serverless handlers process events
4. **React as UI** - Client-side feature gating
5. **RLS as Security** - Row-level security for multi-tenancy

---

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Application                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Components (User's Frontend)                  │   │
│  │                                                       │   │
│  │  <SubscriptionGate slug="advanced-analytics">        │   │
│  │    <AdvancedAnalytics />                             │   │
│  │  </SubscriptionGate>                                 │   │
│  │                                                       │   │
│  │  const { plan, features } = useSubscription()        │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                          │
│                   ↓ (Read subscription state)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Supabase Client                                     │   │
│  │  - Authenticated queries                             │   │
│  │  - RLS enforced reads                                │   │
│  │  - Real-time subscription                            │   │
│  └────────────────┬─────────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ↓
┌───────────────────────────────────────────────────────────────┐
│                    Supabase Platform                          │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                   │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │ auth.users (Supabase Auth)                      │   │  │
│  │  │ - id (uuid)                                     │   │  │
│  │  │ - email                                         │   │  │
│  │  └──────────────┬──────────────────────────────────┘   │  │
│  │                 │ 1:1                                   │  │
│  │                 ↓                                       │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │ public.subscriptions (Our Table)                │   │  │
│  │  │ - id (uuid, PK)                                 │   │  │
│  │  │ - user_id (uuid, FK → auth.users)              │   │  │
│  │  │ - stripe_customer_id (text, unique)            │   │  │
│  │  │ - stripe_subscription_id (text, unique)        │   │  │
│  │  │ - plan_id (text: 'free', 'pro', 'enterprise')  │   │  │
│  │  │ - status (text: 'active', 'trialing', etc.)    │   │  │
│  │  │ - feature_limits (jsonb)                        │   │  │
│  │  │ - trial_end (timestamptz)                       │   │  │
│  │  │ - current_period_end (timestamptz)             │   │  │
│  │  │ - cancel_at_period_end (boolean)               │   │  │
│  │  │                                                 │   │  │
│  │  │ RLS Policy: Users can only read own row        │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Edge Functions (Deno Runtime)                         │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ stripe-webhook                                   │  │  │
│  │  │ - Verifies webhook signature                     │  │  │
│  │  │ - Handles subscription events                    │  │  │
│  │  │ - Updates subscriptions table                    │  │  │
│  │  │ - Idempotent processing                          │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ create-checkout                                  │  │  │
│  │  │ - Creates Stripe Checkout session                │  │  │
│  │  │ - Passes user_id in metadata                     │  │  │
│  │  │ - Returns session URL                            │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ create-portal                                    │  │  │
│  │  │ - Creates Stripe Customer Portal session         │  │  │
│  │  │ - Returns portal URL                             │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────┬───────────────────────────────────────────┘
                    │
                    ↓ (Webhooks, API calls)
┌───────────────────────────────────────────────────────────────┐
│                      Stripe Platform                          │
│                                                               │
│  - Products & Prices                                          │
│  - Checkout Sessions                                          │
│  - Subscriptions                                              │
│  - Customer Portal                                            │
│  - Webhook Events                                             │
└───────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Tables

#### `auth.users` (Supabase Managed)
```sql
-- Managed by Supabase Auth
-- We reference this but don't modify it
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  encrypted_password TEXT,
  -- ... other Supabase auth fields
);
```

#### `public.subscriptions` (Our Table)
```sql
CREATE TABLE IF NOT EXISTS public.subscriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign key to Supabase auth
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Subscription state
  plan_id TEXT NOT NULL DEFAULT 'free',
  -- Values: 'free', 'pro', 'enterprise'

  status TEXT NOT NULL DEFAULT 'active',
  -- Values: 'active', 'trialing', 'past_due', 'canceled', 'paused'

  -- Feature entitlements
  seats_limit INTEGER DEFAULT 1,
  feature_limits JSONB DEFAULT '{}'::jsonb,
  -- Example: {"api_calls_per_month": 10000, "storage_gb": 50}

  -- Stripe metadata
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions(plan_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Auto-create subscription on user signup
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_subscription_for_new_user();
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Service role can do anything (for Edge Functions)
CREATE POLICY "Service role has full access"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 3: Prevent direct writes from users
-- (Users can only read, Edge Functions write via service_role)
```

### Database Triggers

**1. Auto-create subscription on signup:**
```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_subscription_for_new_user();
```

**2. Auto-update `updated_at` timestamp:**
```sql
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

---

## 🔄 Subscription State Machine

### States

```
┌──────────────────────────────────────────────────────────────┐
│                     Subscription States                      │
└──────────────────────────────────────────────────────────────┘

┌─────────┐
│  FREE   │ ← Default state for new users
└────┬────┘
     │
     │ User clicks "Upgrade"
     │ → create-checkout Edge Function
     │ → Redirects to Stripe Checkout
     │
     ↓
┌──────────────┐
│  TRIALING    │ ← If trial enabled (e.g., 14 days)
└──────┬───────┘
       │
       ├─→ Trial ends + payment method added → ACTIVE
       ├─→ Trial ends + no payment method → CANCELED
       ├─→ User cancels → CANCELED
       └─→ Early conversion → ACTIVE

┌─────────┐
│ ACTIVE  │ ← Paid subscription active
└────┬────┘
     │
     ├─→ Payment succeeds each period → Stays ACTIVE
     ├─→ Payment fails → PAST_DUE
     ├─→ User cancels (cancel_at_period_end: true) → ACTIVE (with flag)
     ├─→ Period ends + cancel_at_period_end → CANCELED
     └─→ User manually cancels immediately → CANCELED

┌──────────────┐
│  PAST_DUE    │ ← Payment failed, retrying
└──────┬───────┘
       │
       ├─→ Retry succeeds → ACTIVE
       ├─→ All retries exhausted → CANCELED
       └─→ User updates payment → ACTIVE

┌──────────────┐
│  CANCELED    │ ← Subscription ended
└──────┬───────┘
       │
       └─→ User resubscribes → TRIALING or ACTIVE

┌─────────┐
│ PAUSED  │ ← (Optional: Stripe subscription paused)
└─────────┘
```

### State Transition Rules

```typescript
type SubscriptionStatus =
  | 'active'      // Paid, current
  | 'trialing'    // In trial period
  | 'past_due'    // Payment failed, retrying
  | 'canceled'    // Ended
  | 'paused'      // Paused (optional)

type StripeEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'

// State transition logic (implemented in stripe-webhook Edge Function)
function handleStateTransition(
  currentState: SubscriptionStatus,
  event: StripeEvent,
  eventData: any
): SubscriptionStatus {

  if (event === 'checkout.session.completed') {
    const subscription = eventData.subscription
    if (subscription.trial_end) {
      return 'trialing'
    } else {
      return 'active'
    }
  }

  if (event === 'customer.subscription.updated') {
    const subscription = eventData

    // Map Stripe status to our status
    if (subscription.status === 'active') {
      return 'active'
    }
    if (subscription.status === 'trialing') {
      return 'trialing'
    }
    if (subscription.status === 'past_due') {
      return 'past_due'
    }
    if (subscription.status === 'canceled') {
      return 'canceled'
    }
    if (subscription.status === 'paused') {
      return 'paused'
    }
  }

  if (event === 'customer.subscription.deleted') {
    return 'canceled'
  }

  if (event === 'invoice.paid') {
    // If was past_due, move to active
    if (currentState === 'past_due') {
      return 'active'
    }
    // Otherwise stay in current state
    return currentState
  }

  if (event === 'invoice.payment_failed') {
    return 'past_due'
  }

  return currentState
}
```

---

## ⚡ Edge Functions Architecture

### 1. `stripe-webhook` Edge Function

**Purpose:** Handle all Stripe webhook events

**URL:** `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`

**Flow Diagram:**
```
Stripe Event
    │
    ↓
┌────────────────────────────────────────────────┐
│ 1. Verify Webhook Signature                   │
│    const signature = headers['stripe-signature'] │
│    const event = stripe.webhooks.constructEvent() │
│    → If invalid, return 400                    │
└────────────────┬───────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────┐
│ 2. Check Idempotency                           │
│    const eventId = event.id                    │
│    Check if already processed                  │
│    → If duplicate, return 200 (success)        │
└────────────────┬───────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────┐
│ 3. Route by Event Type                         │
│    switch (event.type) {                       │
│      case 'checkout.session.completed':        │
│      case 'customer.subscription.created':     │
│      case 'customer.subscription.updated':     │
│      case 'customer.subscription.deleted':     │
│      case 'invoice.paid':                      │
│      case 'invoice.payment_failed':            │
│    }                                           │
└────────────────┬───────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────┐
│ 4. Extract Metadata                            │
│    const userId = event.data.object.metadata.user_id │
│    const customerId = event.data.object.customer │
│    const subscriptionId = event.data.object.id │
└────────────────┬───────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────┐
│ 5. Update Database (via service_role)          │
│    UPDATE subscriptions SET                    │
│      stripe_customer_id = ...,                 │
│      stripe_subscription_id = ...,             │
│      status = ...,                             │
│      plan_id = ...,                            │
│      current_period_end = ...                  │
│    WHERE user_id = ...                         │
└────────────────┬───────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────┐
│ 6. Return 200 OK                               │
│    Stripe expects 2xx response                 │
└────────────────────────────────────────────────┘
```

**Event Handlers:**

```typescript
// supabase/functions/stripe-webhook/index.ts

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role bypasses RLS
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  // 1. Verify signature
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // 2. Route by event type
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response('Webhook handler failed', { status: 500 })
  }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Fetch subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Determine plan_id from price
  const priceId = subscription.items.data[0].price.id
  const planId = getPlanIdFromPriceId(priceId) // Maps price_xxx → 'pro'

  // Update database
  await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_id: planId,
      status: subscription.status, // 'trialing' or 'active'
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', userId)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user by Stripe customer ID
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!data) {
    console.error('No subscription found for customer:', customerId)
    return
  }

  // Update subscription
  const priceId = subscription.items.data[0].price.id
  const planId = getPlanIdFromPriceId(priceId)

  await supabase
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', data.user_id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Move from past_due → active if payment succeeded
  const customerId = invoice.customer as string

  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'past_due')
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId)
}

function getPlanIdFromPriceId(priceId: string): string {
  // Map Stripe price IDs to plan IDs
  // This comes from config/pricing.ts
  const priceMap: Record<string, string> = {
    'price_pro_monthly': 'pro',
    'price_pro_yearly': 'pro',
    'price_enterprise_monthly': 'enterprise',
    'price_enterprise_yearly': 'enterprise',
  }
  return priceMap[priceId] || 'free'
}
```

### 2. `create-checkout` Edge Function

**Purpose:** Create Stripe Checkout session for upgrading

**URL:** `https://<project-ref>.supabase.co/functions/v1/create-checkout`

**Request:**
```typescript
POST /functions/v1/create-checkout
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "price_id": "price_pro_monthly",
  "success_url": "https://yourapp.com/success",
  "cancel_url": "https://yourapp.com/cancel",
  "trial_period_days": 14 // optional
}
```

**Response:**
```typescript
{
  "session_url": "https://checkout.stripe.com/c/pay/cs_..."
}
```

**Implementation:**
```typescript
// supabase/functions/create-checkout/index.ts

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  // 1. Get user from JWT
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Parse request body
  const { price_id, success_url, cancel_url, trial_period_days } = await req.json()

  // 3. Check if user already has Stripe customer
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = subscription?.stripe_customer_id

  // 4. Create customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id }
    })
    customerId = customer.id
  }

  // 5. Create Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: price_id, quantity: 1 }],
    mode: 'subscription',
    success_url,
    cancel_url,
    subscription_data: {
      trial_period_days,
      metadata: { user_id: user.id }
    },
    metadata: { user_id: user.id }
  })

  return new Response(JSON.stringify({ session_url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 3. `create-portal` Edge Function

**Purpose:** Create Stripe Customer Portal session for managing subscription

**URL:** `https://<project-ref>.supabase.co/functions/v1/create-portal`

**Request:**
```typescript
POST /functions/v1/create-portal
Authorization: Bearer <user_jwt>
Content-Type: application/json

{
  "return_url": "https://yourapp.com/settings"
}
```

**Response:**
```typescript
{
  "portal_url": "https://billing.stripe.com/p/session/..."
}
```

**Implementation:**
```typescript
// supabase/functions/create-portal/index.ts

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  // 1. Get user from JWT
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Get Stripe customer ID
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (error || !subscription?.stripe_customer_id) {
    return new Response('No subscription found', { status: 404 })
  }

  // 3. Parse return URL
  const { return_url } = await req.json()

  // 4. Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url
  })

  return new Response(JSON.stringify({ portal_url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## ⚛️ React SDK Architecture

### Component Hierarchy

```
User's App
  └── SubscriptionProvider (context)
       ├── SubscriptionGate (feature-based gating)
       ├── PlanGate (plan-based gating)
       └── useSubscription (hook)
```

### 1. SubscriptionProvider (Context)

**Purpose:** Fetch subscription data once, provide to all children

**Implementation:**
```typescript
// components/SubscriptionProvider.tsx

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PRICING_CONFIG } from '../config/pricing'

interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  features: string[]
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

interface SubscriptionContextValue {
  subscription: Subscription | null
  loading: boolean
  error: Error | null
  canAccess: (featureSlug: string) => boolean
  isPlanActive: (planId: string) => boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchSubscription() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Fetch subscription
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) throw error

        // Augment with features from pricing config
        const plan = PRICING_CONFIG.plans[data.plan_id]
        const features = plan?.features || []

        setSubscription({ ...data, features })
        setLoading(false)

      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchSubscription()

    // Subscribe to changes (real-time)
    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'subscriptions'
      }, () => {
        fetchSubscription()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const canAccess = (featureSlug: string): boolean => {
    if (!subscription) return false

    // Check if subscription is active
    if (!['active', 'trialing'].includes(subscription.status)) {
      return false
    }

    // Check if trial has ended
    if (subscription.status === 'trialing' && subscription.trial_end) {
      if (new Date() > new Date(subscription.trial_end)) {
        return false
      }
    }

    // Check if feature is in plan
    return subscription.features.includes(featureSlug)
  }

  const isPlanActive = (planId: string): boolean => {
    if (!subscription) return false
    return subscription.plan_id === planId && ['active', 'trialing'].includes(subscription.status)
  }

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      error,
      canAccess,
      isPlanActive
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}
```

### 2. SubscriptionGate Component

**Purpose:** Feature-based gating (hide/show based on feature access)

**Implementation:**
```typescript
// components/SubscriptionGate.tsx

import { ReactNode } from 'react'
import { useSubscription } from './SubscriptionProvider'
import { UpgradePrompt } from './UpgradePrompt'

interface SubscriptionGateProps {
  slug: string // Feature slug from pricing config
  children: ReactNode
  fallback?: ReactNode // Custom fallback (default: UpgradePrompt)
}

export function SubscriptionGate({ slug, children, fallback }: SubscriptionGateProps) {
  const { canAccess, loading } = useSubscription()

  if (loading) {
    return <div>Loading...</div>
  }

  if (canAccess(slug)) {
    return <>{children}</>
  }

  return <>{fallback || <UpgradePrompt featureSlug={slug} />}</>
}
```

### 3. PlanGate Component

**Purpose:** Plan-based gating (hide/show based on plan level)

**Implementation:**
```typescript
// components/PlanGate.tsx

import { ReactNode } from 'react'
import { useSubscription } from './SubscriptionProvider'
import { UpgradePrompt } from './UpgradePrompt'

interface PlanGateProps {
  plan: string | string[] // 'pro' or ['pro', 'enterprise']
  children: ReactNode
  fallback?: ReactNode
}

export function PlanGate({ plan, children, fallback }: PlanGateProps) {
  const { subscription, loading } = useSubscription()

  if (loading) {
    return <div>Loading...</div>
  }

  const allowedPlans = Array.isArray(plan) ? plan : [plan]
  const hasAccess = subscription && allowedPlans.includes(subscription.plan_id)

  if (hasAccess) {
    return <>{children}</>
  }

  return <>{fallback || <UpgradePrompt requiredPlan={allowedPlans[0]} />}</>
}
```

### 4. UpgradePrompt Component

**Purpose:** Show upgrade UI when access denied

**Implementation:**
```typescript
// components/UpgradePrompt.tsx

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PRICING_CONFIG } from '../config/pricing'

interface UpgradePromptProps {
  featureSlug?: string
  requiredPlan?: string
}

export function UpgradePrompt({ featureSlug, requiredPlan }: UpgradePromptProps) {
  const [loading, setLoading] = useState(false)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleUpgrade(planId: string) {
    setLoading(true)

    try {
      const plan = PRICING_CONFIG.plans[planId]

      // Call create-checkout Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          price_id: plan.stripePriceId,
          success_url: `${window.location.origin}/success`,
          cancel_url: window.location.href,
          trial_period_days: plan.trialDays || 0
        }
      })

      if (error) throw error

      // Redirect to Stripe Checkout
      window.location.href = data.session_url

    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Failed to start upgrade process')
      setLoading(false)
    }
  }

  // Find which plan includes this feature
  const feature = featureSlug ? PRICING_CONFIG.features[featureSlug] : null
  const plan = requiredPlan || feature?.plans[0] || 'pro'

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <h3 className="text-lg font-semibold mb-2">
        {feature ? feature.name : 'Premium Feature'}
      </h3>
      <p className="text-gray-600 mb-4">
        Upgrade to {PRICING_CONFIG.plans[plan].name} to unlock this feature
      </p>
      <button
        onClick={() => handleUpgrade(plan)}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : `Upgrade to ${PRICING_CONFIG.plans[plan].name}`}
      </button>
    </div>
  )
}
```

---

## 📝 Pricing Configuration

### Structure

**File:** `config/pricing.ts`

```typescript
export const PRICING_CONFIG = {
  plans: {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: null,
      stripePriceId: null,
      features: ['basic-analytics', 'api-access-1k', 'email-support']
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 29,
      interval: 'month',
      stripePriceId: 'price_pro_monthly',
      trialDays: 14,
      features: [
        'basic-analytics',
        'advanced-analytics',
        'api-access-10k',
        'export-data',
        'priority-support'
      ]
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      interval: 'month',
      stripePriceId: 'price_enterprise_monthly',
      features: [
        'basic-analytics',
        'advanced-analytics',
        'api-access-unlimited',
        'export-data',
        'white-label',
        'dedicated-support',
        'sla-guarantee'
      ]
    }
  },

  features: {
    'basic-analytics': {
      name: 'Basic Analytics',
      description: 'View basic usage metrics',
      plans: ['free', 'pro', 'enterprise']
    },
    'advanced-analytics': {
      name: 'Advanced Analytics',
      description: 'Custom reports and insights',
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
      description: 'Download reports as CSV/PDF',
      plans: ['pro', 'enterprise']
    },
    'white-label': {
      name: 'White Label',
      description: 'Remove branding',
      plans: ['enterprise']
    },
    'email-support': {
      name: 'Email Support',
      description: 'Support via email',
      plans: ['free', 'pro', 'enterprise']
    },
    'priority-support': {
      name: 'Priority Support',
      description: '24-hour response time',
      plans: ['pro', 'enterprise']
    },
    'dedicated-support': {
      name: 'Dedicated Support',
      description: 'Dedicated Slack channel',
      plans: ['enterprise']
    },
    'sla-guarantee': {
      name: '99.9% SLA',
      description: 'Uptime guarantee with credits',
      plans: ['enterprise']
    }
  }
}

export type PlanId = keyof typeof PRICING_CONFIG.plans
export type FeatureSlug = keyof typeof PRICING_CONFIG.features
```

---

## 🎨 `.cursorrules` Integration

### Purpose
Tell Lovable AI (or any AI coding assistant) how to use the subscription system

### File: `.cursorrules`

```json
{
  "subscriptions": {
    "provider": "lovable-subscription-foundation",
    "config_file": "./config/pricing.ts",
    "instructions": {
      "feature_gating": {
        "rule": "Always use <SubscriptionGate slug='feature-name'> component. Never write custom if/else logic for plan checks.",
        "example": "<SubscriptionGate slug=\"advanced-analytics\"><AdvancedAnalytics /></SubscriptionGate>"
      },
      "plan_gating": {
        "rule": "Use <PlanGate plan='plan-id'> for plan-level restrictions.",
        "example": "<PlanGate plan=\"pro\"><ProFeature /></PlanGate>"
      },
      "upgrade_flow": {
        "rule": "Use the upgrade() function from useFeature() hook or <UpgradePrompt /> component.",
        "example": "const { hasAccess, upgrade } = useFeature('advanced-analytics'); if (!hasAccess) upgrade()"
      },
      "available_features": [
        "basic-analytics",
        "advanced-analytics",
        "api-access-1k",
        "api-access-10k",
        "api-access-unlimited",
        "export-data",
        "white-label"
      ],
      "available_plans": [
        "free",
        "pro",
        "enterprise"
      ]
    },
    "common_patterns": {
      "add_new_feature": {
        "steps": [
          "1. Add feature to config/pricing.ts (in features object)",
          "2. Assign feature to plans (in plans[].features array)",
          "3. Use <SubscriptionGate slug='new-feature'> in component",
          "4. No backend changes needed (automatic)"
        ]
      },
      "create_pricing_page": {
        "steps": [
          "1. Import PRICING_CONFIG from config/pricing",
          "2. Map over PRICING_CONFIG.plans",
          "3. For upgrade button, use create-checkout Edge Function",
          "4. Show feature list using PRICING_CONFIG.features"
        ]
      }
    }
  }
}
```

### How AI Uses This

**Scenario 1: User says "Add a new premium feature: Team Collaboration"**

AI reads `.cursorrules` and:
1. Adds to `config/pricing.ts`:
```typescript
'team-collaboration': {
  name: 'Team Collaboration',
  description: 'Invite team members',
  plans: ['pro', 'enterprise']
}
```

2. Updates plan features:
```typescript
pro: {
  features: [..., 'team-collaboration']
}
```

3. Wraps feature in component:
```tsx
<SubscriptionGate slug="team-collaboration">
  <TeamCollaboration />
</SubscriptionGate>
```

**No manual planning needed. AI follows rules automatically.**

---

## 🔒 Security Model

### 1. Row Level Security (RLS)

```sql
-- Users can ONLY read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role (Edge Functions) can do anything
CREATE POLICY "Service role has full access"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true);
```

**Result:**
- Users can't modify subscriptions directly
- Users can't see other users' subscriptions
- Only Edge Functions (via service_role key) can write
- Stripe webhooks → Edge Functions → Database (secure chain)

### 2. API Key Security

```typescript
// Edge Functions use different keys for different access levels

// Frontend uses anon key (public, RLS enforced)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Safe to expose
)

// Edge Functions use service_role key (private, bypasses RLS)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // NEVER expose to frontend
)
```

### 3. Stripe Webhook Signature Verification

```typescript
// ALWAYS verify webhook signature
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  STRIPE_WEBHOOK_SECRET
)
// If signature invalid, throws error → 400 response
```

**Why critical:**
- Prevents fake webhook attacks
- Ensures events actually from Stripe
- Required for PCI compliance

### 4. Idempotency

```typescript
// Track processed events to prevent duplicate processing
const processedEvents = new Set<string>()

if (processedEvents.has(event.id)) {
  return new Response('Already processed', { status: 200 })
}

processedEvents.add(event.id)
// Process event...
```

**Production:** Store in Redis or database table with TTL

---

## 🚀 Deployment Architecture

### Infrastructure

```
┌─────────────────────────────────────────────────────────┐
│                    User's Frontend                      │
│              (Vercel / Netlify / etc.)                  │
│                                                         │
│  - Next.js / Vite / etc.                                │
│  - React SDK components                                 │
│  - Connects to Supabase (anon key)                      │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ↓ (HTTPS)
┌─────────────────────────────────────────────────────────┐
│                  Supabase Platform                      │
│           (https://<project>.supabase.co)               │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Database (PostgreSQL)                          │    │
│  │ - auth.users                                   │    │
│  │ - public.subscriptions                         │    │
│  │ - RLS policies                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Edge Functions (Deno Runtime)                  │    │
│  │ - stripe-webhook                               │    │
│  │ - create-checkout                              │    │
│  │ - create-portal                                │    │
│  │                                                 │    │
│  │ Deployed to: Global edge network               │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Auth (Supabase Auth)                           │    │
│  │ - Email/password, OAuth, magic links           │    │
│  └────────────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ↓ (HTTPS, webhook signature)
┌─────────────────────────────────────────────────────────┐
│                    Stripe Platform                      │
│                                                         │
│  - Products & Prices                                    │
│  - Checkout Sessions                                    │
│  - Subscriptions                                        │
│  - Customer Portal                                      │
│  - Webhook Events                                       │
└─────────────────────────────────────────────────────────┘
```

### Environment Variables

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... # Safe to expose
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Safe to expose
```

**Edge Functions (Supabase Secrets):**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # NEVER expose
```

### Deployment Steps

**1. Deploy Database:**
```bash
supabase db push
# Runs migrations, creates tables, sets up RLS
```

**2. Deploy Edge Functions:**
```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy create-portal
```

**3. Configure Stripe Webhook:**
```bash
# In Stripe Dashboard:
# Webhooks → Add endpoint
# URL: https://<project>.supabase.co/functions/v1/stripe-webhook
# Events to send:
# - checkout.session.completed
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted
# - invoice.paid
# - invoice.payment_failed
```

**4. Deploy Frontend:**
```bash
# Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

---

## 📊 Data Flow Examples

### Example 1: New User Signs Up

```
1. User signs up
   │
   ↓
2. Supabase Auth creates user in auth.users
   │
   ↓
3. Database trigger fires: on_auth_user_created
   │
   ↓
4. Trigger inserts row in subscriptions table:
   {
     user_id: <new_user_id>,
     plan_id: 'free',
     status: 'active'
   }
   │
   ↓
5. Frontend fetches subscription via useSubscription()
   │
   ↓
6. User sees free plan features
```

### Example 2: User Upgrades to Pro

```
1. User clicks "Upgrade to Pro" button
   │
   ↓
2. Frontend calls create-checkout Edge Function:
   POST /functions/v1/create-checkout
   { price_id: 'price_pro_monthly', trial_period_days: 14 }
   │
   ↓
3. Edge Function creates Stripe Checkout session:
   - Sets metadata: { user_id: <user_id> }
   - Returns session URL
   │
   ↓
4. User redirected to Stripe Checkout
   │
   ↓
5. User enters payment info, confirms
   │
   ↓
6. Stripe sends webhook: checkout.session.completed
   │
   ↓
7. Webhook hits stripe-webhook Edge Function
   │
   ↓
8. Edge Function:
   - Verifies signature ✓
   - Extracts user_id from metadata
   - Updates subscriptions table:
     SET plan_id = 'pro',
         status = 'trialing',
         trial_end = NOW() + 14 days,
         stripe_customer_id = <customer_id>,
         stripe_subscription_id = <subscription_id>
   │
   ↓
9. Frontend (useSubscription) sees real-time update
   │
   ↓
10. User now sees Pro features unlocked
```

### Example 3: Trial Ends, Payment Succeeds

```
1. 14 days pass, trial ends
   │
   ↓
2. Stripe charges payment method
   │
   ↓
3. Stripe sends webhook: invoice.paid
   │
   ↓
4. Webhook handler updates:
   SET status = 'active'
   │
   ↓
5. User continues with Pro access (no interruption)
```

### Example 4: Payment Fails

```
1. Monthly payment fails
   │
   ↓
2. Stripe sends webhook: invoice.payment_failed
   │
   ↓
3. Webhook handler updates:
   SET status = 'past_due'
   │
   ↓
4. Frontend detects status change
   │
   ↓
5. <SubscriptionGate> components hide Pro features
   │
   ↓
6. User sees "Update payment method" prompt
   │
   ↓
7. User clicks "Manage subscription"
   │
   ↓
8. Frontend calls create-portal Edge Function
   │
   ↓
9. User redirected to Stripe Customer Portal
   │
   ↓
10. User updates payment method
   │
   ↓
11. Stripe retries payment, succeeds
   │
   ↓
12. Webhook: invoice.paid
   │
   ↓
13. Status updated to 'active'
   │
   ↓
14. Features re-enabled
```

---

## 🎓 Lessons from Autumn

### What to Extract from useautumn/autumn Repository

**Study these patterns (not copy code):**

#### 1. Webhook Event Handling
**File:** `server/src/external/stripe/webhooks/*`

**Learn:**
- How they map Stripe events to internal state
- Metadata handling (customer_id, user_id passing)
- Idempotency strategies
- Error handling patterns
- Race condition prevention

**Example pattern:**
```typescript
// From Autumn: Metadata-driven user lookup
const customerId = event.data.object.metadata?.customer_id
const user = await getUserByCustomerId(customerId)

// Apply to our code:
const userId = event.data.object.metadata?.user_id
await updateSubscription(userId, { status: 'active' })
```

#### 2. Entitlement Logic
**File:** `server/src/core/entitlements/*`

**Learn:**
- Feature access calculations
- Limit enforcement ("unlimited" vs numeric limits)
- Quota tracking patterns
- Overage handling

**Example pattern:**
```typescript
// From Autumn: Feature access check
function hasAccess(subscription, featureId) {
  if (!subscription.isActive()) return false
  return subscription.plan.features.includes(featureId)
}

// Apply to our canAccess():
canAccess(featureSlug: string): boolean {
  if (!['active', 'trialing'].includes(this.status)) return false
  return this.features.includes(featureSlug)
}
```

#### 3. Checkout Flow
**File:** `server/src/routes/attach/*`

**Learn:**
- How to pass metadata through Checkout
- Success/cancel URL handling
- Trial period configuration
- Customer creation strategies

**Example pattern:**
```typescript
// From Autumn: Metadata passing
const session = await stripe.checkout.sessions.create({
  customer_data: { metadata: { customer_id: xxx } },
  subscription_data: { metadata: { customer_id: xxx } }
})

// Apply to our create-checkout:
const session = await stripe.checkout.sessions.create({
  metadata: { user_id: xxx },
  subscription_data: { metadata: { user_id: xxx } }
})
```

#### 4. State Machine Design
**Learn:**
- All possible subscription states
- Valid transitions between states
- Edge case handling (trial → canceled, past_due → active, etc.)

**Apply:**
- Our state machine diagram (already designed above)
- handleStateTransition() logic in webhook handler

---

## 🚦 Architecture Validation Checklist

### ✅ Database
- [x] Single subscriptions table with all needed fields
- [x] RLS policies prevent unauthorized access
- [x] Triggers auto-create subscription on signup
- [x] Indexes for fast lookups
- [x] Foreign key to auth.users with CASCADE

### ✅ Edge Functions
- [x] stripe-webhook handles all events
- [x] Signature verification on every webhook
- [x] Idempotency handling
- [x] create-checkout creates sessions with metadata
- [x] create-portal generates portal URLs
- [x] Service role key used (not anon key)

### ✅ React SDK
- [x] SubscriptionProvider fetches once, provides to all
- [x] Real-time updates via Supabase subscriptions
- [x] SubscriptionGate for feature gating
- [x] PlanGate for plan-level gating
- [x] UpgradePrompt with one-click upgrade
- [x] useSubscription hook for manual checks

### ✅ Security
- [x] RLS enforced on subscriptions table
- [x] Webhook signature verification
- [x] Service role key never exposed to frontend
- [x] Users can't modify own subscriptions directly
- [x] All writes go through Edge Functions

### ✅ State Management
- [x] Clear state machine with valid transitions
- [x] Handles all Stripe subscription states
- [x] Trial period support
- [x] Cancelation support (immediate + at period end)
- [x] Past due → active recovery path

### ✅ Developer Experience
- [x] .cursorrules tells AI how to use system
- [x] Single pricing config file
- [x] Type-safe plan and feature definitions
- [x] Easy to add new features (3-step process)
- [x] No backend changes needed for new features

---

## 🎯 Next Steps

**This architecture is complete and ready for implementation.**

Next document: **BUILD_PLAN.md**
- Week-by-week breakdown
- File-by-file implementation order
- Testing strategy
- Documentation requirements
- Launch checklist

---

**Architecture Status: ✅ Complete**
**Ready for:** Build Plan → Implementation
