/**
 * Codebase Scanner for Feature Gates
 *
 * Analyzes React/Next.js components and suggests which should be feature-gated
 */

import { readFileSync, existsSync } from 'fs'
import { glob } from 'glob'
import { join, relative } from 'path'

interface ScanResult {
  file_path: string
  component_name: string
  suggested_feature: string
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export async function scanCodebase(args: {
  project_path: string
  component_patterns?: string[]
}) {
  const { project_path, component_patterns } = args

  // Default patterns for React/Next.js
  const patterns = component_patterns || [
    'src/**/*.tsx',
    'src/**/*.jsx',
    'app/**/*.tsx',
    'app/**/*.jsx',
    'components/**/*.tsx',
    'components/**/*.jsx',
  ]

  // Find all component files
  const files: string[] = []
  for (const pattern of patterns) {
    const matches = await glob(join(project_path, pattern), {
      ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    })
    files.push(...matches)
  }

  if (files.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: `No component files found in ${project_path}. Searched patterns: ${patterns.join(', ')}`,
        },
      ],
    }
  }

  // Scan each file for gatable components
  const suggestions: ScanResult[] = []

  // Keywords that suggest premium features
  const premiumKeywords = {
    analytics: ['analytics', 'chart', 'graph', 'dashboard', 'report', 'metrics'],
    export: ['export', 'download', 'pdf', 'csv', 'print'],
    api: ['api', 'webhook', 'integration', 'oauth'],
    ai: ['ai', 'gpt', 'openai', 'claude', 'generate', 'completion'],
    advanced: ['advanced', 'professional', 'enterprise', 'premium'],
    customization: ['custom', 'theme', 'brand', 'whitelabel', 'white-label'],
    automation: ['automation', 'schedule', 'cron', 'workflow'],
    collaboration: ['share', 'invite', 'team', 'collaborate', 'permission'],
  }

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const relativePath = relative(project_path, filePath)

      // Extract component names
      const componentMatches = content.matchAll(
        /(?:export\s+(?:default\s+)?(?:function|const)\s+|function\s+)([A-Z][a-zA-Z0-9]*)/g
      )

      for (const match of componentMatches) {
        const componentName = match[1]
        const componentNameLower = componentName.toLowerCase()

        // Check for premium keywords
        for (const [feature, keywords] of Object.entries(premiumKeywords)) {
          for (const keyword of keywords) {
            if (componentNameLower.includes(keyword) || content.toLowerCase().includes(keyword)) {
              suggestions.push({
                file_path: relativePath,
                component_name: componentName,
                suggested_feature: feature,
                reason: `Component name or content suggests ${feature} functionality`,
                confidence: componentNameLower.includes(keyword) ? 'high' : 'medium',
              })
              break // Only suggest once per component
            }
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
      continue
    }
  }

  // Remove duplicates and sort by confidence
  const uniqueSuggestions = Array.from(
    new Map(suggestions.map((s) => [`${s.file_path}:${s.component_name}`, s])).values()
  ).sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 }
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence]
  })

  // Format results
  let report = `# 🔍 Feature Gate Suggestions\n\n`
  report += `Scanned ${files.length} files in ${project_path}\n\n`
  report += `Found ${uniqueSuggestions.length} components that should be feature-gated:\n\n`

  if (uniqueSuggestions.length === 0) {
    report += `✅ No obvious premium features detected. This could mean:\n`
    report += `- Your app doesn't have gatable features yet\n`
    report += `- Features are named generically\n`
    report += `- You should manually identify what to gate\n\n`
    report += `💡 Common features to gate: Analytics, Export, AI, API access, Custom branding\n`
  } else {
    report += `| Component | File | Feature | Confidence |\n`
    report += `|-----------|------|---------|------------|\n`

    for (const suggestion of uniqueSuggestions) {
      const icon = suggestion.confidence === 'high' ? '🎯' : suggestion.confidence === 'medium' ? '📊' : '🤔'
      report += `| ${icon} ${suggestion.component_name} | \`${suggestion.file_path}\` | ${suggestion.suggested_feature} | ${suggestion.confidence} |\n`
    }

    report += `\n## 🚀 Next Steps\n\n`
    report += `For each component above, run:\n\n`
    report += `\`\`\`\n`
    report += `insert_feature_gates(\n`
    report += `  file_path: "${uniqueSuggestions[0].file_path}",\n`
    report += `  component_name: "${uniqueSuggestions[0].component_name}",\n`
    report += `  feature_slug: "${uniqueSuggestions[0].suggested_feature}"\n`
    report += `)\n`
    report += `\`\`\`\n\n`
    report += `This will automatically wrap the component with:\n\n`
    report += `\`\`\`tsx\n`
    report += `<SubscriptionGate slug="${uniqueSuggestions[0].suggested_feature}">\n`
    report += `  <${uniqueSuggestions[0].component_name} />\n`
    report += `</SubscriptionGate>\n`
    report += `\`\`\`\n`
  }

  return {
    content: [
      {
        type: 'text',
        text: report,
      },
    ],
  }
}
