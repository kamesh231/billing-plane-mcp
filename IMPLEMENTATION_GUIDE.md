# Implementation Guide - Cursor-Driven Milestone Approach

**For Lovable Subscription Foundation**

---

## 🎯 Overview

This project uses a **milestone-based implementation approach** designed for Cursor AI.

**Billing schema (Milestone 1 / PHASED_BILLING_PLAN):** All billing tables live in the `billing` schema (`billing.subscriptions`, `billing.products`, `billing.prices`, etc.). New users get a free subscription row in `billing.subscriptions` via a trigger on `auth.users`, and the app calls the `ensure-stripe-customer` Edge Function so every user has a Stripe Customer (free users can open Customer Portal for upgrade without Checkout). Each milestone has:

✅ **Clear outcome** - What gets built
✅ **Testable verification** - How to verify it works
✅ **Rollback procedure** - How to undo if needed
✅ **Incremental progress** - Gain confidence step-by-step

**Total Implementation Time:** 2.5-3 hours (tested and verified)

---

## 🚀 How to Use with Cursor

### Step 1: Open Project in Cursor

```bash
cd /Users/kameshpriyanka/Documents/SideProjects/lovable-stripe-boiler-plate-billing
cursor .
```

### Step 2: Start with Milestone 1

In Cursor chat, type:
```
@milestones /milestone-1

I need to configure this project with my credentials:
- Supabase Project URL: https://abcdefgh.supabase.co
- Supabase Anon Key: eyJhbGc...
- Supabase Service Role Key: eyJhbGc...
- Stripe Publishable Key: pk_test_...
- Stripe Secret Key: sk_test_...
- Stripe Pro Price ID: price_1ABc...
- Stripe Enterprise Price ID: price_xyz...

Please generate all configuration files.
```

**Cursor will:**
1. Read `MILESTONES.md` for Milestone 1 instructions
2. Generate `.env.local` with your actual keys
3. Update `src/config/pricing.ts` with your Stripe price IDs
4. Provide verification commands

### Step 3: Verify Milestone 1

Run the verification commands Cursor provides:
```bash
# Check files exist
ls .env.local
ls src/config/pricing.ts

# Verify no placeholders
grep "your-project" .env.local  # Should return nothing
grep "price_xxx" src/config/pricing.ts  # Should return nothing
```

✅ **If all checks pass:** Confirm to Cursor and move to Milestone 2
❌ **If any check fails:** Run rollback and retry

### Step 4: Continue with Each Milestone

Repeat the pattern for each milestone:
```
@milestones /milestone-2
# Cursor implements Milestone 2

# You verify it works

@milestones /milestone-3
# Cursor implements Milestone 3

# And so on...
```

---

## 📋 Milestone Summary

| # | Milestone | Time | What You Get |
|---|-----------|------|--------------|
| 1 | [Project Configuration](./MILESTONES.md#milestone-1-project-configuration) | 15m | Config files with your keys |
| 2 | [Database Deployment](./MILESTONES.md#milestone-2-database-deployment) | 10m | Subscriptions table in Supabase |
| 3 | [Webhook Handler](./MILESTONES.md#milestone-3-stripe-webhook-handler) | 20m | Stripe events processed |
| 4 | [Checkout Function](./MILESTONES.md#milestone-4-checkout-edge-function) | 15m | Users can upgrade |
| 5 | [Portal Function](./MILESTONES.md#milestone-5-customer-portal-edge-function) | 10m | Users can manage subscription |
| 6 | [React Provider](./MILESTONES.md#milestone-6-react-sdk-provider) | 15m | Subscription state in app |
| 7 | [React Gates](./MILESTONES.md#milestone-7-react-sdk-gates) | 20m | Feature gating works |
| 8 | [License Badge](./MILESTONES.md#milestone-8-license-badge-monetization) | 15m | Monetization enabled |
| 9 | [E2E Testing](./MILESTONES.md#milestone-9-end-to-end-testing) | 30m | Everything verified |
| 10 | [Production Deploy](./MILESTONES.md#milestone-10-production-deployment) | 20m | Live and accepting payments |

---

## 🎨 Monetization Strategy

### Free Tier (MIT License)

**What Users Get:**
- ✅ Full source code
- ✅ All features
- ✅ Use for 1 project
- ✅ Community support

**What They See:**
- 💡 License badge: "Powered by Lovable Subscription Foundation"
- 🔗 Badge links to your product page
- 📍 Badge position: bottom-right (customizable)
- 💫 Professional, non-intrusive design

**Implementation:**
```tsx
import { LicenseBadge } from 'lovable-subscription-foundation'

// In your app layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <LicenseBadge />  {/* Shows in free tier */}
      </body>
    </html>
  )
}
```

### Pro Tier ($49 one-time)

**What Users Get:**
- ✅ Everything in Free
- ✅ Remove license badge
- ✅ Unlimited projects
- ✅ Commercial use
- ✅ Email support
- ✅ Lifetime updates (1 year)

**How to Remove Badge:**
```bash
# User adds to .env.local:
NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE=true

# Badge automatically disappears
```

**Purchase Flow:**
1. User visits your product page
2. Clicks "Buy Pro License"
3. Pays $49 via Stripe/Gumroad/Lemon Squeezy
4. Receives license key and instructions
5. Sets env variable
6. Badge removed ✅

---

## 🔧 Badge Variants

### 1. Fixed Position Badge (Default)
```tsx
import { LicenseBadge } from 'lovable-subscription-foundation'

<LicenseBadge position="bottom-right" />
```

**Positions:** `bottom-right`, `bottom-left`, `top-right`, `top-left`

### 2. Inline Badge (for embedding)
```tsx
import { InlineLicenseBadge } from 'lovable-subscription-foundation'

<footer>
  <InlineLicenseBadge />
</footer>
```

### 3. Footer Badge (for page footers)
```tsx
import { FooterLicenseBadge } from 'lovable-subscription-foundation'

<footer>
  <FooterLicenseBadge />
</footer>
```

### 4. Custom Badge
```tsx
import { LICENSE_CONFIG } from 'lovable-subscription-foundation'

{!LICENSE_CONFIG.isPro && (
  <a href={LICENSE_CONFIG.productUrl}>
    Custom badge text
  </a>
)}
```

---

## 🧪 Testing the Badge

### Test Free Version
```bash
# Remove license env var
unset NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE

# Start app
npm run dev

# Expected: Badge appears in bottom-right
```

### Test Pro Version
```bash
# Add license env var
echo "NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE=true" >> .env.local

# Start app
npm run dev

# Expected: Badge does NOT appear
```

---

## 📊 License Checking Logic

The license check is **honor-based** (no phone-home, no tracking):

```typescript
// src/config/license.ts
export const LICENSE_CONFIG = {
  isPro: !!process.env.NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE,
  isFree: !process.env.NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE,
  badge: {
    show: !process.env.NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_PRO_LICENSE
  }
}
```

**Benefits of Honor System:**
- ✅ No backend required
- ✅ No tracking/privacy concerns
- ✅ Works offline
- ✅ Simple to implement
- ✅ Respects user privacy

**Why It Works:**
- Professional developers respect licenses
- Badge is easy to remove (just set env var)
- Social proof (badge links to product)
- Most users buy Pro to support development

---

## 🎯 Milestone Implementation Tips

### Do's ✅

1. **Complete one milestone at a time**
   ```
   ✅ Milestone 1 → Verify → Milestone 2 → Verify → ...
   ❌ Milestone 1, 2, 3 → Verify all at once
   ```

2. **Verify before moving forward**
   - Run ALL verification commands
   - Check ALL success criteria
   - Don't skip tests

3. **Use rollback if needed**
   - If verification fails, rollback immediately
   - Fix the issue
   - Re-implement the milestone

4. **Keep verification output**
   - Save command outputs
   - Screenshot passing tests
   - Document any issues

### Don'ts ❌

1. **Don't skip milestones**
   - Each milestone builds on previous
   - Dependencies must be in place

2. **Don't batch implement**
   - Don't do 3 milestones then test
   - Test incrementally

3. **Don't modify files outside milestone scope**
   - Milestone 3 = webhook only
   - Don't also modify checkout function

4. **Don't proceed with failing tests**
   - If verification fails, STOP
   - Fix or rollback
   - Then continue

---

## 🚨 Common Pitfalls

### Pitfall 1: Skipping Verification
**Problem:** "I implemented Milestone 1-5, now nothing works"
**Solution:** Go back to Milestone 1, verify each one

### Pitfall 2: Wrong Credentials
**Problem:** "Database migration fails"
**Solution:** Verify `.env.local` has correct Supabase URL

### Pitfall 3: Outdated Dependencies
**Problem:** "Package not found"
**Solution:** Run `npm install` after Milestone 1

### Pitfall 4: Mixed Test/Live Keys
**Problem:** "Webhook not working"
**Solution:** Ensure all keys are from same environment (test or live)

---

## 📈 Progress Tracking

Use this checklist in `MILESTONES.md`:

```markdown
## Implementation Progress

- [ ] M1: Project Configuration (15 min)
  ✓ .env.local created
  ✓ pricing.ts updated
  ✓ No placeholders remain

- [ ] M2: Database Deployment (10 min)
  ✓ Migration ran successfully
  ✓ Table exists
  ✓ RLS enabled

- [ ] M3: Webhook Handler (20 min)
  ✓ Function deployed
  ✓ Test event processed
  ✓ Database updated

...and so on
```

---

## 🎓 Learning Resources

### Milestone-Based Development
- [Why Milestones Work](https://martinfowler.com/articles/agile-milestones.html)
- [Incremental Development](https://en.wikipedia.org/wiki/Incremental_build_model)

### Stripe Integration
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

### Supabase
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 💬 Getting Help

### During Implementation

If you get stuck on a milestone:

1. **Check MILESTONES.md**
   - Read "Common Issues & Solutions" section
   - Follow troubleshooting steps

2. **Ask Cursor**
   ```
   @milestones I'm stuck on Milestone X. The verification step Y is failing
   with error Z. What should I do?
   ```

3. **Check Logs**
   ```bash
   # Supabase logs
   supabase functions logs <function-name>

   # Browser console
   # Open DevTools → Console

   # Database
   supabase db shell
   ```

4. **Rollback and Retry**
   - Follow rollback procedure in milestone
   - Re-read instructions carefully
   - Implement again

### After Implementation

- GitHub Issues: [Link to your repo]
- Email Support: support@lovable-subscription.dev (Pro users)
- Community: [Discord/Forum link]

---

## 🎉 Success!

**After completing all 10 milestones, you'll have:**

✅ Complete subscription billing system
✅ Feature gating working
✅ Stripe integration live
✅ Customer portal functional
✅ License badge for monetization
✅ Production-ready deployment

**Time invested:** 2.5-3 hours
**Value delivered:** Weeks of development saved

---

## 📝 Next Steps After Implementation

1. **Customize Pricing**
   - Edit `src/config/pricing.ts`
   - Add your features
   - Set your prices

2. **Add to Your App**
   - Wrap app with `<SubscriptionProvider>`
   - Add `<SubscriptionGate>` to features
   - Create pricing page

3. **Launch**
   - Deploy to production
   - Test with real card
   - Announce to customers

4. **Monetize**
   - List Pro license for sale
   - Share on Indie Hackers, Twitter
   - Collect testimonials

---

**Ready to start?** → [Begin with Milestone 1](./MILESTONES.md#milestone-1-project-configuration)
