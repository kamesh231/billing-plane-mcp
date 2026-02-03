/**
 * Get Lovable Env Template
 *
 * Returns the list of environment variables the user must set in Lovable
 * (no API; manual paste). Optionally prefills from provided values.
 */

export interface GetLovableEnvTemplateInput {
  supabase_url?: string
  supabase_anon_key?: string
  stripe_publishable_key?: string
}

export async function getLovableEnvTemplate(
  args: GetLovableEnvTemplateInput = {}
): Promise<{
  content: Array<{ type: 'text'; text: string }>
}> {
  const {
    supabase_url = '',
    supabase_anon_key = '',
    stripe_publishable_key = '',
  } = args

  const text = `# Lovable Environment Variables

Set these in **Lovable project settings** (Environment Variables). There is no API; paste each key-value pair manually.

---

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=${supabase_url || 'https://YOUR_PROJECT_REF.supabase.co'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabase_anon_key || 'YOUR_ANON_KEY'}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${stripe_publishable_key || 'pk_test_...'}
\`\`\`

---

**Steps:**
1. Open your Lovable project.
2. Go to Project Settings (or Environment / Variables).
3. Add each variable above. Replace placeholders with your actual values from:
   - Supabase Dashboard → Settings → API (Project URL, anon public key)
   - Stripe Dashboard → Developers → API keys (Publishable key)
4. Save and redeploy if needed.
`

  return {
    content: [{ type: 'text', text }],
  }
}
