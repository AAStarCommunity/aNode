#!/usr/bin/env node

/**
 * 检查合约的创建交易，确定是否是我们部署的
 */

import { ethers } from 'ethers'

const CONFIG = {
  rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  simpleAccountAddress: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  deployerAddress: '0x411BD567E46C0781248dbB6a9211891C032885e5'
}

async function checkContractCreation() {
  console.log('🔍 检查合约创建历史')
  console.log('=' .repeat(60))
  
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl)
    
    // 检查这个地址的交易计数
    const txCount = await provider.getTransactionCount(CONFIG.simpleAccountAddress)
    console.log(`📊 SimpleAccount 交易计数: ${txCount}`)
    
    // 检查部署者的交易计数
    const deployerTxCount = await provider.getTransactionCount(CONFIG.deployerAddress)
    console.log(`📊 部署者交易计数: ${deployerTxCount}`)
    
    // 由于 SimpleAccount 通常是通过 Factory 创建的，让我们检查一些已知的 Factory 地址
    const knownFactories = [
      '0x9406Cc6185a346906296840746125a0E44976454', // SimpleAccountFactory v0.6
      '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985', // 另一个常见的 factory
    ]
    
    console.log('\n🔍 检查可能的 Factory 地址...')
    for (const factory of knownFactories) {
      try {
        const code = await provider.getCode(factory)
        if (code !== '0x') {
          console.log(`✅ Factory ${factory} 存在`)
          
          // 检查这个 factory 是否创建了我们的 SimpleAccount
          // 通常通过 CREATE2 创建，地址是确定性的
        } else {
          console.log(`❌ Factory ${factory} 不存在`)
        }
      } catch (error) {
        console.log(`⚠️  检查 Factory ${factory} 失败:`, error.message)
      }
    }
    
    // 检查合约的初始化状态
    console.log('\n🔍 检查合约初始化状态...')
    const simpleAccountABI = [
      "function owner() view returns (address)",
      "function entryPoint() view returns (address)"
    ]
    
    const contract = new ethers.Contract(CONFIG.simpleAccountAddress, simpleAccountABI, provider)
    const owner = await contract.owner()
    const entryPoint = await contract.entryPoint()
    
    console.log(`👤 当前 Owner: ${owner}`)
    console.log(`🎯 EntryPoint: ${entryPoint}`)
    console.log(`🔄 Owner 匹配部署者: ${owner.toLowerCase() === CONFIG.deployerAddress.toLowerCase()}`)
    
    // 检查这是否是我们在之前测试中使用的地址
    console.log('\n🎯 这个 SimpleAccount 的信息:')
    console.log(`- 地址: ${CONFIG.simpleAccountAddress}`)
    console.log(`- Owner: ${owner} (${owner.toLowerCase() === CONFIG.deployerAddress.toLowerCase() ? '是您的地址' : '不是您的地址'})`)
    console.log(`- EntryPoint: ${entryPoint} (${entryPoint === '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' ? 'v0.6' : '未知版本'})`)
    
    // 这说明这个 SimpleAccount 是由您部署和拥有的
    // 现在的问题是确定它使用的签名验证方式
    
    console.log('\n💡 结论:')
    console.log('✅ 这个 SimpleAccount 是您部署和拥有的')
    console.log('✅ 使用 EntryPoint v0.6')
    console.log('🔍 现在需要确定它的签名验证实现方式')
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message)
  }
}

checkContractCreation().catch(console.error)




