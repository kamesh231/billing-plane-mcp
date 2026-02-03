/**
 * Write Supabase Catalog
 *
 * Inserts products, prices, entitlements, and product_entitlements into Supabase
 * using the schema from migration 002.
 */

import { createClient } from '@supabase/supabase-js'

export interface ProductInput {
  id?: string
  name: string
  description?: string
  stripe_product_id?: string | null
}

export interface PriceInput {
  product_id: string
  stripe_price_id: string
  interval: string
  amount: number
  currency: string
  trial_days?: number
}

export interface EntitlementInput {
  slug: string
  name: string
  description?: string
  default_unit?: string
}

export interface ProductEntitlementInput {
  product_id: string
  entitlement_slug: string
  limit_value?: number | null
  limit_unit?: string
}

export interface WriteSupabaseCatalogInput {
  supabase_url: string
  supabase_service_role_key: string
  /** Schema for billing tables. Use "billing" after Milestone 1 (PHASED_BILLING_PLAN.md); default "public". */
  schema?: string
  products: ProductInput[]
  prices: PriceInput[]
  entitlements: EntitlementInput[]
  product_entitlements: ProductEntitlementInput[]
}

export async function writeSupabaseCatalog(args: WriteSupabaseCatalogInput): Promise<{
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}> {
  const {
    supabase_url,
    supabase_service_role_key,
    schema = 'public',
    products,
    prices,
    entitlements,
    product_entitlements,
  } = args

  try {
    const supabase = createClient(supabase_url, supabase_service_role_key)
    const db = schema && schema !== 'public' ? supabase.schema(schema) : supabase

    const productIdToUuid: Record<string, string> = {}

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const slug = p.id ?? `product_${i}`
      const { data, error } = await db
        .from('products')
        .insert({
          name: p.name,
          description: p.description ?? null,
          stripe_product_id: p.stripe_product_id ?? null,
        })
        .select('id')
        .single()

      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await db
            .from('products')
            .select('id')
            .eq('name', p.name)
            .single()
          if (existing?.id) {
            productIdToUuid[slug] = existing.id
            continue
          }
        }
        throw new Error(`products insert failed: ${error.message}`)
      }
      if (!data?.id) throw new Error('products insert returned no id')
      productIdToUuid[slug] = data.id
    }

    for (const pr of prices) {
      const productUuid = productIdToUuid[pr.product_id]
      if (!productUuid) {
        throw new Error(`product_id "${pr.product_id}" not found in products`)
      }
      const { error } = await db.from('prices').insert({
        product_id: productUuid,
        stripe_price_id: pr.stripe_price_id,
        interval: pr.interval,
        amount: pr.amount,
        currency: pr.currency,
        trial_days: pr.trial_days ?? 0,
      })
      if (error) {
        if (error.code === '23505') continue
        throw new Error(`prices insert failed: ${error.message}`)
      }
    }

    for (const e of entitlements) {
      const { error } = await db.from('entitlements').insert({
        slug: e.slug,
        name: e.name,
        description: e.description ?? null,
        default_unit: e.default_unit ?? null,
      })
      if (error) {
        if (error.code === '23505') continue
        throw new Error(`entitlements insert failed: ${error.message}`)
      }
    }

    for (const pe of product_entitlements) {
      const productUuid = productIdToUuid[pe.product_id]
      if (!productUuid) {
        throw new Error(`product_id "${pe.product_id}" not found for product_entitlements`)
      }
      const { error } = await db.from('product_entitlements').insert({
        product_id: productUuid,
        entitlement_slug: pe.entitlement_slug,
        limit_value: pe.limit_value ?? null,
        limit_unit: pe.limit_unit ?? null,
      })
      if (error) {
        if (error.code === '23505') continue
        throw new Error(`product_entitlements insert failed: ${error.message}`)
      }
    }

    const schemaNote = schema && schema !== 'public' ? `\n- schema: ${schema}` : ''
    const summary = `Supabase catalog written successfully.

- products: ${products.length}
- prices: ${prices.length}
- entitlements: ${entitlements.length}
- product_entitlements: ${product_entitlements.length}${schemaNote}
`

    return {
      content: [{ type: 'text', text: summary }],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Supabase catalog write failed: ${message}` }],
      isError: true,
    }
  }
}
