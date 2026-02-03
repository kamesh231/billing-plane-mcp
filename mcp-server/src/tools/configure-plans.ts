/**
 * Interactive Pricing Plan Configuration
 *
 * Guides users through setting up their SaaS pricing plans with AI-powered prompts
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function configurePlans(args: { project_path: string }) {
  const { project_path } = args

  // Verify project exists
  if (!existsSync(join(project_path, 'package.json'))) {
    throw new Error(`No package.json found at ${project_path}. Please provide the correct project path.`)
  }

  // Interactive prompts for pricing configuration
  const prompts = `
# 🎯 SaaS Pricing Configuration Wizard

Let's set up your subscription billing! I'll ask you a few questions to configure your pricing plans.

---

## Question 1: Pricing Plans

**What pricing tiers do you want to offer?**

Common options:
- Free + Pro (most common for early-stage SaaS)
- Free + Pro + Enterprise (for B2B SaaS)
- Pro only (no free tier)
- Multiple tiers (Starter, Professional, Business, Enterprise)

💡 **Recommendation:** Start with Free + Pro. You can add Enterprise later.

**Your answer:** (e.g., "Free, Pro, and Enterprise")

---

## Question 2: Pro Plan Pricing

**What should the Pro plan cost?**

Examples:
- $19/month or $190/year (10-20% yearly discount)
- $49/month or $490/year
- $99/month or $990/year

💡 **Tip:** Price based on value delivered, not cost. B2C: $9-$49. B2B: $49-$299+.

**Your answer:** (e.g., "$29/month or $290/year")

---

## Question 3: Pro Plan Features

**What features are included in the Pro plan?**

Examples:
- Advanced analytics
- API access (10k requests/month)
- Export data to CSV/PDF
- Priority email support
- Custom branding
- Remove "Powered by" badge

💡 **Tip:** List 5-7 killer features that justify the price.

**Your answer:** (comma-separated list)

---

## Question 4: Free Plan Limits

**What are the usage limits for the Free plan?**

Examples:
- 3 projects max
- 100 API calls/month
- Basic analytics only
- Community support
- "Powered by" badge shown

💡 **Strategy:** Free tier should be useful but constrained. Users should hit limits naturally.

**Your answer:** (e.g., "5 projects, 500 API calls/month, basic analytics")

---

## Question 5: Metered Features

**Do you want metered/usage-based billing for any features?**

Examples:
- ✅ AI tokens (charge per 1000 tokens)
- ✅ API calls (charge per 1000 requests)
- ✅ Storage (charge per GB)
- ❌ No metered features (simpler)

💡 **Note:** Metered billing is more complex but can increase revenue.

**Your answer:** (e.g., "Yes, AI tokens at $5 per 1000 tokens" or "No")

---

## Question 6: Add-ons

**Do you want optional add-ons that users can purchase separately?**

Examples:
- Extra storage ($10/month per 10GB)
- Additional team members ($5/month per seat)
- White-label option ($50/month)
- Priority support ($29/month)

💡 **Strategy:** Add-ons increase ARPU without complicating main plans.

**Your answer:** (e.g., "Extra storage, additional team members" or "No add-ons")

---

## 📊 What Happens Next

After you answer these questions, I will:

1. ✅ Generate \`src/config/pricing.ts\` with your plans
2. ✅ Create Stripe price IDs (test mode)
3. ✅ Configure feature flags
4. ✅ Set up subscription gates
5. ✅ Generate upgrade prompts

**Reply with your answers** to each question, and I'll configure everything automatically!

---

**Example answer format:**

\`\`\`
1. Free, Pro, and Enterprise
2. $49/month or $490/year
3. Advanced analytics, API access (10k/month), Export data, Priority support, Custom branding
4. 3 projects, 100 API calls/month, basic analytics only
5. Yes, AI tokens at $10 per 1000 tokens
6. Extra storage ($15/month per 10GB)
\`\`\`

`

  return {
    content: [
      {
        type: 'text',
        text: prompts,
      },
    ],
  }
}
