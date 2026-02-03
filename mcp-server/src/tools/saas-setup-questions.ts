/**
 * SaaS Setup Questions
 *
 * Returns structured questions for SaaS setup (products, prices, entitlements,
 * product_entitlements with limits). V1: no metered billing.
 */

export interface SaasSetupQuestionsInput {
  project_path?: string
}

export async function saasSetupQuestions(
  _args: SaasSetupQuestionsInput
): Promise<{
  content: Array<{ type: 'text'; text: string }>
}> {
  const text = `# SaaS Setup Questions (V1 – no metered billing)

Answer these so we can create your Stripe catalog and Supabase catalog. Reply in one message or step by step.

---

## 1. Products (what you sell)

**List your products.** Include at least: Free, and one or more paid tiers (e.g. Pro, Enterprise). Optional add-ons: Extra Seat, etc.

For each product give:
- **id** (slug, e.g. \`free\`, \`pro\`, \`enterprise\`)
- **name** (display name)
- **description** (optional)

Example:
- free | Free | For trying out the platform
- pro | Pro | For growing teams
- enterprise | Enterprise | For large teams

---

## 2. Prices (how you charge)

**For each paid product**, define one or more prices (recurring only in V1: month or year).

For each price give:
- **product_id** (slug from step 1, e.g. \`pro\`)
- **interval**: \`month\` or \`year\`
- **amount** (in smallest currency unit, e.g. 99900 for ₹999, or 2900 for $29)
- **currency** (e.g. \`inr\`, \`usd\`)
- **trial_days** (optional, e.g. 14)

Example:
- pro | month | 99900 | inr | 14
- pro | year | 999900 | inr | 0
- enterprise | month | 99900 | inr | 0

---

## 3. Entitlements (features / gating)

**List entitlements** (things you gate or limit). Each has:
- **slug** (e.g. \`storage\`, \`crm_deals\`, \`analytics\`)
- **name** (display name)
- **description** (optional)
- **default_unit** (optional, e.g. \`GB\`, \`count\`)

Example:
- storage | Storage | Storage capacity | GB
- crm_deals | CRM Deals | Deals you can create | count
- analytics | Analytics | Advanced analytics | 

---

## 4. Product entitlements (access + limits per product)

**For each product**, say which entitlements it includes and the limit (if any). \`limit_value\` null = unlimited.

For each row give:
- **product_id** (slug from step 1)
- **entitlement_slug** (from step 3)
- **limit_value** (number or "unlimited")
- **limit_unit** (optional override, e.g. GB)

Example:
- free | storage | 15 | GB
- free | crm_deals | 100 | count
- pro | storage | 200 | GB
- pro | crm_deals | 10000 | count
- pro | analytics | unlimited |
- enterprise | storage | unlimited |
- enterprise | crm_deals | unlimited |
- enterprise | analytics | unlimited |

---

**V1:** Metered/usage-based billing is not supported. Only recurring (month/year) prices.

After you answer, I will ask for your Stripe secret key and Supabase credentials, then create Products and Prices in Stripe and write the catalog to Supabase.
`

  return {
    content: [{ type: 'text', text }],
  }
}
