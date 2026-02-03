#!/usr/bin/env node

/**
 * BillingPlane MCP HTTP/SSE server for Lovable.
 * Validates Bearer token via dashboard API; enforces one project per free user (supabase_url); watermark for free.
 */

import { createServer } from 'node:http'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { tools, executeTool } from './tools-registry.js'
import { authStorage, validateToken, checkProject, normalizeProjectId, appendWatermark } from './auth-context.js'

const PORT = Number(process.env.PORT) || 3001
const MESSAGE_ENDPOINT = '/message'

const sessions = new Map<string, { transport: SSEServerTransport; server: Server }>()

function createMcpServer(transport: SSEServerTransport): Server {
  const server = new Server(
    { name: 'lovable-subscription-foundation', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const auth = authStorage.getStore()

    if (name === 'write_supabase_catalog' && auth) {
      const a = (args || {}) as { supabase_url?: string }
      const supabaseUrl = a.supabase_url
      if (supabaseUrl) {
        const projectId = normalizeProjectId(supabaseUrl)
        const { allowed, message } = await checkProject(auth.user_id, projectId)
        if (!allowed) {
          return {
            content: [{ type: 'text' as const, text: message || "Upgrade to use BillingPlane in multiple projects." }],
            isError: true,
          }
        }
      }
    }

    try {
      const result = await executeTool(name, args ?? {})
      if (auth?.plan === 'free' && result.content) {
        appendWatermark(result.content, auth.plan)
      }
      return result
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      }
    }
  })

  return server
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const pathname = url.pathname

  if (req.method === 'GET' && (pathname === '/' || pathname === '/sse')) {
    const transport = new SSEServerTransport(MESSAGE_ENDPOINT, res)
    const server = createMcpServer(transport)
    await server.connect(transport)
    sessions.set(transport.sessionId, { transport, server })
    transport.onclose = () => sessions.delete(transport.sessionId)
    return
  }

  if (req.method === 'POST' && pathname === MESSAGE_ENDPOINT) {
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) {
      res.writeHead(400).end('Missing sessionId')
      return
    }
    const entry = sessions.get(sessionId)
    if (!entry) {
      res.writeHead(404).end('Session not found')
      return
    }

    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      res.writeHead(401).end('Missing Bearer token')
      return
    }

    const context = await validateToken(token)
    if (!context) {
      res.writeHead(401).end('Invalid token')
      return
    }

    await authStorage.run(context, async () => {
      await entry.transport.handlePostMessage(req, res)
    })
    return
  }

  res.writeHead(404).end('Not found')
})

httpServer.listen(PORT, () => {
  console.error(`BillingPlane MCP HTTP server listening on port ${PORT}`)
  console.error(`GET / or /sse for SSE; POST ${MESSAGE_ENDPOINT}?sessionId=... with Authorization: Bearer <token>`)
})
