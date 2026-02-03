/**
 * Create Stripe Catalog
 *
 * Creates Stripe Products and Prices from user config. V1: recurring only (month/year); no metered.
 */

import Stripe from 'stripe'
import { createHash } from 'crypto'

export interface ProductInput {
  name: string
  description?: string
  id?: string
}

export interface PriceInput {
  product_id: string
  interval: 'month' | 'year'
  amount: number
  currency: string
  trial_days?: number
}

export interface CreateStripeCatalogInput {
  stripe_secret_key: string
  products: ProductInput[]
  prices: PriceInput[]
}

export interface ProductOutput {
  id: string
  name: string
  description?: string
  stripe_product_id: string | null
}

export interface PriceOutput {
  product_id: string
  interval: string
  amount: number
  currency: string
  trial_days?: number
  stripe_price_id: string
}

export interface CreateStripeCatalogOutput {
  products: ProductOutput[]
  prices: PriceOutput[]
}

function idempotencyKey(prefix: string, payload: string): string {
  const hash = createHash('sha256').update(payload).digest('hex').slice(0, 24)
  return `${prefix}_${hash}`
}

export async function createStripeCatalog(args: CreateStripeCatalogInput): Promise<{
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}> {
  const { stripe_secret_key, products, prices } = args

  try {
    const stripe = new Stripe(stripe_secret_key, { apiVersion: '2023-10-16' })

    const productIdToStripeId: Record<string, string | null> = {}
    const productOutputs: ProductOutput[] = []

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const slug = p.id ?? `product_${i}`

      if (p.name.toLowerCase() === 'free') {
        productIdToStripeId[slug] = null
        productOutputs.push({
          id: slug,
          name: p.name,
          description: p.description,
          stripe_product_id: null,
        })
        continue
      }

      const key = idempotencyKey('product', `${p.name}|${p.description ?? ''}`)
      const existing = await stripe.products.list({ limit: 100 })
      const match = existing.data.find((x) => x.name === p.name)
      let stripeProductId: string

      if (match) {
        stripeProductId = match.id
      } else {
        const product = await stripe.products.create(
          {
            name: p.name,
            description: p.description ?? undefined,
          },
          { idempotencyKey: key }
        )
        stripeProductId = product.id
      }

      productIdToStripeId[slug] = stripeProductId
      productOutputs.push({
        id: slug,
        name: p.name,
        description: p.description,
        stripe_product_id: stripeProductId,
      })
    }

    const priceOutputs: PriceOutput[] = []

    for (let i = 0; i < prices.length; i++) {
      const pr = prices[i]
      const stripeProductId = productIdToStripeId[pr.product_id]
      if (!stripeProductId) {
        throw new Error(
          `Cannot create price for product "${pr.product_id}": product is Free or not found.`
        )
      }

      const key = idempotencyKey(
        'price',
        `${stripeProductId}|${pr.interval}|${pr.amount}|${pr.currency}`
      )
      const existing = await stripe.prices.list({
        product: stripeProductId,
        limit: 100,
      })
      const match = existing.data.find(
        (x) =>
          x.recurring?.interval === pr.interval &&
          x.unit_amount === pr.amount &&
          x.currency === pr.currency
      )
      let stripePriceId: string

      if (match) {
        stripePriceId = match.id
      } else {
        const priceParams: Stripe.PriceCreateParams = {
          product: stripeProductId,
          currency: pr.currency,
          unit_amount: pr.amount,
          recurring: { interval: pr.interval },
        }
        if (pr.trial_days && pr.trial_days > 0) {
          priceParams.recurring = {
            ...priceParams.recurring!,
            trial_period_days: pr.trial_days,
          }
        }
        const price = await stripe.prices.create(priceParams, {
          idempotencyKey: key,
        })
        stripePriceId = price.id
      }

      priceOutputs.push({
        product_id: pr.product_id,
        interval: pr.interval,
        amount: pr.amount,
        currency: pr.currency,
        trial_days: pr.trial_days,
        stripe_price_id: stripePriceId,
      })
    }

    const summary = JSON.stringify(
      { products: productOutputs, prices: priceOutputs },
      null,
      2
    )

    return {
      content: [
        {
          type: 'text',
          text: `Stripe catalog created successfully.\n\nProducts: ${productOutputs.length}\nPrices: ${priceOutputs.length}\n\nUse this structure for write_supabase_catalog:\n\n${summary}`,
        },
      ],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Stripe catalog creation failed: ${message}` }],
      isError: true,
    }
  }
}
