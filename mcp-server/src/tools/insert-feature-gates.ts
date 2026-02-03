/**
 * Auto-Insert Feature Gates
 *
 * Automatically wraps components with <SubscriptionGate> for feature access control
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'

export async function insertFeatureGates(args: {
  file_path: string
  component_name: string
  feature_slug: string
  fallback_component?: string
}) {
  const { file_path, component_name, feature_slug, fallback_component } = args

  if (!existsSync(file_path)) {
    throw new Error(`File not found: ${file_path}`)
  }

  let content = readFileSync(file_path, 'utf-8')

  // Check if SubscriptionGate import already exists
  const hasSubscriptionGateImport = content.includes('SubscriptionGate')

  // Add import if missing
  if (!hasSubscriptionGateImport) {
    // Find the last import statement
    const importRegex = /import\s+.*?from\s+['"].*?['"]/g
    const imports = content.match(importRegex)

    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1]
      const lastImportIndex = content.lastIndexOf(lastImport)
      const insertPosition = lastImportIndex + lastImport.length

      const newImport = `\nimport { SubscriptionGate } from 'lovable-subscription-foundation'`
      content = content.slice(0, insertPosition) + newImport + content.slice(insertPosition)
    } else {
      // No imports found, add at the top
      content = `import { SubscriptionGate } from 'lovable-subscription-foundation'\n\n` + content
    }
  }

  // Find the component to wrap
  // Look for the component being used (e.g., <AnalyticsChart />)
  const componentUsageRegex = new RegExp(
    `<${component_name}\\s*([^>]*?)\\s*(\\/?>|>[\\s\\S]*?<\\/${component_name}>)`,
    'g'
  )

  const matches = [...content.matchAll(componentUsageRegex)]

  if (matches.length === 0) {
    throw new Error(
      `Component <${component_name}> not found in ${file_path}. Make sure the component is being used in JSX.`
    )
  }

  // Replace each usage with gated version
  let modifiedContent = content
  for (const match of matches.reverse()) {
    // Reverse to maintain indices
    const fullMatch = match[0]
    const startIndex = match.index!

    // Skip if already wrapped
    const before = modifiedContent.slice(Math.max(0, startIndex - 100), startIndex)
    if (before.includes(`<SubscriptionGate slug="${feature_slug}"`)) {
      continue // Already wrapped
    }

    // Create the gated version
    const indent = getIndentation(modifiedContent, startIndex)
    let gatedComponent: string

    if (fallback_component) {
      gatedComponent = `${indent}<SubscriptionGate
${indent}  slug="${feature_slug}"
${indent}  fallback={<${fallback_component} />}
${indent}>
${indent}  ${fullMatch}
${indent}</SubscriptionGate>`
    } else {
      gatedComponent = `${indent}<SubscriptionGate slug="${feature_slug}">
${indent}  ${fullMatch}
${indent}</SubscriptionGate>`
    }

    modifiedContent =
      modifiedContent.slice(0, startIndex) +
      gatedComponent +
      modifiedContent.slice(startIndex + fullMatch.length)
  }

  // Write back to file
  writeFileSync(file_path, modifiedContent, 'utf-8')

  // Generate summary
  const summary = `
# ✅ Feature Gate Inserted Successfully!

**File:** \`${file_path}\`
**Component:** \`${component_name}\`
**Feature:** \`${feature_slug}\`
${fallback_component ? `**Fallback:** \`${fallback_component}\`` : ''}

## Changes Made:

1. ✅ Added import: \`import { SubscriptionGate } from 'lovable-subscription-foundation'\`
2. ✅ Wrapped ${matches.length} instance(s) of \`<${component_name}>\` with \`<SubscriptionGate>\`

## Result:

\`\`\`tsx
<SubscriptionGate slug="${feature_slug}"${fallback_component ? `\n  fallback={<${fallback_component} />}` : ''}>
  <${component_name} />
</SubscriptionGate>
\`\`\`

## What Happens Now:

- ✅ Users with access to "${feature_slug}" see the component
- ❌ Users without access see ${fallback_component || 'the UpgradePrompt component'}
- 🔐 Feature access is checked against their subscription plan

## Next Steps:

1. Make sure "${feature_slug}" is defined in \`src/config/pricing.ts\`
2. Test the gate: Try accessing as Free vs Pro user
3. Repeat for other components that should be gated

**Want to gate more components?** Run \`scan_codebase\` to find suggestions!
`

  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
    ],
  }
}

// Helper: Get indentation of current line
function getIndentation(content: string, position: number): string {
  const lineStart = content.lastIndexOf('\n', position - 1) + 1
  const line = content.slice(lineStart, position)
  const match = line.match(/^(\s*)/)
  return match ? match[1] : ''
}
