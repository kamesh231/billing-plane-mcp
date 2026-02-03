// Lovable Subscription Foundation
// License Validation with Encryption
//
// Free Version: No license key (shows badge)
// Pro Version: Valid encrypted license key (hides badge)

import CryptoJS from 'crypto-js'

/**
 * License key format: LSF-{base64url_encoded_encrypted_payload}
 *
 * When decrypted, contains:
 * {
 *   email: "user@example.com",
 *   tier: "pro",
 *   issued: "2024-01-15",
 *   signature: "hash"
 * }
 */

// Encryption secret - embedded in code
// NOTE: This is client-side, so not 100% secure, but much harder than boolean
// Professional devs will respect the license anyway
const ENCRYPTION_SECRET = 'LSF_v1_2024_subscription_foundation_key_do_not_modify'

interface LicenseData {
  email: string
  tier: 'pro' | 'enterprise'
  issued: string // ISO date
  signature: string
}

/**
 * Validate license key
 */
function validateLicense(licenseKey: string | undefined): {
  valid: boolean
  tier: 'free' | 'pro' | 'enterprise'
  data?: LicenseData
} {
  // No license key = free tier
  if (!licenseKey || licenseKey.trim() === '') {
    return { valid: false, tier: 'free' }
  }

  // Check format: LSF-{base64url}
  if (!licenseKey.startsWith('LSF-')) {
    console.warn('Invalid license key format')
    return { valid: false, tier: 'free' }
  }

  try {
    // Extract encrypted payload (remove LSF- prefix)
    const base64url = licenseKey.replace(/^LSF-/, '')

    // Convert base64url back to base64
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    // Add padding if needed
    const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4)

    // Decrypt
    const decryptedBytes = CryptoJS.AES.decrypt(
      paddedBase64,
      ENCRYPTION_SECRET
    )

    const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8)

    if (!decryptedText) {
      console.warn('Failed to decrypt license key')
      return { valid: false, tier: 'free' }
    }

    // Parse JSON
    const data: LicenseData = JSON.parse(decryptedText)

    // Validate signature
    const expectedSignature = CryptoJS.SHA256(
      `${data.email}:${data.tier}:${data.issued}:${ENCRYPTION_SECRET}`
    ).toString()

    if (data.signature !== expectedSignature) {
      console.warn('License signature validation failed')
      return { valid: false, tier: 'free' }
    }

    // Validate tier
    if (!['pro', 'enterprise'].includes(data.tier)) {
      console.warn('Invalid license tier')
      return { valid: false, tier: 'free' }
    }

    // Valid license!
    return {
      valid: true,
      tier: data.tier,
      data
    }

  } catch (error) {
    console.warn('License validation error:', error)
    return { valid: false, tier: 'free' }
  }
}

// Get license key from environment
const LICENSE_KEY = process.env.NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY

// Validate on load
const licenseValidation = validateLicense(LICENSE_KEY)

/**
 * Public license configuration
 */
export const LICENSE_CONFIG = {
  // License status
  isValid: licenseValidation.valid,
  isPro: licenseValidation.tier === 'pro' || licenseValidation.tier === 'enterprise',
  isEnterprise: licenseValidation.tier === 'enterprise',
  isFree: licenseValidation.tier === 'free',
  tier: licenseValidation.tier,

  // License data (only if valid)
  data: licenseValidation.data,

  // Product URLs
  productUrl: 'https://lovable-subscription.dev',
  purchaseUrl: 'https://lovable-subscription.dev/pricing',
  docsUrl: 'https://lovable-subscription.dev/docs',
  supportEmail: 'support@lovable-subscription.dev',

  // Badge configuration
  badge: {
    text: 'Powered by Lovable Subscription Foundation',
    show: !licenseValidation.valid, // Show badge if no valid license
    emoji: '⚡',
    position: 'bottom-right' as const,
  },

  // Version info
  version: '1.0.0',
  license: 'MIT (Free) / Commercial (Pro)',
}

/**
 * Check if user has valid Pro license
 */
export function hasProLicense(): boolean {
  return LICENSE_CONFIG.isPro
}

/**
 * Check if user has valid Enterprise license
 */
export function hasEnterpriseLicense(): boolean {
  return LICENSE_CONFIG.isEnterprise
}

/**
 * Check if user is on free tier
 */
export function isFreeTier(): boolean {
  return LICENSE_CONFIG.isFree
}

/**
 * Get purchase URL for upgrading to Pro
 */
export function getPurchaseUrl(): string {
  return LICENSE_CONFIG.purchaseUrl
}

/**
 * Get license tier
 */
export function getLicenseTier(): 'free' | 'pro' | 'enterprise' {
  return LICENSE_CONFIG.tier
}

/**
 * Get license information (for debugging)
 */
export function getLicenseInfo(): {
  tier: string
  valid: boolean
  email?: string
  issued?: string
} {
  if (!LICENSE_CONFIG.isValid || !LICENSE_CONFIG.data) {
    return {
      tier: 'free',
      valid: false
    }
  }

  return {
    tier: LICENSE_CONFIG.tier,
    valid: true,
    email: LICENSE_CONFIG.data.email,
    issued: LICENSE_CONFIG.data.issued
  }
}
