# MCP Setup for Lovable Subscription Foundation

**AI-Powered Subscription Billing Setup for Cursor & Claude**

This boilerplate includes an MCP (Model Context Protocol) server that provides AI-powered tools to help you set up subscription billing in your SaaS application.

---

## 🎯 What Can the MCP Server Do?

The MCP server provides 4 powerful tools:

### 1. **configure_plans** - Interactive Pricing Wizard
Ask AI to configure your pricing plans, and it will guide you through:
- Choosing pricing tiers (Free, Pro, Enterprise)
- Setting monthly/yearly prices
- Defining features for each plan
- Configuring usage limits
- Setting up metered billing (optional)
- Adding upsell add-ons (optional)

### 2. **scan_codebase** - Auto-Detect Gatable Features
Automatically scans your React/Next.js codebase and suggests:
- Which components should be feature-gated
- What feature slugs to use
- Confidence level for each suggestion
- AI-powered recommendations based on component names

### 3. **insert_feature_gates** - Auto-Wrap Components
Automatically wraps your components with `<SubscriptionGate>`:
- Adds the necessary imports
- Wraps components in feature gates
- Handles indentation correctly
- Supports fallback components

### 4. **generate_pricing_config** - Generate Config File
Generates your `src/config/pricing.ts` file with:
- Type-safe plan definitions
- Feature flags
- Stripe price IDs (placeholders)
- Helper functions for feature checking

---

## 📦 Installation

### Step 1: Install MCP Server Dependencies

```bash
cd mcp-server
npm install
npm run build
```

This creates the compiled server at `mcp-server/dist/index.js`.

---

## ⚙️ Configuration

### For Cursor IDE

1. Open **Cursor Settings** (⌘/Ctrl + Shift + P → "Cursor Settings")
2. Go to **Tools & MCP**
3. Click **Add MCP Server**
4. Add this configuration:

```json
{
  "mcpServers": {
    "lovable-subscription": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/lovable-stripe-boiler-plate-billing/mcp-server/dist/index.js"]
    }
  }
}
```

**Replace `/ABSOLUTE/PATH/TO/`** with the actual path on your system.

### For Claude Desktop / Claude Code

Add to your MCP configuration file (usually `~/Library/Application Support/Claude/config.json`):

```json
{
  "mcpServers": {
    "lovable-subscription": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/lovable-stripe-boiler-plate-billing/mcp-server/dist/index.js"]
    }
  }
}
```

### For Other MCP Clients

Any MCP-compatible client can use this server. Just run:

```bash
node /path/to/mcp-server/dist/index.js
```

---

## 🚀 Usage Examples

### Example 1: Interactive Pricing Configuration

**In Cursor or Claude, ask:**

> "Help me configure my SaaS pricing plans for my project at /Users/me/my-saas-app"

**The AI will:**
1. Call `configure_plans` with your project path
2. Show you 6 interactive questions
3. Guide you through answering each one
4. Generate pricing configuration based on your answers

**Then it will call:**
- `generate_pricing_config` to create `src/config/pricing.ts`
- Show you next steps for setting up Stripe

---

### Example 2: Auto-Detect Features to Gate

**In Cursor or Claude, ask:**

> "Scan my codebase at /Users/me/my-saas-app and tell me which components should be feature-gated"

**The AI will:**
1. Call `scan_codebase` with your project path
2. Analyze all `.tsx` and `.jsx` files
3. Find components with premium features (analytics, export, AI, etc.)
4. Show confidence levels (high/medium/low)
5. Suggest feature slugs for each component

**Example output:**

```
Found 8 components that should be feature-gated:

| Component          | File                        | Feature    | Confidence |
|--------------------|-----------------------------|------------|------------|
| 🎯 AnalyticsChart  | src/components/Analytics.tsx| analytics  | high       |
| 🎯 ExportButton    | src/components/Export.tsx   | export     | high       |
| 📊 AIGenerator     | src/components/AI.tsx       | ai         | medium     |
```

---

### Example 3: Auto-Insert Feature Gates

**In Cursor or Claude, ask:**

> "Wrap the AnalyticsChart component in src/components/Analytics.tsx with a feature gate for 'advanced-analytics'"

**The AI will:**
1. Call `insert_feature_gates` with parameters
2. Add `import { SubscriptionGate } from 'lovable-subscription-foundation'`
3. Wrap `<AnalyticsChart />` with `<SubscriptionGate slug="advanced-analytics">`
4. Preserve indentation and formatting

**Before:**
```tsx
export function Dashboard() {
  return (
    <div>
      <AnalyticsChart data={metrics} />
    </div>
  )
}
```

**After:**
```tsx
import { SubscriptionGate } from 'lovable-subscription-foundation'

export function Dashboard() {
  return (
    <div>
      <SubscriptionGate slug="advanced-analytics">
        <AnalyticsChart data={metrics} />
      </SubscriptionGate>
    </div>
  )
}
```

---

### Example 4: Complete Setup Flow

**In Cursor or Claude, have a conversation:**

1. **You:** "Help me set up subscription billing for my app at /Users/me/my-app"

2. **AI:** Calls `configure_plans`, shows you 6 questions

3. **You:** Answer the questions:
   ```
   1. Free, Pro, and Enterprise
   2. $49/month or $490/year
   3. Advanced analytics, API access (10k/month), Export data, Priority support
   4. 3 projects, 100 API calls/month, basic analytics only
   5. Yes, AI tokens at $10 per 1000 tokens
   6. No add-ons
   ```

4. **AI:** Calls `generate_pricing_config`, creates `src/config/pricing.ts`

5. **AI:** Calls `scan_codebase`, finds components to gate

6. **You:** "Gate all high-confidence components"

7. **AI:** Calls `insert_feature_gates` for each component automatically

8. **Done!** Your app now has working subscription billing with feature gates

---

## 🔧 MCP Tools Reference

### configure_plans

**Purpose:** Interactive pricing configuration wizard

**Parameters:**
```typescript
{
  project_path: string  // Absolute path to your project root
}
```

**Example:**
```typescript
configure_plans({
  project_path: "/Users/me/my-saas-app"
})
```

---

### scan_codebase

**Purpose:** Scan React/Next.js components for feature gate suggestions

**Parameters:**
```typescript
{
  project_path: string        // Absolute path to your project root
  component_patterns?: string[] // Optional: Custom glob patterns
}
```

**Example:**
```typescript
scan_codebase({
  project_path: "/Users/me/my-saas-app",
  component_patterns: ["src/**/*.tsx", "app/**/*.tsx"]  // Optional
})
```

**Default patterns:**
- `src/**/*.tsx`
- `app/**/*.tsx`
- `components/**/*.tsx`

---

### insert_feature_gates

**Purpose:** Automatically wrap components with `<SubscriptionGate>`

**Parameters:**
```typescript
{
  file_path: string           // Relative path from project root
  component_name: string      // Component name to wrap
  feature_slug: string        // Feature slug from pricing config
  fallback_component?: string // Optional fallback component
}
```

**Example:**
```typescript
insert_feature_gates({
  file_path: "src/components/Analytics.tsx",
  component_name: "AnalyticsChart",
  feature_slug: "advanced-analytics",
  fallback_component: "AnalyticsUpgradePrompt"  // Optional
})
```

---

### generate_pricing_config

**Purpose:** Generate `src/config/pricing.ts` from pricing plan configuration

**Parameters:**
```typescript
{
  project_path: string,
  config: {
    plans: Array<{
      id: string
      name: string
      price_monthly: number
      price_yearly: number
      features: string[]
    }>,
    features: Array<{
      slug: string
      name: string
      description: string
      plans?: string[]
    }>,
    metered_features?: Array<{
      slug: string
      unit_price: number
      unit_name: string
    }>,
    add_ons?: Array<{
      id: string
      name: string
      price: number
    }>
  }
}
```

**Example:**
```typescript
generate_pricing_config({
  project_path: "/Users/me/my-saas-app",
  config: {
    plans: [
      {
        id: "free",
        name: "Free",
        price_monthly: 0,
        price_yearly: 0,
        features: ["basic-analytics", "api-access-1k"]
      },
      {
        id: "pro",
        name: "Pro",
        price_monthly: 49,
        price_yearly: 490,
        features: ["advanced-analytics", "api-access-10k", "export-data"]
      }
    ],
    features: [
      {
        slug: "advanced-analytics",
        name: "Advanced Analytics",
        description: "View detailed analytics and reports",
        plans: ["pro", "enterprise"]
      }
    ]
  }
})
```

---

## 🎨 Best Practices

### 1. Start with Configuration
Always run `configure_plans` first to set up your pricing structure before gating components.

### 2. Scan Before Manual Gating
Run `scan_codebase` to get AI suggestions before manually adding gates. It saves time and ensures consistency.

### 3. Use Descriptive Feature Slugs
Use kebab-case slugs that clearly describe the feature:
- ✅ `advanced-analytics`, `export-data`, `ai-generation`
- ❌ `feature1`, `premium`, `addon`

### 4. Test Each Plan Tier
After inserting gates, test your app as:
- Free user (no subscription)
- Pro user (subscription)
- Enterprise user (if applicable)

### 5. Update Stripe Price IDs
After running `generate_pricing_config`, remember to:
1. Create products in Stripe Dashboard
2. Replace placeholder price IDs in `pricing.ts`
3. Update environment variables

---

## 🐛 Troubleshooting

### "No package.json found"
**Fix:** Provide the correct absolute path to your project root (where `package.json` is located).

### "Component not found in file"
**Fix:** Make sure the component is actually being used in JSX in that file. The tool looks for `<ComponentName />` usage, not just the definition.

### "MCP server not connecting"
**Fix:**
1. Check that MCP server is built: `cd mcp-server && npm run build`
2. Verify the path in your MCP configuration is absolute and correct
3. Restart Cursor/Claude after changing MCP config

### "Import already exists" error
**Fix:** The tool checks for existing imports. If you see this, the import was already added. This is expected behavior.

---

## 📚 Next Steps

After setting up the MCP server:

1. **Configure Pricing:** Ask AI to run `configure_plans`
2. **Scan Codebase:** Ask AI to run `scan_codebase`
3. **Insert Gates:** Ask AI to wrap suggested components
4. **Test Locally:** Run `npm run dev` and test subscription flow
5. **Set Up Stripe:** Create products and update price IDs
6. **Deploy:** Follow deployment guide in `README.md`

---

## 🤝 Examples in Action

### Complete Onboarding with AI

**Copy-paste this into Cursor/Claude:**

> I just bought the Lovable Subscription Foundation boilerplate. My project is at /Users/me/my-project.
>
> Please help me:
> 1. Configure my pricing plans (Free at $0, Pro at $29/month)
> 2. Scan my codebase for components that should be gated
> 3. Automatically insert feature gates for all high-confidence suggestions
> 4. Show me how to test the subscription flow
>
> Walk me through each step.

**The AI will:**
1. Call `configure_plans` and guide you through the wizard
2. Call `generate_pricing_config` to create config files
3. Call `scan_codebase` to find gatable components
4. Call `insert_feature_gates` for each suggested component
5. Provide testing instructions

---

## 🎯 Summary

**Without MCP:** Manual editing of config files, manually wrapping components, trial and error

**With MCP:** AI-powered configuration, auto-detection of gatable features, one-click component wrapping

The MCP server transforms the setup experience from hours of manual work to minutes of guided AI assistance.

---

**Questions?** See `README.md` or `LICENSE_SYSTEM.md` for more information.

**Last Updated:** 2026-02-03
