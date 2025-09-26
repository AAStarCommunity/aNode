#!/usr/bin/env node

/**
 * 生成最终的 UserOperation，使用正确的私钥和 gas 限制
 */

import { ethers } from 'ethers'

const CONFIG = {
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  simpleAccountAddress: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  ownerPrivateKey: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  chainId: 11155111,
  paymasterAddress: '0x67003643FF70BBC2c1cDB396D4bA21037fD900E1'
}

// 基础 UserOperation，使用更高的 gas 限制
const BASE_USER_OPERATION = {
  "sender": "0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6",
  "nonce": "0x11",
  "initCode": "0x",
  "callData": "0xb61d27f60000000000000000000000003e7b771d4541ec85c8137e950598ac97553a337a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed47685400000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000",
  "callGasLimit": "0x11170", // 70000 gas
  "verificationGasLimit": "0x11170", // 70000 gas
  "preVerificationGas": "0xB61C", // 46620 gas
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

async function generateFinalUserOp() {
  console.log('🔧 生成最终 UserOperation')
  console.log('=' .repeat(60))
  
  const wallet = new ethers.Wallet(CONFIG.ownerPrivateKey)
  console.log(`👤 Signer Address: ${wallet.address}`)
  console.log(`🎯 Expected Owner: 0x411BD567E46C0781248dbB6a9211891C032885e5`)
  console.log(`✅ 地址匹配: ${wallet.address.toLowerCase() === '0x411BD567E46C0781248dbB6a9211891C032885e5'.toLowerCase()}`)
  
  // 计算 UserOpHash
  const userOpHash = calculateUserOpHash(BASE_USER_OPERATION)
  console.log(`📋 UserOpHash: ${userOpHash}`)
  
  // 签名（使用与 web-app 相同的方法）
  const hashBytes = ethers.getBytes(userOpHash)
  const signature = await wallet.signMessage(hashBytes)
  
  console.log(`🔐 签名: ${signature}`)
  console.log(`📏 签名长度: ${signature.length}`)
  
  // 构建最终 UserOperation
  const finalUserOp = {
    ...BASE_USER_OPERATION,
    signature: signature
  }
  
  console.log('\n📋 最终 UserOperation:')
  console.log('========================')
  console.log(JSON.stringify(finalUserOp, null, 2))
  
  console.log('\n🎯 验证信息:')
  console.log(`✅ Sender: ${finalUserOp.sender}`)
  console.log(`✅ CallGasLimit: ${parseInt(finalUserOp.callGasLimit, 16)} gas`)
  console.log(`✅ VerificationGasLimit: ${parseInt(finalUserOp.verificationGasLimit, 16)} gas`) 
  console.log(`✅ PreVerificationGas: ${parseInt(finalUserOp.preVerificationGas, 16)} gas`)
  console.log(`✅ PaymasterAndData: ${finalUserOp.paymasterAndData.length} chars`)
  console.log(`✅ Signature: ${finalUserOp.signature.length} chars`)
  
  return finalUserOp
}

generateFinalUserOp().catch(console.error)



