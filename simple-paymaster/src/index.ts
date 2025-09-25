/**
 * aNode Simple Paymaster - Cloudflare Workers Entry Point
 * Phase 1: Basic paymaster functionality with direct-payment compatibility
 */

import { aNodePaymaster } from './paymaster'
import type { Env, ProcessRequest, ProcessResponse } from './types'

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    // Health check endpoint
    if (request.method === 'GET' && pathname === '/health') {
      return Response.json(
        {
          status: 'ok',
          service: 'aNode Simple Paymaster',
          version: '0.1.0',
          phase: 'Phase 1: Basic Paymaster',
          timestamp: new Date().toISOString(),
        },
        {
          headers: corsHeaders,
          status: 200,
        },
      )
    }

    // Main API endpoint
    if (request.method === 'POST' && pathname === '/api/v1/paymaster/process') {
      try {
        const paymaster = new aNodePaymaster(env)
        const { userOperation }: ProcessRequest = await request.json()

        // Validate userOperation structure
        if (!userOperation || typeof userOperation !== 'object') {
          return Response.json(
            {
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'Invalid userOperation format',
              },
            },
            {
              headers: corsHeaders,
              status: 400,
            },
          )
        }

        const startTime = Date.now()
        const result = await paymaster.processUserOperation(userOperation)
        const endTime = Date.now()

        const response: ProcessResponse = {
          success: result.success,
          userOperation: result.userOperation,
          paymentMethod: result.paymentMethod,
          processing: {
            modules: ['basic_paymaster'],
            totalDuration: `${endTime - startTime}ms`,
            service: 'aNode Paymaster v0.1.0',
          },
        }

        if (!result.success && result.error) {
          response.error = result.error
        }

        return Response.json(response, {
          headers: corsHeaders,
          status: result.success ? 200 : 400,
        })
      } catch (error) {
        console.error('API Error:', error)
        return Response.json(
          {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error',
            },
          },
          {
            headers: corsHeaders,
            status: 500,
          },
        )
      }
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders,
    })
  },
}
