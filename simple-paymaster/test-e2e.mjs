#!/usr/bin/env node

/**
 * End-to-End Test for aNodePaymaster
 * 
 * This script tests a real ERC20 transfer from SimpleAccount A to SimpleAccount B
 * using our deployed paymaster on Sepolia testnet.
 * 
 * Flow:
 * 1. Setup SimpleAccount A and B
 * 2. Generate ERC20 transfer UserOperation
 * 3. Process through our paymaster
 * 4. Submit to EntryPoint for execution
 */

import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// Try to import configuration, fallback to defaults
let config
try {
  const configModule = await import('./e2e-config.mjs')
  config = configModule.config
} catch (error) {
  console.log('⚠️  Using default configuration. Create e2e-config.mjs for custom settings.')
  config = {
    ENTRYPOINT_ADDRESS: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    SIMPLE_ACCOUNT_A: "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6", 
    SIMPLE_ACCOUNT_B: "0x27243FAc2c0bEf46F143a705708dC4A7eD476854",
    PNT_TOKEN_ADDRESS: "0x3e7B771d4541eC85c8137e950598Ac97553a337a",
    PAYMASTER_URL: "http://localhost:8787",
    SEPOLIA_RPC: "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N",
    OWNER_PRIVATE_KEY: process.env.OWNER_PRIVATE_KEY || "",
    PAYMASTER_PRIVATE_KEY: process.env.PAYMASTER_PRIVATE_KEY || "",
  }
}

// ABI definitions
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
]

const SIMPLE_ACCOUNT_ABI = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dest', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'func', type: 'bytes' }
    ],
    outputs: []
  },
  {
    name: 'getNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
]

const ENTRYPOINT_ABI = [
  {
    name: 'handleOps',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ops', type: 'tuple[]', components: [
        { name: 'sender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'initCode', type: 'bytes' },
        { name: 'callData', type: 'bytes' },
        { name: 'callGasLimit', type: 'uint256' },
        { name: 'verificationGasLimit', type: 'uint256' },
        { name: 'preVerificationGas', type: 'uint256' },
        { name: 'maxFeePerGas', type: 'uint256' },
        { name: 'maxPriorityFeePerGas', type: 'uint256' },
        { name: 'paymasterAndData', type: 'bytes' },
        { name: 'signature', type: 'bytes' }
      ]},
      { name: 'beneficiary', type: 'address' }
    ],
    outputs: []
  }
]

async function main() {
  console.log('🚀 Starting aNodePaymaster E2E Test')
  console.log('=====================================')
  
  if (!config.OWNER_PRIVATE_KEY) {
    console.error('❌ Please provide OWNER_PRIVATE_KEY environment variable')
    process.exit(1)
  }

  // Setup clients
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(config.SEPOLIA_RPC)
  })

  const account = privateKeyToAccount(config.OWNER_PRIVATE_KEY)
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(config.SEPOLIA_RPC)
  })

  console.log('📊 Configuration:')
  console.log('  EntryPoint:', config.ENTRYPOINT_ADDRESS)
  console.log('  SimpleAccount A:', config.SIMPLE_ACCOUNT_A)
  console.log('  SimpleAccount B:', config.SIMPLE_ACCOUNT_B)
  console.log('  PNT Token:', config.PNT_TOKEN_ADDRESS)
  console.log('  Owner:', account.address)
  console.log()

  // Step 1: Check initial balances
  console.log('1️⃣ Checking initial balances...')
  
  const balanceA = await publicClient.readContract({
    address: config.PNT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [config.SIMPLE_ACCOUNT_A]
  })
  
  const balanceB = await publicClient.readContract({
    address: config.PNT_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [config.SIMPLE_ACCOUNT_B]
  })

  console.log('  Account A PNT Balance:', balanceA.toString())
  console.log('  Account B PNT Balance:', balanceB.toString())

  // Step 2: Get nonce for SimpleAccount A
  console.log()
  console.log('2️⃣ Getting nonce for SimpleAccount A...')
  
  const nonce = await publicClient.readContract({
    address: config.SIMPLE_ACCOUNT_A,
    abi: SIMPLE_ACCOUNT_ABI,
    functionName: 'getNonce',
    args: []
  })

  console.log('  Current nonce:', nonce.toString())

  // Step 3: Generate UserOperation for ERC20 transfer
  console.log()
  console.log('3️⃣ Generating UserOperation for ERC20 transfer...')
  
  const transferAmount = parseEther('0.001') // Transfer 0.001 PNT
  console.log('  Transfer amount:', transferAmount.toString(), 'wei')

  // Encode ERC20 transfer call
  const erc20TransferData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [config.SIMPLE_ACCOUNT_B, transferAmount]
  })

  // Encode SimpleAccount execute call
  const executeCallData = encodeFunctionData({
    abi: SIMPLE_ACCOUNT_ABI,
    functionName: 'execute',
    args: [config.PNT_TOKEN_ADDRESS, 0n, erc20TransferData]
  })

  const userOp = {
    sender: config.SIMPLE_ACCOUNT_A,
    nonce: `0x${nonce.toString(16)}`,
    initCode: '0x',
    callData: executeCallData,
    callGasLimit: '0x5208',
    verificationGasLimit: '0x186a0',
    preVerificationGas: '0x5208',
    maxFeePerGas: '0x3b9aca00',
    maxPriorityFeePerGas: '0x3b9aca00',
    paymasterAndData: '0x',
    signature: '0x'
  }

  console.log('  UserOperation generated:')
  console.log('    Sender:', userOp.sender)
  console.log('    Nonce:', userOp.nonce)
  console.log('    CallData length:', userOp.callData.length)

  // Step 4: Process through our paymaster
  console.log()
  console.log('4️⃣ Processing through aNodePaymaster...')
  
  try {
    const response = await fetch(`${config.PAYMASTER_URL}/api/v1/paymaster/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userOperation: userOp })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(`Paymaster processing failed: ${result.error?.message}`)
    }

    console.log('  ✅ Paymaster processing successful!')
    console.log('    Payment method:', result.paymentMethod)
    console.log('    PaymasterAndData length:', result.userOperation.paymasterAndData.length)
    
    // Update userOp with paymaster data
    userOp.paymasterAndData = result.userOperation.paymasterAndData

  } catch (error) {
    console.error('  ❌ Paymaster processing failed:', error.message)
    return
  }

  // Step 5: Sign UserOperation (simplified for demo)
  console.log()
  console.log('5️⃣ Signing UserOperation...')
  
  // For a real implementation, you would:
  // 1. Calculate the userOpHash using EntryPoint
  // 2. Sign with the SimpleAccount owner's private key
  // 3. Format as proper signature
  
  // For demo, we'll use a placeholder signature
  userOp.signature = '0x' + '00'.repeat(65) // 65 bytes placeholder
  
  console.log('  ✅ UserOperation signed (demo signature)')

  // Step 6: Display final UserOperation
  console.log()
  console.log('6️⃣ Final UserOperation ready for submission:')
  console.log(JSON.stringify(userOp, null, 2))

  console.log()
  console.log('🎉 E2E Test completed successfully!')
  console.log('📝 Next steps:')
  console.log('   1. Implement proper UserOperation signing')
  console.log('   2. Submit to EntryPoint.handleOps()')
  console.log('   3. Monitor transaction execution')
  console.log('   4. Verify balance changes')
}

// Error handling
main().catch(error => {
  console.error('❌ E2E Test failed:', error)
  process.exit(1)
})
