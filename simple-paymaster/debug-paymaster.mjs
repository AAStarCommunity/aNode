#!/usr/bin/env node

/**
 * 调试脚本 - 测试 paymaster 签名生成
 */

import { ethers } from 'ethers'

const LOCAL_BASE_URL = 'http://localhost:8787'

async function debugPaymaster() {
  console.log('🔍 调试 Paymaster 签名生成...')

  // 创建一个测试 UserOperation
  const userOp = {
    sender: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
    nonce: '0x0',
    initCode: '0x',
    callData: '0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8',
    callGasLimit: '0x5208',
    verificationGasLimit: '0x186a0',
    preVerificationGas: '0x5208',
    maxFeePerGas: '0x3b9aca00',
    maxPriorityFeePerGas: '0x3b9aca00',
    paymasterAndData: '0x',
    signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }

  console.log('📤 发送 UserOperation:', JSON.stringify(userOp, null, 2))

  try {
    const response = await fetch(`${LOCAL_BASE_URL}/api/v1/paymaster/process/v06`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userOperation: userOp
      }),
    })

    const result = await response.json()
    console.log('📥 响应:', JSON.stringify(result, null, 2))

  } catch (error) {
    console.error('❌ 请求错误:', error.message)
  }
}

debugPaymaster().catch(console.error)
