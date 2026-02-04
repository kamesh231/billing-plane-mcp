import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { configurePlans } from './tools/configure-plans.js'
import { scanCodebase } from './tools/scan-codebase.js'
import { insertFeatureGates } from './tools/insert-feature-gates.js'
import { generatePricingConfig } from './tools/generate-pricing-config.js'
import { createStripeCatalog } from './tools/create-stripe-catalog.js'
import { writeSupabaseCatalog } from './tools/write-supabase-catalog.js'
import { runSupabaseCli } from './tools/run-supabase-cli.js'
import { saasSetupQuestions } from './tools/saas-setup-questions.js'
import { getLovableEnvTemplate } from './tools/get-lovable-env-template.js'

export const tools: Tool[] = [
  { name: 'configure_plans', description: 'Interactive wizard to configure your SaaS pricing plans.', inputSchema: { type: 'object', properties: { project_path: { type: 'string', description: 'Project root path' } }, required: ['project_path'] } },
  { name: 'scan_codebase', description: 'Scans codebase for feature-gate candidates.', inputSchema: { type: 'object', properties: { project_path: { type: 'string' }, component_patterns: { type: 'array', items: { type: 'string' } } }, required: ['project_path'] } },
  { name: 'insert_feature_gates', description: 'Wraps components with SubscriptionGate.', inputSchema: { type: 'object', properties: { file_path: { type: 'string' }, component_name: { type: 'string' }, feature_slug: { type: 'string' }, fallback_component: { type: 'string' } }, required: ['file_path', 'component_name', 'feature_slug'] } },
  { name: 'generate_pricing_config', description: 'Generates pricing.ts config.', inputSchema: { type: 'object', properties: { project_path: { type: 'string' }, config: { type: 'object' } }, required: ['project_path', 'config'] } },
  { name: 'saas_setup_questions', description: 'Returns SaaS setup questions.', inputSchema: { type: 'object', properties: { project_path: { type: 'string' } }, required: [] } },
  { name: 'create_stripe_catalog', description: 'Creates Stripe Products and Prices.', inputSchema: { type: 'object', properties: { stripe_secret_key: { type: 'string' }, products: { type: 'array' }, prices: { type: 'array' } }, required: ['stripe_secret_key', 'products', 'prices'] } },
  { name: 'write_supabase_catalog', description: 'Inserts catalog into Supabase. Requires supabase_url.', inputSchema: { type: 'object', properties: { supabase_url: { type: 'string' }, supabase_service_role_key: { type: 'string' }, schema: { type: 'string' }, products: { type: 'array' }, prices: { type: 'array' }, entitlements: { type: 'array' }, product_entitlements: { type: 'array' } }, required: ['supabase_url', 'supabase_service_role_key', 'products', 'prices', 'entitlements', 'product_entitlements'] } },
  { name: 'run_supabase_cli', description: 'Runs Supabase CLI subcommands.', inputSchema: { type: 'object', properties: { command: { type: 'string' }, cwd: { type: 'string' } }, required: ['command'] } },
  { name: 'get_lovable_env_template', description: 'Returns env vars for Lovable.', inputSchema: { type: 'object', properties: { supabase_url: { type: 'string' }, supabase_anon_key: { type: 'string' }, stripe_publishable_key: { type: 'string' } }, required: [] } },
]

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export async function executeTool(name: string, args: unknown): Promise<ToolResult> {
  const a = (args || {}) as Record<string, unknown>
  let result: { content: Array<{ type: string; text: string }>; isError?: boolean }
  switch (name) {
    case 'configure_plans':
      result = await configurePlans(a as { project_path: string })
      break
    case 'scan_codebase':
      result = await scanCodebase(a as { project_path: string; component_patterns?: string[] })
      break
    case 'insert_feature_gates':
      result = await insertFeatureGates(a as {
        file_path: string
        component_name: string
        feature_slug: string
        fallback_component?: string
      })
      break
    case 'generate_pricing_config':
      result = await generatePricingConfig(a as Parameters<typeof generatePricingConfig>[0])
      break
    case 'saas_setup_questions':
      result = await saasSetupQuestions(a as { project_path?: string })
      break
    case 'create_stripe_catalog':
      result = await createStripeCatalog(a as {
        stripe_secret_key: string
        products: Array<{ name: string; description?: string; id?: string }>
        prices: Array<{
          product_id: string
          interval: 'month' | 'year'
          amount: number
          currency: string
          trial_days?: number
        }>
      })
      break
    case 'write_supabase_catalog':
      result = await writeSupabaseCatalog(a as {
        supabase_url: string
        supabase_service_role_key: string
        schema?: string
        products: Array<{ id?: string; name: string; description?: string; stripe_product_id?: string | null }>
        prices: Array<{
          product_id: string
          stripe_price_id: string
          interval: string
          amount: number
          currency: string
          trial_days?: number
        }>
        entitlements: Array<{ slug: string; name: string; description?: string; default_unit?: string }>
        product_entitlements: Array<{
          product_id: string
          entitlement_slug: string
          limit_value?: number | null
          limit_unit?: string
        }>
      })
      break
    case 'run_supabase_cli':
      result = await runSupabaseCli(a as { command: string; cwd?: string })
      break
    case 'get_lovable_env_template':
      result = await getLovableEnvTemplate(a as {
        supabase_url?: string
        supabase_anon_key?: string
        stripe_publishable_key?: string
      })
      break
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
  return { ...result, content: result.content.map((c) => ({ type: 'text' as const, text: c.text })) }
}
