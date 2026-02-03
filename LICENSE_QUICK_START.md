# License System Quick Start

**5-minute guide to using the encrypted license system**

---

## For Sellers (Generating Licenses)

### Quick Commands

```bash
# Interactive mode (easiest)
npm run license:generate

# One-line generation
npm run license:generate -- --email customer@example.com --tier pro

# Enterprise license
npm run license:generate -- --email company@example.com --tier enterprise

# Test a license key
npm run license:test -- "LSF-{paste_key_here}"
```

### Email Template

```
Subject: Your Lovable Subscription Foundation Pro License

Hi [Customer],

Thank you for your purchase! Here's your license key:

LSF-{paste_generated_key_here}

To activate:
1. Open .env.local in your project
2. Add: NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=LSF-{key}
3. Restart your dev server
4. The badge will disappear ✨

Questions? Reply to this email.

Best,
[Your Name]
```

---

## For Buyers (Using Licenses)

### Step 1: Add License Key

```bash
# Create or edit .env.local
echo "NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=LSF-{your_key}" >> .env.local
```

### Step 2: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 3: Verify

```bash
# Badge should disappear
# Check in browser console:
# LICENSE_CONFIG.isPro should be true
```

---

## Testing

### Generate Test License
```bash
npm run license:generate -- --email test@example.com --tier pro
```

### Validate License
```bash
npm run license:test -- "LSF-U2FsdGVkX18qo8MGKXbmXKet4S6B1..."
```

### Expected Output
```
✅ Valid: true
📊 Tier: pro
📧 Email: test@example.com
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Badge still showing | Check env var is set, restart server |
| "Invalid format" | Ensure complete key copied (200+ chars) |
| "Failed to decrypt" | Request new key from seller |
| License not found | Add to `.env.local`, not `.env` |

---

## Key Information

**License Format:** `LSF-{base64url_encrypted_data}`
**Length:** ~200-300 characters
**Encryption:** AES-256
**Validation:** Client-side (no server needed)
**Privacy:** No tracking or phone-home

**Tiers:**
- Free: No license (shows badge)
- Pro: $49 license (hides badge)
- Enterprise: $299 license (hides badge + features)

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/generate-license.js` | Generate licenses |
| `scripts/test-license.js` | Test validation |
| `src/config/license.ts` | Validation logic |
| `LICENSE_SYSTEM.md` | Full documentation |
| `LICENSE_VERIFICATION.md` | Test results |

---

## Common Tasks

### Generate 10 Licenses for Batch
```bash
# Create customers.csv:
email,tier
user1@example.com,pro
user2@example.com,pro
...

# Generate:
npm run license:batch -- customers.csv
```

### Check Current License Status
```typescript
import { LICENSE_CONFIG } from './src/config/license'

console.log(LICENSE_CONFIG.isPro)     // true/false
console.log(LICENSE_CONFIG.tier)      // 'free'/'pro'/'enterprise'
console.log(LICENSE_CONFIG.data)      // { email, tier, issued, signature }
```

### Conditionally Show Pro Features
```typescript
import { LICENSE_CONFIG } from './src/config/license'

{LICENSE_CONFIG.isPro && (
  <PremiumFeature />
)}

{LICENSE_CONFIG.badge.show && (
  <LicenseBadge />
)}
```

---

## Security Notes

✅ **Prevents:**
- Casual copying (encrypted)
- Key tampering (signature check)
- Easy bypass (format validation)

⚠️ **Limitations:**
- Client-side (secret in code)
- Determined reverse engineering possible

🎯 **Why it's sufficient:**
- 99% of users won't try to bypass
- Professional devs respect licenses
- No privacy concerns
- Works offline

---

**More info:** See `LICENSE_SYSTEM.md` for complete documentation.

**Last Updated:** 2026-02-03
