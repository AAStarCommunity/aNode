#!/usr/bin/env node

/**
 * 调试 Paymaster 签名问题
 * 系统性分析 AA23/AA33 错误的原因
 */

import { ethers } from 'ethers'

// 配置 (与其他脚本保持一致)
const CONFIG = {
  alchemyApiKey: '9bwo2HaiHpUXnDS-rohIK',
  privateKey: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  simpleAccountA: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  paymasterContract: '0x3720B69B7f30D92FACed624c39B1fd317408774B',
  chainId: 11155111
}

const SEPOLIA_RPC = `https://eth-sepolia.g.alchemy.com/v2/${CONFIG.alchemyApiKey}`

// 从最新测试复制的 UserOperation
const TEST_USER_OPERATION = {
  "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  "nonce": "0x11",
  "initCode": "0x",
  "callData": "0xb61d27f60000000000000000000000003e7b771d4541ec85c8137e950598ac97553a337a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed47685400000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x11170",
  "verificationGasLimit": "0x11170",
  "preVerificationGas": "0xB4B0",
  "maxFeePerGas": "0x3b9aca00",
  "maxPriorityFeePerGas": "0x3b9aca00",
  "paymasterAndData": "0x3720B69B7f30D92FACed624c39B1fd317408774B00000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000000c3506dda823b9e77462c7c8006f74a0f5274f963a864e4c79bf120ca6938d210869400000000000000000000000000000000000000000000000000000000000000001b",
  "signature": "0x4e06cfebd3a3051a43a191c76a8544523a7447cbfc36b2380bec35f564607d8f0f339c3ac78ce0985035e5a0d26ae554b83e9da8c0efde7bffc754119cf0b1af1c"
}

class SignatureDebugger {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(SEPOLIA_RPC)
    this.signer = new ethers.Wallet(CONFIG.privateKey, this.provider)
    
    console.log('🔍 Paymaster 签名调试器')
    console.log(`🔑 Signer: ${this.signer.address}`)
    console.log(`📌 EntryPoint: ${CONFIG.entryPoint}`)
    console.log(`💰 Paymaster: ${CONFIG.paymasterContract}`)
  }

  /**
   * 1. 分析 paymasterAndData 结构
   */
  analyzePaymasterAndData() {
    console.log('\n📋 1. 分析 paymasterAndData 结构')
    console.log('=' .repeat(50))
    
    const paymasterAndData = TEST_USER_OPERATION.paymasterAndData
    const data = paymasterAndData.slice(2) // 去掉 0x
    
    console.log(`总长度: ${paymasterAndData.length} 字符 (${data.length / 2} bytes)`)
    console.log(`是否偶数: ${paymasterAndData.length % 2 === 0}`)
    
    // 按 ERC-4337 标准解析
    const paymasterAddress = '0x' + data.slice(0, 40) // 20 bytes
    const verificationGasLimit = '0x' + data.slice(40, 104) // 32 bytes  
    const postOpGasLimit = '0x' + data.slice(104, 168) // 32 bytes
    const paymasterDataAndSignature = '0x' + data.slice(168) // 剩余部分
    
    console.log('\n结构分析:')
    console.log(`  Paymaster Address (20 bytes): ${paymasterAddress}`)
    console.log(`  Verification Gas (32 bytes): ${verificationGasLimit}`)
    console.log(`  Post Op Gas (32 bytes): ${postOpGasLimit}`)
    console.log(`  Data + Signature (${paymasterDataAndSignature.length - 2} chars): ${paymasterDataAndSignature.slice(0, 20)}...`)
    
    // 验证地址
    if (paymasterAddress.toLowerCase() !== CONFIG.paymasterContract.toLowerCase()) {
      console.log(`  ❌ Paymaster 地址不匹配!`)
      console.log(`     期望: ${CONFIG.paymasterContract}`)
      console.log(`     实际: ${paymasterAddress}`)
    } else {
      console.log(`  ✅ Paymaster 地址匹配`)
    }
    
    return {
      paymasterAddress,
      verificationGasLimit,
      postOpGasLimit,
      paymasterDataAndSignature
    }
  }

  /**
   * 2. 计算正确的 UserOpHash
   */
  async calculateCorrectUserOpHash() {
    console.log('\n🏗️  2. 计算正确的 UserOpHash')
    console.log('=' .repeat(50))
    
    // 创建用于 hash 计算的 UserOperation (不包含签名)
    const userOpForHash = {
      sender: TEST_USER_OPERATION.sender,
      nonce: BigInt(TEST_USER_OPERATION.nonce),
      initCode: TEST_USER_OPERATION.initCode,
      callData: TEST_USER_OPERATION.callData,
      callGasLimit: BigInt(TEST_USER_OPERATION.callGasLimit),
      verificationGasLimit: BigInt(TEST_USER_OPERATION.verificationGasLimit),
      preVerificationGas: BigInt(TEST_USER_OPERATION.preVerificationGas),
      maxFeePerGas: BigInt(TEST_USER_OPERATION.maxFeePerGas),
      maxPriorityFeePerGas: BigInt(TEST_USER_OPERATION.maxPriorityFeePerGas),
      paymasterAndData: TEST_USER_OPERATION.paymasterAndData,
      signature: '0x'
    }
    
    console.log('UserOperation (用于 hash):')
    console.log(`  Sender: ${userOpForHash.sender}`)
    console.log(`  Nonce: ${userOpForHash.nonce}`)
    console.log(`  PaymasterAndData: ${userOpForHash.paymasterAndData.slice(0, 20)}...`)
    
    // 方法1: 使用 EntryPoint 合约计算
    try {
      const entryPointAbi = [
        'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
      ]
      
      const entryPoint = new ethers.Contract(CONFIG.entryPoint, entryPointAbi, this.provider)
      const userOpHash = await entryPoint.getUserOpHash(userOpForHash)
      
      console.log(`\n✅ EntryPoint 计算的 UserOpHash: ${userOpHash}`)
      return userOpHash
      
    } catch (error) {
      console.error(`❌ EntryPoint hash 计算失败:`, error.message)
    }
    
    // 方法2: 手动计算 (ERC-4337 标准)
    try {
      console.log('\n🔧 手动计算 UserOpHash...')
      
      const userOpStructHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([
        'address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'
      ], [
        userOpForHash.sender,
        userOpForHash.nonce,
        ethers.keccak256(userOpForHash.initCode),
        ethers.keccak256(userOpForHash.callData),
        userOpForHash.callGasLimit,
        userOpForHash.verificationGasLimit,
        userOpForHash.preVerificationGas,
        userOpForHash.maxFeePerGas,
        userOpForHash.maxPriorityFeePerGas,
        ethers.keccak256(userOpForHash.paymasterAndData)
      ]))
      
      const userOpHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([
        'bytes32', 'address', 'uint256'
      ], [
        userOpStructHash,
        CONFIG.entryPoint,
        CONFIG.chainId
      ]))
      
      console.log(`✅ 手动计算的 UserOpHash: ${userOpHash}`)
      return userOpHash
      
    } catch (error) {
      console.error(`❌ 手动 hash 计算失败:`, error.message)
      return null
    }
  }

  /**
   * 3. 生成正确的 Paymaster 签名
   */
  async generateCorrectPaymasterSignature(userOpHash) {
    console.log('\n✍️  3. 生成正确的 Paymaster 签名')
    console.log('=' .repeat(50))
    
    if (!userOpHash) {
      console.error('❌ 没有有效的 UserOpHash')
      return null
    }
    
    console.log(`UserOpHash: ${userOpHash}`)
    
    try {
      // 使用 ethers.js 的标准签名方法
      const messageBytes = ethers.getBytes(userOpHash)
      const signature = await this.signer.signMessage(messageBytes)
      
      console.log(`✅ 生成的签名: ${signature}`)
      console.log(`   签名长度: ${signature.length} 字符 (${(signature.length - 2) / 2} bytes)`)
      
      // 验证签名
      const recoveredAddress = ethers.verifyMessage(messageBytes, signature)
      console.log(`🔍 恢复的地址: ${recoveredAddress}`)
      console.log(`   是否匹配: ${recoveredAddress.toLowerCase() === this.signer.address.toLowerCase()}`)
      
      return signature
      
    } catch (error) {
      console.error(`❌ 签名生成失败:`, error.message)
      return null
    }
  }

  /**
   * 4. 重构正确的 paymasterAndData
   */
  reconstructPaymasterAndData(correctSignature) {
    console.log('\n🔧 4. 重构正确的 paymasterAndData')
    console.log('=' .repeat(50))
    
    if (!correctSignature) {
      console.error('❌ 没有有效的签名')
      return null
    }
    
    // 按照我们的 paymaster 实现重构
    const paymasterAddress = CONFIG.paymasterContract // 20 bytes (40 hex chars)
    const verificationGasLimit = BigInt('0x186a0').toString(16).padStart(64, '0') // 32 bytes (64 hex chars)
    const postOpGasLimit = BigInt('0xc350').toString(16).padStart(64, '0') // 32 bytes (64 hex chars)
    const paymasterData = '' // 空
    const signature = correctSignature.slice(2) // 去掉 0x，65 bytes (130 hex chars)
    
    const reconstructed = paymasterAddress + verificationGasLimit + postOpGasLimit + paymasterData + signature
    
    console.log('重构的 paymasterAndData:')
    console.log(`  Paymaster (20 bytes): ${paymasterAddress}`)
    console.log(`  Verification Gas (32 bytes): 0x${verificationGasLimit}`)
    console.log(`  Post Op Gas (32 bytes): 0x${postOpGasLimit}`)
    console.log(`  Paymaster Data: ${paymasterData || '(empty)'}`)
    console.log(`  Signature (65 bytes): 0x${signature}`)
    console.log(`\n完整 paymasterAndData: 0x${reconstructed}`)
    console.log(`长度: ${reconstructed.length + 2} 字符 (${(reconstructed.length) / 2} bytes)`)
    
    return '0x' + reconstructed
  }

  /**
   * 5. 对比分析
   */
  compareSignatures() {
    console.log('\n📊 5. 对比分析')
    console.log('=' .repeat(50))
    
    const originalPaymasterAndData = TEST_USER_OPERATION.paymasterAndData
    const originalData = originalPaymasterAndData.slice(2)
    
    // 提取原始签名 (最后 130 个字符)
    const originalSignature = '0x' + originalData.slice(-130)
    
    console.log('原始 vs 期望:')
    console.log(`原始 paymasterAndData 长度: ${originalPaymasterAndData.length}`)
    console.log(`原始签名: ${originalSignature}`)
    
    // 分析原始签名的问题
    if (originalSignature.length !== 132) {
      console.log(`❌ 原始签名长度错误: ${originalSignature.length} (期望: 132)`)
    }
    
    // 检查签名格式
    try {
      const r = originalSignature.slice(2, 66)
      const s = originalSignature.slice(66, 130)
      const v = originalSignature.slice(130, 132)
      
      console.log(`签名组成:`)
      console.log(`  r: 0x${r}`)
      console.log(`  s: 0x${s}`)
      console.log(`  v: 0x${v} (${parseInt(v, 16)})`)
      
      // 验证 v 值 (应该是 27 或 28)
      const vValue = parseInt(v, 16)
      if (vValue !== 27 && vValue !== 28) {
        console.log(`❌ v 值异常: ${vValue} (期望: 27 或 28)`)
      }
      
    } catch (error) {
      console.error(`❌ 签名解析失败:`, error.message)
    }
  }

  /**
   * 主调试流程
   */
  async debugSignature() {
    console.log('🚀 开始 Paymaster 签名调试')
    console.log('=' .repeat(60))
    
    // 1. 分析现有结构
    const structure = this.analyzePaymasterAndData()
    
    // 2. 计算正确的 UserOpHash
    const correctUserOpHash = await this.calculateCorrectUserOpHash()
    
    // 3. 生成正确的签名
    const correctSignature = await this.generateCorrectPaymasterSignature(correctUserOpHash)
    
    // 4. 重构 paymasterAndData
    const correctPaymasterAndData = this.reconstructPaymasterAndData(correctSignature)
    
    // 5. 对比分析
    this.compareSignatures()
    
    // 6. 输出建议
    console.log('\n💡 调试建议')
    console.log('=' .repeat(50))
    
    if (correctPaymasterAndData) {
      console.log('✅ 生成了正确的 paymasterAndData')
      console.log('🔧 建议更新 TypeScript paymaster 实现:')
      console.log('   1. 使用真实的 UserOpHash 计算')
      console.log('   2. 使用 ethers.js 进行 ECDSA 签名')
      console.log('   3. 确保签名格式为 65 bytes (r+s+v)')
      
      console.log('\n📋 测试用的正确 paymasterAndData:')
      console.log(correctPaymasterAndData)
    } else {
      console.log('❌ 无法生成正确的 paymasterAndData')
      console.log('🔍 需要进一步调试签名生成逻辑')
    }
  }
}

// 运行调试
async function main() {
  const signatureDebugger = new SignatureDebugger()
  await signatureDebugger.debugSignature()
}

main().catch(console.error)
