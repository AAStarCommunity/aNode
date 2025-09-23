#!/usr/bin/env node
/**
 * Alchemy API Key 测试脚本
 * 检查 API key 的类型和限制
 */

const { Alchemy, Network } = require('alchemy-sdk');
require('dotenv').config();

async function testAlchemyApiKey() {
  const apiKey = process.env.ALCHEMY_API_KEY || 'Bx4QRW1-vnwJUePSAAD7N';

  console.log('🔑 测试 Alchemy API Key:', apiKey.substring(0, 8) + '...');

  const alchemy = new Alchemy({
    apiKey,
    network: Network.ETH_SEPOLIA,
  });

  try {
    // 1. 基本连接测试
    console.log('\n📋 测试 1: 基本连接');
    const chainId = await alchemy.core.send('eth_chainId', []);
    console.log('✅ Chain ID:', chainId);

    // 2. 账户余额测试
    console.log('\n💰 测试 2: 账户余额查询');
    const balance = await alchemy.core.getBalance('0x742d35Cc6634C0532925a3b8D3B7F2E5e111e0f7');
    console.log('✅ 余额查询成功:', balance.toString());

    // 3. UserOperation 方法测试
    console.log('\n🚀 测试 3: UserOperation 方法支持');

    // 3a. 测试 eth_supportedEntryPoints
    try {
      const entryPoints = await alchemy.core.send('eth_supportedEntryPoints', []);
      console.log('✅ eth_supportedEntryPoints:', entryPoints);
    } catch (error) {
      console.log('❌ eth_supportedEntryPoints 不支持:', error.message);
    }

    // 3b. 测试 rundler_maxPriorityFeePerGas
    try {
      const maxFee = await alchemy.core.send('rundler_maxPriorityFeePerGas', []);
      console.log('✅ rundler_maxPriorityFeePerGas:', maxFee);
    } catch (error) {
      console.log('❌ rundler_maxPriorityFeePerGas 不支持:', error.message);
    }

    // 3c. 测试 eth_estimateUserOperationGas
    console.log('\n⛽ 测试 4: eth_estimateUserOperationGas');
    const testUserOp = {
      sender: '0x742d35Cc6634C0532925a3b8D3B7F2E5e111e0f7',
      nonce: '0x0',
      initCode: '0x',
      callData: '0x',
      callGasLimit: '0x5208',
      verificationGasLimit: '0x5208',
      preVerificationGas: '0x5208',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      paymasterAndData: '0x',
      signature: '0x'
    };

    try {
      const gasEstimate = await alchemy.core.send('eth_estimateUserOperationGas', [
        testUserOp,
        '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' // EntryPoint v0.6
      ]);
      console.log('✅ Gas 估算成功 (v0.6):', gasEstimate);
    } catch (error) {
      console.log('❌ Gas 估算失败 (v0.6):', error.message);
      if (error.message.includes('AA20')) {
        console.log('ℹ️  这是正常的，需要已部署的账户');
      }
    }

    try {
      const gasEstimate = await alchemy.core.send('eth_estimateUserOperationGas', [
        testUserOp,
        '0x0000000071727De22E5E9d8BAf0edAc6f37da032' // EntryPoint v0.7
      ]);
      console.log('✅ Gas 估算成功 (v0.7):', gasEstimate);
    } catch (error) {
      console.log('❌ Gas 估算失败 (v0.7):', error.message);
    }

    // 4. 检查 API key 类型
    console.log('\n🔍 测试 5: API Key 信息');
    try {
      // 尝试获取更多信息来判断 API key 类型
      const latestBlock = await alchemy.core.getBlockNumber();
      console.log('✅ 最新区块:', latestBlock);
      console.log('🎯 API Key 状态: 正常工作');

      // 检查是否有 rate limit 头信息
      console.log('ℹ️  建议: 检查 Alchemy Dashboard 确认 API key 类型');
    } catch (error) {
      console.log('❌ API Key 问题:', error.message);
    }

    console.log('\n📊 总结:');
    console.log('- API Key 基本功能正常');
    console.log('- 需要检查是否为付费账户以支持完整的 UserOperation 功能');
    console.log('- 建议在 Alchemy Dashboard 中查看 API key 限制');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testAlchemyApiKey().catch(console.error);
}

module.exports = { testAlchemyApiKey };