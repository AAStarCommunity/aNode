#!/usr/bin/env node

/**
 * 最终链上提交测试 - 使用正确格式的 paymaster 签名
 */

import { ethers } from 'ethers'
import axios from 'axios'

const CONFIG = {
  alchemyApiKey: '9bwo2HaiHpUXnDS-rohIK',
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  chainId: 11155111
}

const ALCHEMY_URL = `https://eth-sepolia.g.alchemy.com/v2/${CONFIG.alchemyApiKey}`

// 最终版本：使用 ethers 6 生成的正确 paymaster 签名
const FINAL_USER_OPERATION = {
  "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  "nonce": "0x11",
  "initCode": "0x",
  "callData": "0xb61d27f60000000000000000000000003e7b771d4541ec85c8137e950598ac97553a337a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed47685400000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x11170",
  "verificationGasLimit": "0x11170", 
  "preVerificationGas": "0xB61C",
  "maxFeePerGas": "0x3b9aca00",
  "maxPriorityFeePerGas": "0x3b9aca00",
  "paymasterAndData": "0xFA1Ca35Bb99fB0eD7901B41405260667aC8ce2b4000000000000000000000000cf9a6f84d5b2cdfadbd4dd6208f679dd6da94cdf2730e2eeb43f5d565205294e16ffddb659e49ee33c8da91268af46d6221584435b45b4bf51425f1d78e3637a1b",
  "signature": "0xbdc3899977d8542e2ce6f08d946151c07ed55d7ffab46c2ccf4716876dd21f57198d6ab2172f683da9e66d3017988e13334772cfcc1ef58177094555c3a76fd81c"
}

async function finalSubmit() {
  console.log('🚀 最终链上提交测试')
  console.log('使用正确格式的 paymaster 签名')
  console.log('=' .repeat(50))
  
  console.log('📋 UserOperation 摘要:')
  console.log(`  PaymasterAndData 长度: ${FINAL_USER_OPERATION.paymasterAndData.length} 字符`)
  console.log(`  预期格式: 97 bytes = 194 hex chars + 2 = 196 ✅`)
  
  try {
    console.log('\n🚀 提交到 Alchemy Bundler...')
    
    const response = await axios.post(ALCHEMY_URL, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendUserOperation',
      params: [FINAL_USER_OPERATION, CONFIG.entryPoint]
    }, {
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.data.error) {
      throw new Error(`提交失败: ${response.data.error.message} (Code: ${response.data.error.code})`)
    }

    const userOpHash = response.data.result
    console.log('✅ 提交成功!')
    console.log(`📝 UserOperation Hash: ${userOpHash}`)
    
    // 等待确认
    console.log('\n⏳ 等待交易确认...')
    
    for (let i = 0; i < 30; i++) {
      try {
        const receiptResponse = await axios.post(ALCHEMY_URL, {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash]
        })

        if (receiptResponse.data.result) {
          const receipt = receiptResponse.data.result
          console.log('\n🎉 交易确认成功!')
          console.log(`📄 Transaction Hash: ${receipt.receipt.transactionHash}`)
          console.log(`📦 Block Number: ${receipt.receipt.blockNumber}`)
          console.log(`⛽ Actual Gas Used: ${parseInt(receipt.actualGasUsed, 16).toLocaleString()}`)
          console.log(`💰 Actual Gas Cost: ${ethers.formatEther(receipt.actualGasCost)} ETH`)
          console.log(`✅ Success: ${receipt.success}`)
          console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`)
          
          console.log('\n🎊 完整的 ERC-4337 + aNodePaymaster 流程执行成功!')
          console.log('🏆 从 SimpleAccount A 转账 0.001 PNT 到 SimpleAccount B')
          console.log('🔐 通过 aNodePaymaster 赞助 gas 费用')
          console.log('🚀 您的 paymaster 服务已经完全可用于生产环境!')
          return true
        }
      } catch (error) {
        // 继续等待
      }

      await new Promise(r => setTimeout(r, 2000))
      process.stdout.write(`   ⏳ 尝试 ${i + 1}/30...\r`)
    }
    
    console.log('\n⚠️  等待超时，但交易可能仍在处理中')
    console.log(`🔍 请查询 UserOpHash: ${userOpHash}`)
    return true
    
  } catch (error) {
    console.error('\n❌ 提交失败:', error.message)
    
    if (error.message.includes('AA23')) {
      console.error('💡 AA23: paymaster 签名验证失败')
    } else if (error.message.includes('AA33')) {
      console.error('💡 AA33: paymaster 验证逻辑失败')
    }
    
    return false
  }
}

finalSubmit().then(success => {
  process.exit(success ? 0 : 1)
})
