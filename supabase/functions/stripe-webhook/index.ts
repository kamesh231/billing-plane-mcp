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

// Initialize Supabase with service_role key (bypasses RLS); billing tables in billing schema
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const billing = supabase.schema('billing')

/** Resolve Stripe price ID to plan_id from billing.prices + billing.products (Milestone 2). */
async function resolvePlanIdFromPrice(stripePriceId: string): Promise<string> {
  const { data, error } = await billing
    .from('prices')
    .select('products(name)')
    .eq('stripe_price_id', stripePriceId)
    .single()
  if (error || !data) return 'free'
  const products = data as { products: { name: string } | null }
  const name = products?.products?.name
  if (!name) return 'free'
  return name.toLowerCase()
}

/** Sync Stripe subscription items to billing.subscription_items (Milestone 2). Grant-safe delete: remove items no longer in Stripe (Milestone 3). */
async function syncSubscriptionItems(
  stripeSubscriptionId: string,
  userId: string,
  items: Stripe.SubscriptionItem[]
): Promise<void> {
  const { data: subRow } = await billing
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (!subRow?.id) return

  const stripeItemIds: string[] = []

  for (const item of items) {
    const stripePriceId = item.price.id
    const { data: priceRow } = await billing
      .from('prices')
      .select('id')
      .eq('stripe_price_id', stripePriceId)
      .single()
    if (!priceRow?.id) continue

    await billing
      .from('subscription_items')
      .upsert(
        {
          subscription_id: subRow.id,
          price_id: priceRow.id,
          stripe_subscription_item_id: item.id,
          quantity: item.quantity ?? 1,
        },
        { onConflict: ['subscription_id', 'stripe_subscription_item_id'] }
      )
    stripeItemIds.push(item.id)
  }

  // Grant-safe delete: remove rows for this subscription that are no longer in Stripe
  if (stripeItemIds.length > 0) {
    await billing
      .from('subscription_items')
      .delete()
      .eq('subscription_id', subRow.id)
      .not('stripe_subscription_item_id', 'in', stripeItemIds)
  } else {
    // No items in Stripe → delete all subscription_items for this subscription
    await billing
      .from('subscription_items')
      .delete()
      .eq('subscription_id', subRow.id)
  }
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

  // Determine plan from price (Milestone 2: from billing.prices + products)
  const priceId = subscription.items.data[0].price.id
  const planId = await resolvePlanIdFromPrice(priceId)

  // Update subscription in database (billing schema)
  const { error } = await billing
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

  // Sync subscription items to billing.subscription_items (Milestone 2)
  await syncSubscriptionItems(subscriptionId, userId, subscription.items.data)

  console.log(`Checkout completed for user ${userId}, plan: ${planId}`)
}

// Handler: customer.subscription.created
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  // Fallback when subscription created outside checkout (e.g. Portal); sync plan + items (Milestone 2)
  const customerId = subscription.customer as string
  const { data: subRow } = await billing
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()
  if (!subRow?.user_id) {
    console.log(`Subscription created: ${subscription.id}, no local subscription for customer`)
    return
  }
  const priceId = subscription.items.data[0]?.price.id
  const planId = priceId ? await resolvePlanIdFromPrice(priceId) : 'free'
  await billing
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: subscription.status,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('user_id', subRow.user_id)
  await syncSubscriptionItems(subscription.id, subRow.user_id, subscription.items.data)
  console.log(`Subscription created for user ${subRow.user_id}, plan: ${planId}`)
}

// Handler: customer.subscription.updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Find user by Stripe customer ID (billing schema)
  const { data, error: fetchError } = await billing
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (fetchError || !data) {
    console.error('No subscription found for customer:', customerId)
    return
  }

  // Determine plan from price (Milestone 2: from billing.prices + products)
  const priceId = subscription.items.data[0]?.price.id
  const planId = priceId ? await resolvePlanIdFromPrice(priceId) : 'free'

  // Update subscription (billing schema)
  const { error } = await billing
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

  // Sync subscription items (Milestone 2)
  await syncSubscriptionItems(subscription.id, data.user_id, subscription.items.data)

  console.log(`Subscription updated for user ${data.user_id}, status: ${subscription.status}`)
}

// Handler: customer.subscription.deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const { error } = await billing
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

  // If subscription was past_due, move back to active (billing schema)
  const { error } = await billing
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

  const { error } = await billing
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Database update error:', error)
    throw error
  }

  console.log(`Invoice payment failed for customer ${customerId}`)
}
