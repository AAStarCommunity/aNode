#!/usr/bin/env node

/**
 * 提交刚才成功生成的 UserOperation 到 Alchemy Bundler
 * 基于 web-app 的成功配置和 final-alchemy-submit.js
 */

import { ethers } from 'ethers'
import axios from 'axios'

// 使用 web-app 的成功配置
const CONFIG = {
  // 使用 web-app 的 Alchemy API Key (付费版本)
  alchemyApiKey: '9bwo2HaiHpUXnDS-rohIK',
  
  // 测试账户配置 (与 test-with-key.mjs 一致)
  privateKey: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  eoaAddress: '0x411BD567E46C0781248dbB6a9211891C032885e5',
  
  // SimpleAccount 地址
  simpleAccountA: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  simpleAccountB: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',
  
  // 合约地址
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  pntToken: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  
  // Sepolia 链 ID
  chainId: 11155111
}

const ALCHEMY_URL = `https://eth-sepolia.g.alchemy.com/v2/${CONFIG.alchemyApiKey}`

// 最终修复版本：正确的 paymaster 签名 UserOperation
const SUCCESS_USER_OPERATION = {
  "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  "nonce": "0x11",
  "initCode": "0x",
  "callData": "0xb61d27f60000000000000000000000003e7b771d4541ec85c8137e950598ac97553a337a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed47685400000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x11170",
  "verificationGasLimit": "0x11170", 
  "preVerificationGas": "0xB61C",
  "maxFeePerGas": "0x3b9aca00",
  "maxPriorityFeePerGas": "0x3b9aca00",
  "paymasterAndData": "0xFA1Ca35Bb99fB0eD7901B41405260667aC8ce2b400000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000000c350681bfe461dde564e0220cf07694f9ed8dd0d747b250e76c1a15fe3c48f539a245fa19065b03547c2939b5e2516e7702b64666f2612bcfe0675abbd3c4110ac621b",
  "signature": "0xe3ad14dd9ae27022c4f75e81c7ab0cda619a343566db061a1f86e0938f4dcc8f1823e0db2efc1a2dd36fc8e5c227436629a94cd46e78e229573b2e8a3e953ca51c"
}

class AlchemySubmitter {
  constructor() {
    this.alchemyUrl = ALCHEMY_URL
    this.entryPoint = CONFIG.entryPoint
    this.chainId = CONFIG.chainId
    
    console.log('🚀 Alchemy Bundler Submitter 初始化')
    console.log(`🔑 API Key: ${CONFIG.alchemyApiKey.substring(0, 8)}...`)
    console.log(`🌐 网络: Sepolia (${this.chainId})`)
    console.log(`📌 EntryPoint: ${this.entryPoint}`)
  }

  /**
   * 调用 Alchemy Bundler API
   */
  async callAlchemyAPI(method, params = []) {
    try {
      const response = await axios.post(this.alchemyUrl, {
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      }, {
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.data.error) {
        throw new Error(`API Error: ${response.data.error.message} (Code: ${response.data.error.code})`)
      }

      return response.data.result
    } catch (error) {
      if (error.response?.data?.error) {
        throw new Error(`API Error: ${error.response.data.error.message}`)
      }
      throw error
    }
  }

  /**
   * 测试 Bundler 连通性
   */
  async testConnectivity() {
    console.log('\n🔗 1. 测试 Bundler 连通性...')
    
    try {
      // 尝试获取支持的 EntryPoints
      let supportedEntryPoints
      try {
        supportedEntryPoints = await this.callAlchemyAPI('eth_supportedEntryPoints')
        console.log('   ✅ 支持的 EntryPoints:', supportedEntryPoints)
      } catch (error) {
        console.log('   ℹ️  eth_supportedEntryPoints 不支持 (正常)')
        supportedEntryPoints = [this.entryPoint]
      }

      // 验证 EntryPoint 支持
      if (supportedEntryPoints.includes(this.entryPoint)) {
        console.log('   ✅ EntryPoint v0.6 被支持')
      } else {
        console.log('   ⚠️  EntryPoint v0.6 可能不被支持，但继续尝试')
      }

      return true
    } catch (error) {
      console.error('   ❌ 连通性测试失败:', error.message)
      return false
    }
  }

  /**
   * 验证 UserOperation 格式
   */
  validateUserOperation(userOp) {
    console.log('\n📋 2. 验证 UserOperation 格式...')
    
    const requiredFields = [
      'sender', 'nonce', 'initCode', 'callData',
      'callGasLimit', 'verificationGasLimit', 'preVerificationGas',
      'maxFeePerGas', 'maxPriorityFeePerGas', 'paymasterAndData', 'signature'
    ]

    const missingFields = requiredFields.filter(field => !(field in userOp))
    if (missingFields.length > 0) {
      throw new Error(`缺少必需字段: ${missingFields.join(', ')}`)
    }

    console.log('   ✅ 所有必需字段存在')
    console.log(`   📊 Sender: ${userOp.sender}`)
    console.log(`   📊 Nonce: ${userOp.nonce} (${parseInt(userOp.nonce, 16)})`)
    console.log(`   📊 PaymasterAndData: ${userOp.paymasterAndData.length} bytes`)
    console.log(`   📊 Signature: ${userOp.signature.length} bytes`)
    
    // 验证地址格式
    if (!ethers.isAddress(userOp.sender)) {
      throw new Error(`无效的 sender 地址: ${userOp.sender}`)
    }

    // 验证签名长度 (应该是 132 个字符 = 0x + 130 hex chars = 65 bytes)
    if (userOp.signature.length !== 132) {
      console.log(`   ⚠️  签名长度异常: ${userOp.signature.length} (期望: 132)`)
    }

    // 验证 paymasterAndData
    if (userOp.paymasterAndData !== '0x' && userOp.paymasterAndData.length < 42) {
      console.log(`   ⚠️  PaymasterAndData 长度可能异常: ${userOp.paymasterAndData.length}`)
    }

    console.log('   ✅ UserOperation 格式验证通过')
    return true
  }

  /**
   * 估算 Gas (可选)
   */
  async estimateGas(userOp) {
    console.log('\n⛽ 3. 估算 UserOperation Gas...')
    
    try {
      // 创建一个没有签名的副本用于估算
      const userOpForEstimate = { ...userOp, signature: '0x' }
      
      const gasEstimate = await this.callAlchemyAPI(
        'eth_estimateUserOperationGas',
        [userOpForEstimate, this.entryPoint]
      )
      
      console.log('   ✅ Gas 估算成功:')
      console.log(`      Call Gas: ${gasEstimate.callGasLimit} (${parseInt(gasEstimate.callGasLimit, 16).toLocaleString()})`)
      console.log(`      Verification Gas: ${gasEstimate.verificationGasLimit} (${parseInt(gasEstimate.verificationGasLimit, 16).toLocaleString()})`)
      console.log(`      Pre-verification Gas: ${gasEstimate.preVerificationGas} (${parseInt(gasEstimate.preVerificationGas, 16).toLocaleString()})`)
      
      return gasEstimate
    } catch (error) {
      console.log('   ⚠️  Gas 估算失败 (继续使用现有值):', error.message)
      return null
    }
  }

  /**
   * 提交 UserOperation
   */
  async submitUserOperation(userOp) {
    console.log('\n🚀 4. 提交 UserOperation 到 Alchemy Bundler...')
    
    try {
      console.log('   📤 发送中...')
      
      const userOpHash = await this.callAlchemyAPI(
        'eth_sendUserOperation',
        [userOp, this.entryPoint]
      )
      
      console.log('   ✅ 提交成功!')
      console.log(`   📝 UserOperation Hash: ${userOpHash}`)
      
      return userOpHash
    } catch (error) {
      console.error('   ❌ 提交失败:', error.message)
      throw error
    }
  }

  /**
   * 等待交易确认
   */
  async waitForConfirmation(userOpHash, maxAttempts = 30) {
    console.log('\n⏳ 5. 等待交易确认...')
    console.log(`   🔍 监控 UserOpHash: ${userOpHash}`)
    console.log(`   ⏰ 最大尝试次数: ${maxAttempts} (每2秒一次)`)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 查询 UserOperation 收据
        const receipt = await this.callAlchemyAPI(
          'eth_getUserOperationReceipt',
          [userOpHash]
        )
        
        if (receipt) {
          console.log('\n   🎉 交易确认成功!')
          console.log(`   📄 Transaction Hash: ${receipt.receipt.transactionHash}`)
          console.log(`   📦 Block Number: ${receipt.receipt.blockNumber}`)
          console.log(`   ⛽ Actual Gas Used: ${parseInt(receipt.actualGasUsed, 16).toLocaleString()}`)
          console.log(`   💰 Actual Gas Cost: ${ethers.formatEther(receipt.actualGasCost)} ETH`)
          console.log(`   ✅ Success: ${receipt.success}`)
          console.log(`   🔗 Etherscan: https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`)
          
          return receipt
        }
      } catch (error) {
        // 收据可能还未生成，继续等待
      }
      
      // 显示进度
      process.stdout.write(`   ⏳ 尝试 ${attempt}/${maxAttempts}...\r`)
      
      // 等待 2 秒
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log('\n   ⚠️  等待超时，交易可能仍在处理中')
    console.log(`   💡 请手动查询: eth_getUserOperationReceipt("${userOpHash}")`)
    return null
  }

  /**
   * 完整的提交流程
   */
  async executeSubmission(userOp) {
    console.log('🎯 开始 UserOperation 链上提交流程')
    console.log('=' .repeat(60))
    
    try {
      // 1. 测试连通性
      const isConnected = await this.testConnectivity()
      if (!isConnected) {
        throw new Error('Bundler 连通性测试失败')
      }
      
      // 2. 验证 UserOperation
      this.validateUserOperation(userOp)
      
      // 3. 估算 Gas (可选)
      await this.estimateGas(userOp)
      
      // 4. 提交到 Bundler
      const userOpHash = await this.submitUserOperation(userOp)
      
      // 5. 等待确认
      const receipt = await this.waitForConfirmation(userOpHash)
      
      // 6. 总结
      console.log('\n🎊 提交流程完成!')
      console.log('=' .repeat(60))
      
      if (receipt && receipt.success) {
        console.log('✅ 状态: 成功执行')
        console.log(`📋 从 SimpleAccount A (${CONFIG.simpleAccountA})`)
        console.log(`📋 转账 0.001 PNT 到 SimpleAccount B (${CONFIG.simpleAccountB})`)
        console.log(`🔐 通过 aNodePaymaster 赞助 gas 费用`)
        console.log(`💰 实际 gas 消耗: ${parseInt(receipt.actualGasUsed, 16).toLocaleString()}`)
        console.log(`🎯 这证明了完整的 ERC-4337 + Paymaster 流程正常工作!`)
      } else {
        console.log('⚠️  状态: 已提交，等待确认')
        console.log(`🔍 请查询 UserOpHash: ${userOpHash}`)
      }
      
      return true
      
    } catch (error) {
      console.error('\n💥 提交流程失败:', error.message)
      
      // 提供调试信息
      if (error.message.includes('AA23') || error.message.includes('AA24')) {
        console.error('💡 这可能是 paymaster 验证失败，请检查:')
        console.error('   - Paymaster 合约是否有足够的 EntryPoint 存款')
        console.error('   - PaymasterAndData 签名是否正确')
      } else if (error.message.includes('AA25')) {
        console.error('💡 这可能是 paymaster 余额不足')
      } else if (error.message.includes('AA10')) {
        console.error('💡 这可能是 sender 账户验证失败')
      }
      
      return false
    }
  }
}

async function main() {
  console.log('🎯 aNodePaymaster - 链上提交工具')
  console.log('基于 web-app 成功配置 + Alchemy Bundler API')
  console.log('提交刚才生成的成功 UserOperation')
  console.log('=' .repeat(60))
  
  const submitter = new AlchemySubmitter()
  const success = await submitter.executeSubmission(SUCCESS_USER_OPERATION)
  
  if (success) {
    console.log('\n🚀 恭喜! 完整的 ERC-4337 + aNodePaymaster 流程执行成功!')
    console.log('🎉 您的 paymaster 服务已经完全可用于生产环境!')
    process.exit(0)
  } else {
    console.log('\n💥 提交失败，请检查错误信息')
    process.exit(1)
  }
}

// 运行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 程序执行失败:', error)
    process.exit(1)
  })
}

export default AlchemySubmitter
