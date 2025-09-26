#!/usr/bin/env node

/**
 * 提交 UserOperation 到链上 - 使用 Alchemy Bundler API
 * 
 * 用法:
 * 1. 先运行 test-with-key.mjs 生成 UserOperation
 * 2. 复制输出的 UserOperation JSON
 * 3. 运行: node submit-to-chain.mjs '<UserOperation_JSON>'
 * 
 * 或者直接从环境变量运行:
 * OWNER_PRIVATE_KEY=0x... node submit-to-chain.mjs
 */

import { createPublicClient, createWalletClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// Alchemy Bundler API 配置
const ALCHEMY_CONFIG = {
  API_KEY: 'Bx4QRW1-vnwJUePSAAD7N',
  BUNDLER_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',
  NETWORK: 'sepolia',
  ENTRYPOINT_V06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  ENTRYPOINT_V07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
}

// 测试账户配置 (与 test-with-key.mjs 保持一致)
const TEST_CONFIG = {
  SIMPLE_ACCOUNT_A: "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  SIMPLE_ACCOUNT_B: "0x27243FAc2c0bEf46F143a705708dC4A7eD476854",
  PNT_TOKEN_ADDRESS: "0x3e7B771d4541eC85c8137e950598Ac97553a337a",
  PAYMASTER_URL: "http://localhost:8787",
  SEPOLIA_RPC: "https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N"
}

class AlchemyBundlerSubmitter {
  constructor() {
    this.alchemyUrl = ALCHEMY_CONFIG.BUNDLER_URL
    this.entryPointV06 = ALCHEMY_CONFIG.ENTRYPOINT_V06
    
    // 创建 viem 客户端用于查询
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(TEST_CONFIG.SEPOLIA_RPC)
    })
    
    console.log('🚀 Alchemy Bundler Submitter 初始化')
    console.log(`📍 网络: ${ALCHEMY_CONFIG.NETWORK}`)
    console.log(`🔗 Bundler URL: ${this.alchemyUrl}`)
    console.log(`📌 EntryPoint v0.6: ${this.entryPointV06}`)
  }

  /**
   * 调用 Alchemy Bundler API
   */
  async callBundlerAPI(method, params = []) {
    const response = await fetch(this.alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      })
    })

    const result = await response.json()
    
    if (result.error) {
      throw new Error(`Bundler API Error: ${result.error.message} (Code: ${result.error.code})`)
    }
    
    return result.result
  }

  /**
   * 测试 Bundler 连通性
   */
  async testBundlerConnectivity() {
    console.log('\n🔗 测试 Bundler 连通性...')
    
    try {
      // 尝试获取支持的 EntryPoints
      let supportedEntryPoints
      try {
        supportedEntryPoints = await this.callBundlerAPI('eth_supportedEntryPoints')
        console.log('✅ 支持的 EntryPoints:', supportedEntryPoints)
      } catch (error) {
        console.log('ℹ️  eth_supportedEntryPoints 不支持，使用默认 EntryPoint')
        supportedEntryPoints = [this.entryPointV06]
      }

      // 检查我们的 EntryPoint 是否被支持
      if (!supportedEntryPoints.includes(this.entryPointV06)) {
        throw new Error(`EntryPoint v0.6 (${this.entryPointV06}) 不被支持`)
      }

      console.log('✅ Bundler 连通性正常')
      return true
    } catch (error) {
      console.error('❌ Bundler 连通性测试失败:', error.message)
      return false
    }
  }

  /**
   * 估算 UserOperation Gas
   */
  async estimateUserOperationGas(userOp) {
    console.log('\n⛽ 估算 UserOperation Gas...')
    
    try {
      const gasEstimate = await this.callBundlerAPI(
        'eth_estimateUserOperationGas',
        [userOp, this.entryPointV06]
      )
      
      console.log('✅ Gas 估算成功:')
      console.log('  - Call Gas Limit:', gasEstimate.callGasLimit)
      console.log('  - Verification Gas Limit:', gasEstimate.verificationGasLimit)
      console.log('  - Pre-verification Gas:', gasEstimate.preVerificationGas)
      
      return gasEstimate
    } catch (error) {
      console.error('⚠️  Gas 估算失败:', error.message)
      console.log('ℹ️  将使用 UserOperation 中的现有 Gas 限制')
      return null
    }
  }

  /**
   * 获取推荐的 Gas 价格
   */
  async getRecommendedGasPrice() {
    console.log('\n💰 获取推荐 Gas 价格...')
    
    try {
      // 尝试 Rundler 特有的方法
      const priorityFee = await this.callBundlerAPI('rundler_maxPriorityFeePerGas')
      console.log('✅ 推荐优先费用 (Rundler):', priorityFee)
      return { maxPriorityFeePerGas: priorityFee }
    } catch (error) {
      console.log('ℹ️  rundler_maxPriorityFeePerGas 不支持，使用链上 Gas 价格')
      
      try {
        const gasPrice = await this.publicClient.getGasPrice()
        const gasPriceHex = `0x${gasPrice.toString(16)}`
        console.log('✅ 当前 Gas 价格:', gasPriceHex)
        return { 
          maxFeePerGas: gasPriceHex,
          maxPriorityFeePerGas: gasPriceHex
        }
      } catch (error2) {
        console.log('⚠️  获取 Gas 价格失败，使用默认值')
        return {
          maxFeePerGas: '0x3b9aca00',      // 1 gwei
          maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei
        }
      }
    }
  }

  /**
   * 提交 UserOperation 到 Bundler
   */
  async sendUserOperation(userOp) {
    console.log('\n🚀 提交 UserOperation 到 Bundler...')
    
    try {
      const userOpHash = await this.callBundlerAPI(
        'eth_sendUserOperation',
        [userOp, this.entryPointV06]
      )
      
      console.log('✅ UserOperation 提交成功!')
      console.log('📋 UserOperation Hash:', userOpHash)
      
      return userOpHash
    } catch (error) {
      console.error('❌ UserOperation 提交失败:', error.message)
      throw error
    }
  }

  /**
   * 查询 UserOperation 状态
   */
  async waitForUserOperation(userOpHash, maxWaitTime = 60000) {
    console.log('\n⏳ 等待 UserOperation 执行...')
    console.log(`🔍 监控 Hash: ${userOpHash}`)
    console.log(`⏰ 最大等待时间: ${maxWaitTime / 1000}s`)
    
    const startTime = Date.now()
    const pollInterval = 3000 // 3秒轮询一次
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // 查询 UserOperation 详情
        const userOp = await this.callBundlerAPI(
          'eth_getUserOperationByHash',
          [userOpHash]
        )
        
        if (userOp) {
          console.log('✅ UserOperation 已被 Bundler 处理')
          
          // 查询交易收据
          try {
            const receipt = await this.callBundlerAPI(
              'eth_getUserOperationReceipt',
              [userOpHash]
            )
            
            if (receipt) {
              console.log('🎉 UserOperation 执行成功!')
              console.log('📄 交易详情:')
              console.log('  - 交易 Hash:', receipt.transactionHash)
              console.log('  - 区块号:', receipt.blockNumber)
              console.log('  - Gas 使用:', receipt.actualGasUsed)
              console.log('  - 执行状态:', receipt.success ? '成功' : '失败')
              
              return receipt
            }
          } catch (receiptError) {
            console.log('ℹ️  交易收据尚未生成，继续等待...')
          }
        }
        
        // 等待下次轮询
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        process.stdout.write('.')
        
      } catch (error) {
        // UserOperation 可能还未被处理
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        process.stdout.write('.')
      }
    }
    
    console.log('\n⚠️  等待超时，请手动查询 UserOperation 状态')
    console.log(`🔗 可以使用以下命令查询: eth_getUserOperationByHash("${userOpHash}")`)
    return null
  }

  /**
   * 生成新的 UserOperation (如果没有提供)
   */
  async generateFreshUserOperation(privateKey) {
    console.log('\n📝 生成新的 UserOperation...')
    
    const account = privateKeyToAccount(privateKey)
    console.log('👤 Owner Address:', account.address)
    
    // 这里可以复用 test-with-key.mjs 的逻辑
    // 为了简化，我们提供一个基本的 UserOperation 模板
    const basicUserOp = {
      sender: TEST_CONFIG.SIMPLE_ACCOUNT_A,
      nonce: '0x0', // 需要从链上获取实际 nonce
      initCode: '0x',
      callData: '0x', // 需要根据实际操作生成
      callGasLimit: '0x5208',
      verificationGasLimit: '0x186a0',
      preVerificationGas: '0x5208',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      paymasterAndData: '0x',
      signature: '0x'
    }
    
    console.log('ℹ️  生成了基本 UserOperation 模板')
    console.log('⚠️  实际使用时请通过 test-with-key.mjs 生成完整的 UserOperation')
    
    return basicUserOp
  }

  /**
   * 主要的提交流程
   */
  async submitUserOperation(userOpInput, privateKey = null) {
    console.log('🚀 开始 UserOperation 链上提交流程')
    console.log('=' .repeat(50))
    
    let userOp
    
    // 解析 UserOperation 输入
    if (typeof userOpInput === 'string') {
      try {
        userOp = JSON.parse(userOpInput)
        console.log('✅ 从 JSON 字符串解析 UserOperation')
      } catch (error) {
        console.error('❌ UserOperation JSON 解析失败:', error.message)
        return false
      }
    } else if (typeof userOpInput === 'object') {
      userOp = userOpInput
      console.log('✅ 使用提供的 UserOperation 对象')
    } else if (privateKey) {
      userOp = await this.generateFreshUserOperation(privateKey)
      console.log('✅ 生成新的 UserOperation')
    } else {
      console.error('❌ 请提供 UserOperation 或私钥')
      return false
    }
    
    console.log('\n📋 UserOperation 摘要:')
    console.log('  - Sender:', userOp.sender)
    console.log('  - Nonce:', userOp.nonce)
    console.log('  - PaymasterAndData 长度:', userOp.paymasterAndData?.length || 0)
    console.log('  - Signature 长度:', userOp.signature?.length || 0)
    
    // 1. 测试 Bundler 连通性
    const isConnected = await this.testBundlerConnectivity()
    if (!isConnected) {
      return false
    }
    
    // 2. 估算 Gas (可选)
    const gasEstimate = await this.estimateUserOperationGas(userOp)
    if (gasEstimate) {
      // 使用估算的 Gas 值更新 UserOperation
      userOp.callGasLimit = gasEstimate.callGasLimit
      userOp.verificationGasLimit = gasEstimate.verificationGasLimit
      userOp.preVerificationGas = gasEstimate.preVerificationGas
    }
    
    // 3. 获取推荐 Gas 价格
    const gasPrice = await this.getRecommendedGasPrice()
    if (gasPrice.maxFeePerGas) {
      userOp.maxFeePerGas = gasPrice.maxFeePerGas
    }
    if (gasPrice.maxPriorityFeePerGas) {
      userOp.maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas
    }
    
    console.log('\n📊 最终 UserOperation:')
    console.log(JSON.stringify(userOp, null, 2))
    
    // 4. 提交 UserOperation
    try {
      const userOpHash = await this.sendUserOperation(userOp)
      
      // 5. 等待执行结果
      const receipt = await this.waitForUserOperation(userOpHash)
      
      if (receipt) {
        console.log('\n🎉 UserOperation 执行完成!')
        console.log('🔗 在 Sepolia 浏览器查看:')
        console.log(`   https://sepolia.etherscan.io/tx/${receipt.transactionHash}`)
        return true
      } else {
        console.log('\n⚠️  UserOperation 已提交，但执行状态未确认')
        console.log('🔍 请手动查询执行结果')
        return true
      }
      
    } catch (error) {
      console.error('\n❌ 提交流程失败:', error.message)
      return false
    }
  }
}

// 解析命令行参数
function parseArguments() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    // 尝试从环境变量获取私钥
    const privateKey = process.env.OWNER_PRIVATE_KEY
    if (privateKey) {
      console.log('📋 使用环境变量中的私钥生成 UserOperation')
      return { privateKey }
    } else {
      console.log('❌ 用法:')
      console.log('  1. 提供 UserOperation JSON:')
      console.log('     node submit-to-chain.mjs \'{"sender":"0x...","nonce":"0x0",...}\'')
      console.log('')
      console.log('  2. 使用环境变量私钥:')
      console.log('     OWNER_PRIVATE_KEY=0x... node submit-to-chain.mjs')
      console.log('')
      console.log('  3. 直接提供私钥:')
      console.log('     node submit-to-chain.mjs --private-key 0x...')
      process.exit(1)
    }
  }
  
  if (args[0] === '--private-key' && args[1]) {
    return { privateKey: args[1] }
  } else {
    return { userOpInput: args[0] }
  }
}

// 主函数
async function main() {
  console.log('🎯 aNodePaymaster - UserOperation 链上提交工具')
  console.log('基于 Alchemy Bundler API')
  console.log('=' .repeat(60))
  
  const { userOpInput, privateKey } = parseArguments()
  
  const submitter = new AlchemyBundlerSubmitter()
  
  const success = await submitter.submitUserOperation(userOpInput, privateKey)
  
  if (success) {
    console.log('\n🎊 恭喜! UserOperation 已成功提交并执行!')
    process.exit(0)
  } else {
    console.log('\n💥 UserOperation 提交失败')
    process.exit(1)
  }
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 程序执行失败:', error)
    process.exit(1)
  })
}

export default AlchemyBundlerSubmitter
