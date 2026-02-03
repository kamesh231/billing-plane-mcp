#!/usr/bin/env node

/**
 * Lovable Subscription Foundation MCP Server
 *
 * Provides AI-powered tools for setting up subscription billing in your SaaS:
 * - Interactive pricing configuration
 * - Codebase scanning for feature gates
 * - Auto-insertion of SubscriptionGate components
 * - Pricing config generation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { tools, executeTool } from './tools-registry.js'

// MCP Server instance
const server = new Server(
  {
    name: 'lovable-subscription-foundation',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}))

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  try {
    return await executeTool(name, args ?? {})
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    }
  }
})

// Start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Lovable Subscription Foundation MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
