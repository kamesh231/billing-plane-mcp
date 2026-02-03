// Lovable Subscription Foundation
// Edge Function: stripe-webhook
// Purpose: Handle all Stripe webhook events and update subscription state

import Stripe from 'https://esm.sh/stripe@14.3.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Initialize Supabase with service_role key (bypasses RLS)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Price ID to Plan ID mapping
// TODO: Load this from pricing config
const PRICE_TO_PLAN_MAP: Record<string, string> = {
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
  'price_enterprise_monthly': 'enterprise',
  'price_enterprise_yearly': 'enterprise',
}

// In-memory idempotency store (for MVP)
// Production: Use Redis or database table with TTL
const processedEvents = new Set<string>()

Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Get webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    // Get raw body
    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    // Check idempotency
    if (processedEvents.has(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`)
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing event: ${event.type} (${event.id})`)

    // Route to appropriate handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    processedEvents.add(event.id)

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Handler: checkout.session.completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!userId) {
    console.error('No user_id in session metadata')
    return
  }

  // Fetch subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Determine plan from price
  const priceId = subscription.items.data[0].price.id
  const planId = PRICE_TO_PLAN_MAP[priceId] || 'free'

  // Update subscription in database
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_id: planId,
      status: subscription.status,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Database update error:', error)
    throw error
  }

  console.log(`Checkout completed for user ${userId}, plan: ${planId}`)
}

// Handler: customer.subscription.created
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  // Usually handled by checkout.session.completed
  // This is a fallback for direct subscription creation
  console.log(`Subscription created: ${subscription.id}`)
}

// Handler: customer.subscription.updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user by Stripe customer ID
  const { data, error: fetchError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (fetchError || !data) {
    console.error('No subscription found for customer:', customerId)
    return
  }

  // Determine plan from price
  const priceId = subscription.items.data[0].price.id
  const planId = PRICE_TO_PLAN_MAP[priceId] || 'free'

  // Update subscription
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('user_id', data.user_id)

  if (error) {
    console.error('Database update error:', error)
    throw error
  }

  console.log(`Subscription updated for user ${data.user_id}, status: ${subscription.status}`)
}

// Handler: customer.subscription.deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      plan_id: 'free', // Downgrade to free
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Database update error:', error)
    throw error
  }

  console.log(`Subscription deleted for customer ${customerId}`)
}

// Handler: invoice.paid
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // If subscription was past_due, move back to active
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('stripe_customer_id', customerId)
    .eq('status', 'past_due')

  if (error) {
    console.error('Database update error:', error)
    throw error
  }

  console.log(`Invoice paid for customer ${customerId}`)
}

// Handler: invoice.payment_failed
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Database update error:', error)
    throw error
  }

  console.log(`Invoice payment failed for customer ${customerId}`)
}
