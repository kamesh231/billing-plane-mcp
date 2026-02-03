#!/usr/bin/env node

/**
 * Test License Validation
 *
 * Verifies that generated license keys can be properly validated
 */

const CryptoJS = require('crypto-js')

// Same encryption secret as in src/config/license.ts
const ENCRYPTION_SECRET = 'LSF_v1_2024_subscription_foundation_key_do_not_modify'

function validateLicense(licenseKey) {
  if (!licenseKey || licenseKey.trim() === '') {
    return { valid: false, tier: 'free', reason: 'No license key provided' }
  }

  // Check format
  if (!licenseKey.startsWith('LSF-')) {
    return { valid: false, tier: 'free', reason: 'Invalid format' }
  }

  try {
    // Extract payload (remove LSF- prefix)
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
      return { valid: false, tier: 'free', reason: 'Failed to decrypt' }
    }

    // Parse JSON
    const data = JSON.parse(decryptedText)

    // Validate signature
    const expectedSignature = CryptoJS.SHA256(
      `${data.email}:${data.tier}:${data.issued}:${ENCRYPTION_SECRET}`
    ).toString()

    if (data.signature !== expectedSignature) {
      return { valid: false, tier: 'free', reason: 'Signature validation failed' }
    }

    // Valid!
    return {
      valid: true,
      tier: data.tier,
      data: data,
      reason: 'Valid license'
    }

  } catch (error) {
    return { valid: false, tier: 'free', reason: error.message }
  }
}

// Test cases
console.log('\n🧪 License Validation Tests\n')
console.log('=' .repeat(50))

// Test 1: Valid license (from command line arg)
const testKey = process.argv[2]
if (!testKey) {
  console.log('\n❌ Please provide a license key to test:')
  console.log('   node scripts/test-license.js LSF-xxxxx\n')
  process.exit(1)
}

console.log('\n1. Testing Valid License Key:')
console.log('   Key:', testKey)
const result1 = validateLicense(testKey)
console.log('   ✅ Valid:', result1.valid)
console.log('   📊 Tier:', result1.tier)
if (result1.data) {
  console.log('   📧 Email:', result1.data.email)
  console.log('   📅 Issued:', result1.data.issued)
}
console.log('   ℹ️  Reason:', result1.reason)

// Test 2: Invalid format
console.log('\n2. Testing Invalid Format:')
const result2 = validateLicense('LSF-INVALID')
console.log('   ❌ Valid:', result2.valid)
console.log('   ℹ️  Reason:', result2.reason)

// Test 3: Empty license
console.log('\n3. Testing Empty License:')
const result3 = validateLicense('')
console.log('   ❌ Valid:', result3.valid)
console.log('   ℹ️  Reason:', result3.reason)

// Test 4: Tampered key (modified one character)
console.log('\n4. Testing Tampered Key:')
const tamperedKey = testKey.slice(0, -1) + (testKey.slice(-1) === 'F' ? 'E' : 'F')
const result4 = validateLicense(tamperedKey)
console.log('   ❌ Valid:', result4.valid)
console.log('   ℹ️  Reason:', result4.reason)

console.log('\n' + '='.repeat(50))
console.log('\n✅ All tests completed!\n')
