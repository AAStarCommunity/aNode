#!/usr/bin/env node

/**
 * 验证新部署的合约状态
 */

import { ethers } from 'ethers'

const CONFIG = {
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  paymasterAddress: '0x67003643FF70BBC2c1cDB396D4bA21037fD900E1',
  entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  deployerAddress: '0x411BD567E46C0781248dbB6a9211891C032885e5'
}

// aNodePaymaster ABI (简化版本)
const PAYMASTER_ABI = [
  "function entryPoint() view returns (address)",
  "function owner() view returns (address)",
  "function getDeposit() view returns (uint256)",
  "function validatePaymasterUserOp((address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes),bytes32,uint256) external returns (bytes,uint256)"
]

async function verifyContract() {
  console.log('🔍 验证合约部署状态')
  console.log('=' .repeat(60))
  console.log(`📍 Paymaster: ${CONFIG.paymasterAddress}`)
  console.log(`📍 EntryPoint: ${CONFIG.entryPointAddress}`)
  console.log(`📍 Deployer: ${CONFIG.deployerAddress}`)
  console.log()

  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl)
    const paymaster = new ethers.Contract(CONFIG.paymasterAddress, PAYMASTER_ABI, provider)

    // 检查合约是否存在
    const code = await provider.getCode(CONFIG.paymasterAddress)
    if (code === '0x') {
      console.error('❌ 合约不存在或未部署')
      return false
    }
    console.log('✅ 合约代码已部署')

    // 检查 EntryPoint
    try {
      const entryPoint = await paymaster.entryPoint()
      console.log(`📋 EntryPoint: ${entryPoint}`)
      if (entryPoint.toLowerCase() !== CONFIG.entryPointAddress.toLowerCase()) {
        console.error('❌ EntryPoint 地址不匹配')
        return false
      }
      console.log('✅ EntryPoint 地址正确')
    } catch (error) {
      console.error('❌ 无法读取 EntryPoint:', error.message)
    }

    // 检查 Owner
    try {
      const owner = await paymaster.owner()
      console.log(`👤 Owner: ${owner}`)
      if (owner.toLowerCase() !== CONFIG.deployerAddress.toLowerCase()) {
        console.error('❌ Owner 地址不匹配')
        return false
      }
      console.log('✅ Owner 地址正确')
    } catch (error) {
      console.error('❌ 无法读取 Owner:', error.message)
    }

    // 检查存款余额
    try {
      const deposit = await paymaster.getDeposit()
      console.log(`💰 存款余额: ${ethers.formatEther(deposit)} ETH`)
      if (deposit === 0n) {
        console.warn('⚠️  Paymaster 没有存款，需要存款才能支付 gas')
      } else {
        console.log('✅ Paymaster 有足够存款')
      }
    } catch (error) {
      console.error('❌ 无法读取存款余额:', error.message)
    }

    // 检查合约 ETH 余额
    const balance = await provider.getBalance(CONFIG.paymasterAddress)
    console.log(`💳 合约 ETH 余额: ${ethers.formatEther(balance)} ETH`)

    console.log('\n🎯 合约验证完成')
    return true

  } catch (error) {
    console.error('❌ 验证过程出错:', error.message)
    return false
  }
}

verifyContract().then(success => {
  if (success) {
    console.log('\n✅ 合约验证通过')
  } else {
    console.log('\n❌ 合约验证失败')
  }
  process.exit(success ? 0 : 1)
})




