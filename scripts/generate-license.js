#!/usr/bin/env node

/**
 * License Key Generator for Lovable Subscription Foundation
 *
 * Usage:
 *   node scripts/generate-license.js --email user@example.com --tier pro
 *
 * Generates a unique encrypted license key for each customer.
 */

const CryptoJS = require('crypto-js')
const readline = require('readline')

// Same encryption secret as in src/config/license.ts
const ENCRYPTION_SECRET = 'LSF_v1_2024_subscription_foundation_key_do_not_modify'

/**
 * Generate license key
 */
function generateLicenseKey(email, tier) {
  // Validate inputs
  if (!email || !email.includes('@')) {
    throw new Error('Valid email required')
  }

  if (!['pro', 'enterprise'].includes(tier)) {
    throw new Error('Tier must be "pro" or "enterprise"')
  }

  // Create license data
  const issued = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const signature = CryptoJS.SHA256(`${email}:${tier}:${issued}:${ENCRYPTION_SECRET}`).toString()

  const licenseData = {
    email,
    tier,
    issued,
    signature
  }

  // Encrypt
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(licenseData),
    ENCRYPTION_SECRET
  ).toString()

  // Use base64url encoding (URL-safe, no padding)
  const base64url = encrypted
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // Format as LSF-{base64url}
  const licenseKey = `LSF-${base64url}`

  return {
    key: licenseKey,
    email,
    tier,
    issued,
    instructions: `
License Key Generated Successfully!
==================================

License Key: ${licenseKey}
Email: ${email}
Tier: ${tier.toUpperCase()}
Issued: ${issued}

INSTRUCTIONS FOR CUSTOMER:
--------------------------
Add this to your .env.local file:

NEXT_PUBLIC_LOVABLE_SUBSCRIPTION_LICENSE_KEY=${licenseKey}

The license badge will automatically disappear when this valid key is detected.

IMPORTANT NOTES:
- This key is tied to the email: ${email}
- Valid for: ${tier === 'pro' ? 'Unlimited projects' : 'Enterprise features'}
- Lifetime validity (unless revoked)
- Do not share this key publicly
`
  }
}

/**
 * Interactive mode
 */
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const question = (query) => new Promise((resolve) => rl.question(query, resolve))

  console.log('\n🔑 License Key Generator')
  console.log('========================\n')

  const email = await question('Customer Email: ')
  const tier = await question('License Tier (pro/enterprise): ')

  rl.close()

  try {
    const result = generateLicenseKey(email, tier.toLowerCase())
    console.log(result.instructions)

    // Save to file
    const fs = require('fs')
    const filename = `license-${email.replace('@', '-at-')}-${Date.now()}.txt`
    fs.writeFileSync(filename, result.instructions)
    console.log(`\n✅ License saved to: ${filename}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

/**
 * CLI mode
 */
function cliMode() {
  const args = process.argv.slice(2)

  let email = null
  let tier = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1]
    }
    if (args[i] === '--tier' && args[i + 1]) {
      tier = args[i + 1]
    }
  }

  if (!email || !tier) {
    console.log(`
Usage:
  node scripts/generate-license.js --email user@example.com --tier pro

  Or run without arguments for interactive mode:
  node scripts/generate-license.js

Options:
  --email   Customer email address (required)
  --tier    License tier: "pro" or "enterprise" (required)

Examples:
  node scripts/generate-license.js --email john@example.com --tier pro
  node scripts/generate-license.js --email company@example.com --tier enterprise
`)
    process.exit(1)
  }

  try {
    const result = generateLicenseKey(email, tier)
    console.log(result.instructions)

    // Save to file
    const fs = require('fs')
    const filename = `license-${email.replace('@', '-at-')}-${Date.now()}.txt`
    fs.writeFileSync(filename, result.instructions)
    console.log(`\n✅ License saved to: ${filename}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

/**
 * Batch mode - generate multiple licenses from CSV
 */
function batchMode(csvFile) {
  const fs = require('fs')
  const csv = fs.readFileSync(csvFile, 'utf-8')
  const lines = csv.split('\n').filter(line => line.trim())

  // Skip header
  const customers = lines.slice(1).map(line => {
    const [email, tier] = line.split(',').map(s => s.trim())
    return { email, tier }
  })

  console.log(`\n🔑 Batch License Generator`)
  console.log(`===========================\n`)
  console.log(`Processing ${customers.length} licenses...\n`)

  const results = []

  for (const { email, tier } of customers) {
    try {
      const result = generateLicenseKey(email, tier)
      results.push(result)
      console.log(`✅ Generated license for ${email} (${tier})`)

      // Save individual file
      const filename = `license-${email.replace('@', '-at-')}-${Date.now()}.txt`
      fs.writeFileSync(filename, result.instructions)

    } catch (error) {
      console.error(`❌ Failed for ${email}: ${error.message}`)
    }
  }

  // Save batch summary
  const summary = results.map(r => `${r.email},${r.tier},${r.key}`).join('\n')
  fs.writeFileSync(`licenses-batch-${Date.now()}.csv`, `email,tier,key\n${summary}`)

  console.log(`\n✅ Batch complete! Generated ${results.length} licenses.`)
}

// Main
if (process.argv.includes('--batch')) {
  const batchIndex = process.argv.indexOf('--batch')
  const csvFile = process.argv[batchIndex + 1]
  if (!csvFile) {
    console.error('❌ Please provide CSV file: --batch customers.csv')
    process.exit(1)
  }
  batchMode(csvFile)
} else if (process.argv.length === 2) {
  // No arguments = interactive mode
  interactiveMode()
} else {
  // Arguments provided = CLI mode
  cliMode()
}
