/**
 * aNode Paymaster Cloudflare Worker
 * ERC-4337 Account Abstraction Paymaster Service
 */

// Mock validation functions (replace with real implementations)
function validateSBT(sender) {
    // Mock: always pass for demo purposes
    console.log(`🔍 SBT validation passed for ${sender}`);
    return true;
}

function validatePNTBalance(sender) {
    // Mock: always pass for demo purposes
    console.log(`💰 PNT balance validation passed for ${sender}`);
    return true;
}

function assessSecurityRisk(userOp) {
    // Mock: return low risk for demo
    console.log(`🛡️ Security assessment completed for user operation`);
    return 25; // Low risk score
}

function handleSponsor() {
    console.log('📝 Processing paymaster sponsor request');

    // Mock paymaster response
    const response = {
        paymasterAndData: '0x1234567890abcdefabcdef1234567890abcdef12',
        preVerificationGas: '21000',
        verificationGasLimit: '100000',
        callGasLimit: '200000',
        message: 'Gas sponsored successfully',
        service: 'aNode Paymaster',
        timestamp: Date.now()
    };

    console.log('✅ Successfully sponsored user operation');

    return new Response(JSON.stringify(response, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function handleProcess() {
    console.log('🔄 Processing complete user operation');

    // Mock validation results
    const response = {
        success: true,
        userOperation: {
            paymasterAndData: '0xabcdef1234567890abcdef1234567890abcdef12',
            preVerificationGas: '21000',
            verificationGasLimit: '100000',
            callGasLimit: '200000',
            message: 'User operation processed successfully'
        },
        validation: {
            sbtValidated: validateSBT('0x1234567890123456789012345678901234567890'),
            pntBalanceValidated: validatePNTBalance('0x1234567890123456789012345678901234567890'),
            securityRisk: assessSecurityRisk({})
        },
        processing: {
            modules: ['sbt_validator', 'pnt_validator', 'security_filter', 'paymaster_signer'],
            totalDuration: '45ms',
            service: 'aNode Paymaster'
        },
        timestamp: Date.now()
    };

    console.log('✅ User operation processed successfully');

    return new Response(JSON.stringify(response, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function handleHealth() {
    const health = {
        status: 'healthy',
        service: 'aNode Paymaster Worker',
        version: '0.1.0',
        timestamp: Date.now(),
        uptime: 'N/A (Cloudflare Workers)',
        endpoints: {
            health: 'GET /health',
            sponsor: 'POST /api/v1/paymaster/sponsor',
            process: 'POST /api/v1/paymaster/process'
        }
    };

    return new Response(JSON.stringify(health, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function handleHome() {
    const info = `# aNode Paymaster Worker
ERC-4337 Account Abstraction Paymaster Service

## Endpoints
- \`GET /\` - Service information
- \`GET /health\` - Health check
- \`POST /api/v1/paymaster/sponsor\` - Sponsor gas for user operation
- \`POST /api/v1/paymaster/process\` - Process complete user operation with validation

## Features
- SBT (Soul Bound Token) validation
- PNT (Project Native Token) balance verification
- Security risk assessment
- ERC-4337 paymaster signature generation

## Status
🟢 Service is running
📊 Version: 0.1.0
⏰ Timestamp: ${new Date().toISOString()}

---
*Built with Cloudflare Workers*
`;

    return new Response(info, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

export default {
    async fetch(request, env, ctx) {
        console.log(`🚀 aNode Paymaster Worker request: ${request.method} ${request.url}`);

        const url = new URL(request.url);

        // CORS headers for all responses
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Confirmation-Token',
        };

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            let response;

            switch (url.pathname) {
                case '/':
                    response = handleHome();
                    break;
                case '/health':
                    response = handleHealth();
                    break;
                case '/api/v1/paymaster/sponsor':
                    if (request.method === 'POST') {
                        response = handleSponsor();
                    } else {
                        response = new Response('Method not allowed', { status: 405 });
                    }
                    break;
                case '/api/v1/paymaster/process':
                    if (request.method === 'POST') {
                        response = handleProcess();
                    } else {
                        response = new Response('Method not allowed', { status: 405 });
                    }
                    break;
                default:
                    response = new Response('Not Found', { status: 404 });
            }

            // Add CORS headers to all responses
            const newHeaders = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
                newHeaders.set(key, value);
            });

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });

        } catch (error) {
            console.error('❌ Worker error:', error);

            const errorResponse = {
                success: false,
                error: {
                    message: error.message || 'Internal server error',
                    code: 'INTERNAL_ERROR',
                    timestamp: Date.now()
                }
            };

            return new Response(JSON.stringify(errorResponse, null, 2), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
    }
};
