#!/usr/bin/env node

/**
 * 使用 ethers 6 生成正确的 paymaster 签名
 * hash.toEthSignedMessageHash().recover(signature) 格式
 */

import { ethers } from 'ethers'

const CONFIG = {
  privateKey: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  paymasterAddress: '0xFA1Ca35Bb99fB0eD7901B41405260667aC8ce2b4',
  chainId: 11155111
}

async function generatePaymasterSignature() {
  console.log('🔐 使用 ethers 6 生成 paymaster 签名')
  console.log('=' .repeat(50))
  
  // 创建钱包
  const wallet = new ethers.Wallet(CONFIG.privateKey)
  console.log('👤 Signer Address:', wallet.address)
  
  // 模拟我们的 paymaster hash 参数
  const userOpHash = '0x8eab573e17fa1589186fe9498affacab9ab8e57eecdcb62a3212138e027dfa6e'
  const validUntil = 0
  const validAfter = 0
  const paymasterAddress = CONFIG.paymasterAddress
  const chainId = CONFIG.chainId
  
  console.log('\n📋 签名参数:')
  console.log('  UserOpHash:', userOpHash)
  console.log('  ValidUntil:', validUntil)
  console.log('  ValidAfter:', validAfter)
  console.log('  Paymaster:', paymasterAddress)
  console.log('  Chain ID:', chainId)
  
  // 创建要签名的 hash (匹配 Solidity 合约逻辑)
  const hashToSign = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'uint48', 'uint48', 'address', 'uint256'],
      [userOpHash, validUntil, validAfter, paymasterAddress, chainId]
    )
  )
  
  console.log('\n🏗️  Hash to Sign:', hashToSign)
  
  // 使用 ethers 进行 Ethereum 消息签名
  const signature = await wallet.signMessage(ethers.getBytes(hashToSign))
  
  console.log('\n✅ 生成的签名:', signature)
  console.log('   签名长度:', signature.length)
  
  // 验证签名
  const recoveredAddress = ethers.verifyMessage(ethers.getBytes(hashToSign), signature)
  console.log('\n🔍 签名验证:')
  console.log('   恢复的地址:', recoveredAddress)
  console.log('   是否匹配:', recoveredAddress.toLowerCase() === wallet.address.toLowerCase())
  
  // 测试 toEthSignedMessageHash 格式
  const messageHash = ethers.hashMessage(ethers.getBytes(hashToSign))
  console.log('   Message Hash:', messageHash)
  
  console.log('\n📋 用于 TypeScript paymaster 的签名:')
  console.log(`   Hash: ${hashToSign}`)
  console.log(`   Signature: ${signature}`)
  
  return { hashToSign, signature }
}

generatePaymasterSignature().catch(console.error)




