#!/usr/bin/env node

/**
 * 调试 UserOpHash 计算
 */

import { ethers } from 'ethers'

const CONFIG = {
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  chainId: 11155111
}

// 新生成的 UserOperation (不包含签名)
const USER_OP_WITHOUT_SIG = {
  "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  "nonce": "0x11",
  "initCode": "0x",
  "callData": "0xb61d27f60000000000000000000000003e7b771d4541ec85c8137e950598ac97553a337a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed47685400000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x5208",
  "verificationGasLimit": "0x186a0",
  "preVerificationGas": "0x5208",
  "maxFeePerGas": "0x3b9aca00",
  "maxPriorityFeePerGas": "0x3b9aca00",
  "paymasterAndData": "0x67003643FF70BBC2c1cDB396D4bA21037fD900E1000000000000000000000000",
  "signature": "0x"
}

const PROVIDED_SIGNATURE = "0xe1452a4c3d30a59a353b626fc10136d051129e5e5e79012fb94ec3fa31c09edc06cae845f14d223ec9294041415e7aad92cb2e12753ce5cf48cbae0bed4b73561b"
const OWNER_PRIVATE_KEY = "0x8e1ed0f6b7dd7e0b8a95a9e6d5c7e4b3e3f8f2e9b3a7e4c1f2d5b8e9f3c7a6d2"

function calculateUserOpHash(userOp) {
  // ERC-4337 v0.6 UserOpHash calculation
  const types = [
    'address', // sender
    'uint256', // nonce
    'bytes32', // initCode hash
    'bytes32', // callData hash
    'uint256', // callGasLimit
    'uint256', // verificationGasLimit
    'uint256', // preVerificationGas
    'uint256', // maxFeePerGas
    'uint256', // maxPriorityFeePerGas
    'bytes32', // paymasterAndData hash
  ]
  
  const values = [
    userOp.sender,
    userOp.nonce,
    ethers.keccak256(userOp.initCode),
    ethers.keccak256(userOp.callData),
    userOp.callGasLimit,
    userOp.verificationGasLimit,
    userOp.preVerificationGas,
    userOp.maxFeePerGas,
    userOp.maxPriorityFeePerGas,
    ethers.keccak256(userOp.paymasterAndData),
  ]
  
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(types, values)
  const userOpHash = ethers.keccak256(encoded)
  
  // 添加 EntryPoint 和 chainId
  const finalHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'uint256'],
      [userOpHash, CONFIG.entryPoint, CONFIG.chainId]
    )
  )
  
  return finalHash
}

async function debugUserOpHash() {
  console.log('🔍 调试 UserOpHash 计算')
  console.log('=' .repeat(60))
  
  // 计算 UserOpHash
  const userOpHash = calculateUserOpHash(USER_OP_WITHOUT_SIG)
  console.log(`📋 计算的 UserOpHash: ${userOpHash}`)
  
  // 验证签名
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY)
  console.log(`👤 Owner Address: ${wallet.address}`)
  
  try {
    const messageHash = ethers.hashMessage(ethers.getBytes(userOpHash))
    const recoveredAddress = ethers.recoverAddress(messageHash, PROVIDED_SIGNATURE)
    console.log(`🔐 签名恢复地址: ${recoveredAddress}`)
    console.log(`✅ 签名匹配: ${recoveredAddress.toLowerCase() === wallet.address.toLowerCase()}`)
    
    // 重新生成签名进行对比
    const correctSignature = await wallet.signMessage(ethers.getBytes(userOpHash))
    console.log(`🔑 正确的签名: ${correctSignature}`)
    console.log(`🔄 签名一致: ${correctSignature.toLowerCase() === PROVIDED_SIGNATURE.toLowerCase()}`)
    
  } catch (error) {
    console.error('❌ 签名验证失败:', error.message)
  }
  
  // 分析 paymasterAndData
  console.log('\n📋 PaymasterAndData 分析:')
  console.log(`  完整数据: ${USER_OP_WITHOUT_SIG.paymasterAndData}`)
  console.log(`  长度: ${USER_OP_WITHOUT_SIG.paymasterAndData.length} 字符 (${(USER_OP_WITHOUT_SIG.paymasterAndData.length - 2) / 2} bytes)`)
  console.log(`  Paymaster 地址: ${USER_OP_WITHOUT_SIG.paymasterAndData.slice(0, 42)}`)
  console.log(`  ValidUntil: ${USER_OP_WITHOUT_SIG.paymasterAndData.slice(42, 54)}`)
  console.log(`  ValidAfter: ${USER_OP_WITHOUT_SIG.paymasterAndData.slice(54, 66)}`)
  
  // 检查是否有额外数据
  if (USER_OP_WITHOUT_SIG.paymasterAndData.length > 66) {
    console.log(`  额外数据: ${USER_OP_WITHOUT_SIG.paymasterAndData.slice(66)}`)
  } else {
    console.log(`  ✅ 没有额外的签名数据 (符合简化版本)`)
  }
}

debugUserOpHash().catch(console.error)




