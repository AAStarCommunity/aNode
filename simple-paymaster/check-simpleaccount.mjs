#!/usr/bin/env node

/**
 * 检查 SimpleAccount 的部署者和合约代码
 */

import { ethers } from 'ethers'

const CONFIG = {
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  simpleAccountAddress: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6'
}

async function checkSimpleAccount() {
  console.log('🔍 检查 SimpleAccount 合约')
  console.log('=' .repeat(60))
  console.log(`📍 SimpleAccount: ${CONFIG.simpleAccountAddress}`)
  console.log()

  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl)

    // 1. 检查合约代码
    const code = await provider.getCode(CONFIG.simpleAccountAddress)
    if (code === '0x') {
      console.log('❌ 这不是一个合约地址，是 EOA 地址')
      return
    }
    console.log(`✅ 合约代码存在，长度: ${code.length} 字符`)

    // 2. 获取合约创建交易
    console.log('\n🔍 查找合约创建信息...')
    
    // 由于这是一个代理合约，我们需要检查它的实现
    // 通常 SimpleAccount 是通过 factory 创建的
    
    // 尝试获取一些交易历史
    const latestBlock = await provider.getBlockNumber()
    console.log(`📦 当前区块高度: ${latestBlock}`)
    
    // 检查合约的一些基本信息
    try {
      // 尝试调用一些标准的 SimpleAccount 方法
      const simpleAccountABI = [
        "function owner() view returns (address)",
        "function entryPoint() view returns (address)",
        "function getNonce() view returns (uint256)"
      ]
      
      const contract = new ethers.Contract(CONFIG.simpleAccountAddress, simpleAccountABI, provider)
      
      try {
        const owner = await contract.owner()
        console.log(`👤 Owner: ${owner}`)
      } catch (error) {
        console.log('⚠️  无法获取 owner (可能不是标准 SimpleAccount)')
      }
      
      try {
        const entryPoint = await contract.entryPoint()
        console.log(`🎯 EntryPoint: ${entryPoint}`)
      } catch (error) {
        console.log('⚠️  无法获取 entryPoint')
      }
      
      try {
        const nonce = await contract.getNonce()
        console.log(`🔢 Nonce: ${nonce}`)
      } catch (error) {
        console.log('⚠️  无法获取 nonce')
      }
      
    } catch (error) {
      console.log('⚠️  无法调用合约方法:', error.message)
    }

    // 3. 检查合约的存储槽来确定版本
    console.log('\n🔍 检查合约存储...')
    
    // SimpleAccount 的 owner 通常存储在 slot 0
    const slot0 = await provider.getStorage(CONFIG.simpleAccountAddress, 0)
    console.log(`📊 Storage Slot 0 (owner): ${slot0}`)
    
    // EntryPoint 地址通常是 immutable，存储在代码中
    // 我们可以通过检查代码来确定版本
    
    // 4. 分析合约代码特征
    console.log('\n🔍 分析合约代码特征...')
    if (code.includes('5FF137D4b0FDCD49DcA30c7CF57E578a026d2789')) {
      console.log('✅ 发现 EntryPoint v0.6 地址在代码中')
    }
    if (code.includes('0000000071727de22e5e9d8baf0edac6f37da032')) {
      console.log('✅ 发现 EntryPoint v0.7 地址在代码中')
    }
    
    // 5. 检查最近的交易
    console.log('\n🔍 检查最近的交易...')
    try {
      // 获取最近几个区块的交易
      for (let i = 0; i < 5; i++) {
        const block = await provider.getBlock(latestBlock - i, true)
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (tx.to?.toLowerCase() === CONFIG.simpleAccountAddress.toLowerCase()) {
              console.log(`📋 找到交易: ${tx.hash} 在区块 ${block.number}`)
              console.log(`   From: ${tx.from}`)
              console.log(`   Data: ${tx.data.slice(0, 20)}...`)
              break
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️  无法获取交易历史:', error.message)
    }

  } catch (error) {
    console.error('❌ 检查过程出错:', error.message)
  }
}

checkSimpleAccount().catch(console.error)




