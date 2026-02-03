# License System Documentation

**Encrypted License Key System for Lovable Subscription Foundation**

---

## 🔐 Overview

This boilerplate uses an **encrypted license key system** to validate Pro licenses. Each customer receives a unique encrypted key that cannot be easily bypassed.

### Security Level

**Client-Side Validation (Medium Security)**

- ✅ Much harder than simple boolean flag
- ✅ Requires decryption to bypass
- ✅ Signature validation prevents tampering
- ✅ Unique key per customer
- ⚠️ Encryption secret is in client code (can be found if determined)
- ✅ Professional developers will respect the license regardless

**Why This Approach:**
- No server/phone-home required
- No tracking or privacy concerns
- Works offline
- Balance between security and user experience
- 99% of users won't try to bypass it
- 1% who do would bypass any client-side system

---

## 🎫 License Key Format

```
LSF-{encrypted_payload}
```

**Example:** `LSF-U2FsdGVkX18qo8MGKXbmXKet4S6B1_WUry4GW31QMKT-RFVD3X2LuUXB_BGEPKpYsMAN5ewDNrY6yRV8RCMtxtX0TQL3E7O_rKtLwfSv_rdSfVdRbKG77hAqvirhxZD9NOZoeVQOC-ghxjrJqBGZ-w3ILmT8gi4XODOfdIZDoRryoVlvkabFKybIgMFsWfoFlJqTuLLJVhyBpLlbt4sLkg`

**Components:**
- `LSF-` - Product identifier prefix (Lovable Subscription Foundation)
- Encrypted payload - Base64url-encoded AES-256 encrypted data (URL-safe, no padding)

**When Decrypted, Contains:**
```json
{
  "email": "customer@example.com",
  "tier": "pro",
  "issued": "2024-01-15",
  "signature": "sha256_hash"
}
```

---

## 🎯 For Boilerplate Sellers (You)

### Step 1: Generate License Keys

When a customer purchases Pro license:

```bash
# Interactive mode (easiest)
npm run license:generate

# CLI mode
node scripts/generate-license.js --email customer@example.com --tier pro

# Batch mode (multiple customers)
node scripts/generate-license.js --batch customers.csv
```

**Interactive Mode:**
```bash
$ npm run license:generate

🔑 License Key Generator
========================

Customer Email: john@example.com
License Tier (pro/enterprise): pro

License Key Generated Successfully!
==================================

License Key: LSF-A3F2-B8D1-C4E9-7F20
Email: john@example.com
Tier: PRO
Issued: 2024-01-15

INSTRUCTIONS FOR CUSTOMER:
--------------------------
Add this to your .env.local file:

NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=LSF-A3F2-B8D1-C4E9-7F20

The license badge will automatically disappear when this valid key is detected.

✅ License saved to: license-john-at-example.com-1234567890.txt
```

### Step 2: Send License to Customer

**Email Template:**

```
Subject: Your Lovable Subscription Foundation Pro License

Hi [Customer Name],

Thank you for purchasing the Pro license!

Your License Key:
LSF-{your_encrypted_license_key_here}

To activate:

1. Open your project's .env.local file
2. Add this line:
   NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=LSF-{your_encrypted_license_key_here}
3. Restart your development server
4. The "Powered by" badge will disappear

This license is valid for:
✅ Unlimited projects
✅ Commercial use
✅ Lifetime validity

Questions? Reply to this email.

Best regards,
Your Name
```

### Step 3: Automation (Optional)

**Integrate with Gumroad/Lemon Squeezy:**

```bash
# When webhook receives purchase:
curl -X POST https://your-server.com/api/generate-license \
  -d email=customer@example.com \
  -d tier=pro

# Returns license key
# Send via email automatically
```

---

## 📦 For Boilerplate Buyers (Your Customers)

### Step 1: Receive License Key

After purchasing, you'll receive an email with your license key:
```
LSF-{your_encrypted_license_key_here}
```

### Step 2: Add to Project

```bash
# Open .env.local (or create it)
nano .env.local

# Add this line:
NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=LSF-{your_encrypted_license_key_here}

# Save and close
```

### Step 3: Restart Application

```bash
# Stop dev server (Ctrl+C)
# Start again
npm run dev

# Badge should disappear ✨
```

### Verification

```tsx
import { LICENSE_CONFIG, getLicenseInfo } from 'lovable-subscription-foundation'

// Check license status
console.log(LICENSE_CONFIG.isPro)  // true if valid Pro license
console.log(LICENSE_CONFIG.tier)   // 'pro' or 'enterprise'

// Get license details
const info = getLicenseInfo()
console.log(info)
// {
//   tier: 'pro',
//   valid: true,
//   email: 'customer@example.com',
//   issued: '2024-01-15'
// }
```

---

## 🔧 Technical Details

### Encryption

**Algorithm:** AES-256 (via CryptoJS)

**Secret:** Embedded in `src/config/license.ts`
```typescript
const ENCRYPTION_SECRET = 'LSF_v1_2024_subscription_foundation_key_do_not_modify'
```

**Why embedded?**
- Client-side validation = secret must be accessible
- Professional devs respect licenses regardless
- Unprofessional devs would bypass any system
- No server required = better UX

### Validation Process

```typescript
// 1. Format check
if (!key.match(/^LSF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
  return { valid: false }
}

// 2. Decrypt payload
const decrypted = AES.decrypt(payload, secret)

// 3. Parse JSON
const data = JSON.parse(decrypted)

// 4. Validate signature
const expectedSig = SHA256(`${email}:${tier}:${issued}:${secret}`)
if (data.signature !== expectedSig) {
  return { valid: false }
}

// 5. Valid!
return { valid: true, tier: data.tier }
```

### Signature Generation

```typescript
// Prevents tampering
const signature = SHA256(`${email}:${tier}:${issued}:${secret}`)

// If someone modifies email or tier, signature won't match
// Can't regenerate signature without knowing the secret
```

---

## 🛡️ Security Considerations

### What This Prevents

✅ **Casual copying** - Can't just set `true` in env
✅ **Key sharing** - Each key is tied to an email
✅ **Tampering** - Signature validation prevents modification
✅ **Guessing** - 2^64 possible keys

### What This Doesn't Prevent

❌ **Determined reverse engineering** - Secret is in client code
❌ **Code modification** - Someone could remove validation entirely
❌ **Shared keys** - Nothing stops multiple people using same key

### Why It's Sufficient

**Reality Check:**
- 95%+ developers respect licenses
- Those who don't will bypass any client-side system
- Server-side validation = privacy concerns + complexity
- This strikes the right balance

**If Abuse Becomes a Problem:**
- Add domain verification (check `window.location.hostname`)
- Add activation limit (key works on max N domains)
- Add phone-home (check key validity with server)
- These can be added later if needed

---

## 📊 License Tiers

### Free Tier
- ❌ No license key
- Shows "Powered by" badge
- Use for 1 project
- MIT License

### Pro Tier ($49)
- ✅ License key: `LSF-XXXX-...`
- Badge hidden
- Unlimited projects
- Commercial use
- `tier: 'pro'` in decrypted data

### Enterprise Tier ($299) - Optional
- ✅ License key: `LSF-XXXX-...`
- Badge hidden
- Additional features (your choice)
- White-label rights
- `tier: 'enterprise'` in decrypted data

---

## 🔄 License Revocation

**Current System:** No revocation (keys are perpetual)

**To Add Revocation (Future):**

1. **Server-side check:**
```typescript
// Check key against revocation list
const response = await fetch('https://api.yoursite.com/check-license', {
  method: 'POST',
  body: JSON.stringify({ key: LICENSE_KEY })
})

if (response.revoked) {
  // Treat as invalid
}
```

2. **Periodic validation:**
```typescript
// Check once per day, cache result
// Don't break app if server unreachable
```

**Recommendation:** Start without revocation, add only if needed.

---

## 🧪 Testing License System

### Test Valid Pro License

```bash
# Generate test license
node scripts/generate-license.js --email test@example.com --tier pro

# Copy license key
# Add to .env.local
NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=LSF-XXXX-...

# Start app
npm run dev

# Verify badge is hidden
# Verify LICENSE_CONFIG.isPro === true
```

### Test Invalid License

```bash
# Try fake key
NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=LSF-FAKE-FAKE-FAKE-FAKE

# Badge should still show
# Console warning: "License signature validation failed"
```

### Test No License

```bash
# Remove/comment out license key in .env.local
# NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=...

# Badge should show
# LICENSE_CONFIG.isFree === true
```

---

## 🎨 Customizing License System

### Change Encryption Secret

**⚠️ WARNING: This invalidates all existing keys**

```typescript
// src/config/license.ts
const ENCRYPTION_SECRET = 'your_new_secret_here'

// scripts/generate-license.js
const ENCRYPTION_SECRET = 'your_new_secret_here'  // Must match!
```

### Add Custom Validation

```typescript
// src/config/license.ts

function validateLicense(key) {
  // ... existing validation ...

  // Add custom checks
  if (data.email.endsWith('@competitor.com')) {
    return { valid: false, tier: 'free' }
  }

  // Check expiration (if you want time-limited licenses)
  const issued = new Date(data.issued)
  const oneYearLater = new Date(issued)
  oneYearLater.setFullYear(issued.getFullYear() + 1)

  if (new Date() > oneYearLater) {
    console.warn('License expired')
    return { valid: false, tier: 'free' }
  }

  return { valid: true, tier: data.tier, data }
}
```

### Add Domain Restriction

```typescript
// src/config/license.ts

function validateLicense(key) {
  // ... existing validation ...

  // Check if running on allowed domain
  if (typeof window !== 'undefined') {
    const allowedDomains = ['example.com', 'www.example.com']
    const currentDomain = window.location.hostname

    if (!allowedDomains.some(d => currentDomain.endsWith(d))) {
      console.warn('License not valid for this domain')
      return { valid: false, tier: 'free' }
    }
  }

  return { valid: true, tier: data.tier, data }
}
```

---

## 📋 Batch License Generation

### Create CSV File

```csv
email,tier
john@example.com,pro
jane@company.com,enterprise
bob@startup.io,pro
```

### Generate All Licenses

```bash
node scripts/generate-license.js --batch customers.csv

🔑 Batch License Generator
===========================

Processing 3 licenses...

✅ Generated license for john@example.com (pro)
✅ Generated license for jane@company.com (enterprise)
✅ Generated license for bob@startup.io (pro)

✅ Batch complete! Generated 3 licenses.
```

**Output:**
- Individual files: `license-john-at-example.com-*.txt`
- Batch summary: `licenses-batch-*.csv`

---

## 🚨 Troubleshooting

### "License signature validation failed"

**Cause:** Key was tampered with or corrupted

**Fix:** Request new license key from seller

### "Invalid license key format"

**Cause:** Key doesn't start with `LSF-` or is corrupted

**Fix:** Check for typos, ensure complete key copied (keys can be 200+ characters)

### "Failed to decrypt license key"

**Cause:** Key was generated with different encryption secret

**Fix:** Ensure buyer and seller use same version of boilerplate

### Badge still showing with valid key

**Cause:** Environment variable not loaded

**Fix:**
```bash
# Verify env var is set
echo $NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY

# Restart dev server completely
npm run dev
```

---

## 💡 Best Practices

### For Sellers

1. **Keep generation script private** - Don't commit to public repo
2. **Store customer licenses** - Keep database of email → key
3. **Automate delivery** - Integrate with payment processor
4. **Provide clear instructions** - Email template above
5. **Support channels** - Help customers with setup

### For Buyers

1. **Keep key private** - Don't commit .env.local to git
2. **One key per purchase** - Don't share with others
3. **Backup license key** - Save email for future reference
4. **Read instructions** - Follow setup steps carefully

---

## 📈 Analytics (Optional)

Want to track license usage? Add (optional):

```typescript
// src/config/license.ts

if (LICENSE_CONFIG.isPro && LICENSE_CONFIG.data) {
  // Optional: Report active license (anonymized)
  fetch('https://your-api.com/license/report', {
    method: 'POST',
    body: JSON.stringify({
      key_hash: SHA256(LICENSE_KEY).toString(), // Anonymized
      tier: LICENSE_CONFIG.tier,
      version: LICENSE_CONFIG.version
    })
  }).catch(() => {}) // Fail silently, don't break app
}
```

**Privacy Note:** Only do this with user consent and clear privacy policy.

---

## ✅ Summary

**Security Level:** Medium (client-side)
**Prevents:** Casual copying, key sharing, tampering
**Doesn't Prevent:** Determined reverse engineering
**Balance:** Good for 99% of users
**Recommendation:** Start with this, add server validation if abuse occurs

**Key Benefits:**
- ✅ Unique key per customer
- ✅ No tracking/privacy concerns
- ✅ Works offline
- ✅ Professional and reasonable
- ✅ Easy to implement and use

---

**Questions?** See [README.md](./README.md) or [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
