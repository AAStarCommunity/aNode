#!/usr/bin/env node

/**
 * 测试不同的签名方法，看哪种能通过验证
 */

import { ethers } from 'ethers'

const CONFIG = {
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  simpleAccountAddress: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  ownerPrivateKey: '0x8e1ed0f6b7dd7e0b8a95a9e6d5c7e4b3e3f8f2e9b3a7e4c1f2d5b8e9f3c7a6d2',
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  chainId: 11155111
}

// 测试用的 UserOperation (简化版)
const TEST_USER_OP = {
  "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  "nonce": "0x11",
  "initCode": "0x",
  "callData": "0xb61d27f60000000000000000000000003e7b771d4541ec85c8137e950598ac97553a337a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed47685400000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x11170",
  "verificationGasLimit": "0x11170",
  "preVerificationGas": "0xB61C",
  "maxFeePerGas": "0x3b9aca00",
  "maxPriorityFeePerGas": "0x3b9aca00",
  "paymasterAndData": "0x67003643FF70BBC2c1cDB396D4bA21037fD900E1000000000000000000000000",
  "signature": "0x"
}

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

async function testSignatureMethods() {
  console.log('🔍 测试不同的签名方法')
  console.log('=' .repeat(60))
  
  const wallet = new ethers.Wallet(CONFIG.ownerPrivateKey)
  const userOpHash = calculateUserOpHash(TEST_USER_OP)
  
  console.log(`📋 UserOpHash: ${userOpHash}`)
  console.log(`👤 Signer Address: ${wallet.address}`)
  console.log(`🎯 Expected Owner: 0x411BD567E46C0781248dbB6a9211891C032885e5`)
  
  // 注意：这里有个问题！我们的私钥对应的地址是 0xb33E9f3715d53B7A6a3bd72fDcEE73D3430E1094
  // 但 SimpleAccount 的 owner 是 0x411BD567E46C0781248dbB6a9211891C032885e5
  // 这说明我们使用的私钥不正确！
  
  if (wallet.address.toLowerCase() !== '0x411BD567E46C0781248dbB6a9211891C032885e5'.toLowerCase()) {
    console.log('❌ 严重错误：私钥不匹配！')
    console.log(`   当前私钥对应地址: ${wallet.address}`)
    console.log(`   SimpleAccount owner: 0x411BD567E46C0781248dbB6a9211891C032885e5`)
    console.log('   这就是签名验证失败的根本原因！')
    return
  }
  
  console.log('\n🔍 测试方法 1: 直接签名 userOpHash')
  try {
    const signature1 = await wallet.signMessage(ethers.getBytes(userOpHash))
    console.log(`🔐 方法1签名: ${signature1}`)
    
    // 验证签名
    const recovered1 = ethers.recoverAddress(ethers.hashMessage(ethers.getBytes(userOpHash)), signature1)
    console.log(`🔍 恢复地址: ${recovered1}`)
    console.log(`✅ 匹配: ${recovered1.toLowerCase() === wallet.address.toLowerCase()}`)
  } catch (error) {
    console.error('❌ 方法1失败:', error.message)
  }
  
  console.log('\n🔍 测试方法 2: 直接签名 hash (不使用 signMessage)')
  try {
    const signature2 = await wallet.signMessage(userOpHash)
    console.log(`🔐 方法2签名: ${signature2}`)
  } catch (error) {
    console.error('❌ 方法2失败:', error.message)
  }
}

testSignatureMethods().catch(console.error)




