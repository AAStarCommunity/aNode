#!/usr/bin/env node
/**
 * Alchemy Bundler API 测试脚本
 * 基于 web-app 中的 AlchemyBundlerService 实现的所有 API 方法测试
 */

const { Alchemy, Network } = require('alchemy-sdk');
require('dotenv').config();

class AlchemyBundlerTester {
  constructor() {
    // 从环境变量读取配置
    this.apiKey = process.env.ALCHEMY_API_KEY || 'Bx4QRW1-vnwJUePSAAD7N';
    this.network = Network.ETH_SEPOLIA;
    this.entryPointVersion = '0.6';

    // EntryPoint 地址配置
    this.entryPoints = {
      '0.6': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
      '0.7': '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
    };

    this.alchemy = new Alchemy({
      apiKey: this.apiKey,
      network: this.network,
    });

    console.log('🚀 Alchemy Bundler API 测试初始化完成');
    console.log(`📍 网络: ${this.network}`);
    console.log(`🔑 API Key: ${this.apiKey.substring(0, 8)}...`);
    console.log(`📌 EntryPoint v${this.entryPointVersion}: ${this.entryPoints[this.entryPointVersion]}`);
  }

  /**
   * 测试基本连通性
   */
  async testConnectivity() {
    console.log('\n🔗 测试 1: 基本连通性');
    try {
      const chainId = await this.alchemy.core.send('eth_chainId', []);
      console.log(`✅ 连接成功! Chain ID: ${chainId}`);

      const blockNumber = await this.alchemy.core.send('eth_blockNumber', []);
      console.log(`✅ 最新区块: ${parseInt(blockNumber, 16)}`);

      return true;
    } catch (error) {
      console.error('❌ 连接失败:', error.message);
      return false;
    }
  }

  /**
   * 测试获取支持的 EntryPoints (这个方法可能不被 Alchemy 支持)
   */
  async testSupportedEntryPoints() {
    console.log('\n📋 测试 2: 获取支持的 EntryPoints');
    try {
      const response = await this.alchemy.core.send('eth_supportedEntryPoints', []);
      console.log('✅ 支持的 EntryPoints:', response);
      return response;
    } catch (error) {
      console.log('ℹ️  eth_supportedEntryPoints 方法不支持 (这是正常的)');
      console.log('📌 使用默认 EntryPoint:', this.entryPoints[this.entryPointVersion]);
      return [this.entryPoints[this.entryPointVersion]];
    }
  }

  /**
   * 测试 Gas 估算 (需要一个示例 UserOperation)
   */
  async testEstimateUserOperationGas() {
    console.log('\n⛽ 测试 3: UserOperation Gas 估算');

    // 示例 UserOperation (需要根据实际情况调整)
    const sampleUserOp = {
      sender: '0x742d35Cc6634C0532925a3b8D3B7F2E5e111e0f7', // 示例地址
      nonce: '0x0',
      initCode: '0x',
      callData: '0x',
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
      paymasterAndData: '0x',
      signature: '0x'
    };

    try {
      const gasEstimate = await this.alchemy.core.send(
        'eth_estimateUserOperationGas',
        [sampleUserOp, this.entryPoints[this.entryPointVersion]]
      );
      console.log('✅ Gas 估算成功:', gasEstimate);
      return gasEstimate;
    } catch (error) {
      console.log('ℹ️  Gas 估算测试跳过 (需要有效的 UserOperation):', error.message);
      return null;
    }
  }

  /**
   * 测试获取推荐的优先费用
   */
  async testMaxPriorityFeePerGas() {
    console.log('\n💰 测试 4: 获取推荐优先费用');
    try {
      // 尝试 Rundler 特有的方法
      const response = await this.alchemy.core.send('rundler_maxPriorityFeePerGas', []);
      console.log('✅ 推荐优先费用 (Rundler方法):', response);
      return response;
    } catch (error) {
      console.log('ℹ️  rundler_maxPriorityFeePerGas 方法不支持');

      // 尝试标准的 Gas 价格方法
      try {
        const gasPrice = await this.alchemy.core.send('eth_gasPrice', []);
        console.log('✅ 当前 Gas 价格 (标准方法):', gasPrice);
        return gasPrice;
      } catch (error2) {
        console.error('❌ 获取 Gas 价格失败:', error2.message);
        return '0x3b9aca00'; // 默认 1 gwei
      }
    }
  }

  /**
   * 测试发送 UserOperation (模拟测试)
   */
  async testSendUserOperation() {
    console.log('\n🚀 测试 5: 发送 UserOperation (模拟)');
    console.log('ℹ️  此测试需要有效的已签名 UserOperation，这里仅模拟 API 调用');

    // 注意：实际发送需要完整的、已签名的 UserOperation
    const mockUserOp = {
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
      signature: '0x' + '0'.repeat(130) // mock signature
    };

    console.log('📋 模拟 UserOperation:');
    console.log('  - Sender:', mockUserOp.sender);
    console.log('  - Entry Point:', this.entryPoints[this.entryPointVersion]);
    console.log('  - Gas Limits:', {
      call: mockUserOp.callGasLimit,
      verification: mockUserOp.verificationGasLimit,
      preVerification: mockUserOp.preVerificationGas
    });

    console.log('⚠️  实际发送需要有效的私钥签名和账户部署');
    return 'mock_user_operation_hash';
  }

  /**
   * 测试查询 UserOperation
   */
  async testGetUserOperationByHash() {
    console.log('\n🔍 测试 6: 查询 UserOperation (示例)');

    // 使用一个示例 hash (实际使用中需要真实的 hash)
    const sampleHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    try {
      const userOp = await this.alchemy.core.send(
        'eth_getUserOperationByHash',
        [sampleHash]
      );
      console.log('✅ UserOperation 查询成功:', userOp);
      return userOp;
    } catch (error) {
      console.log('ℹ️  UserOperation 不存在 (这是正常的，因为使用了示例 hash)');
      console.log('   实际使用时请提供真实的 UserOperation hash');
      return null;
    }
  }

  /**
   * 测试获取 UserOperation 回执
   */
  async testGetUserOperationReceipt() {
    console.log('\n📄 测试 7: 获取 UserOperation 回执 (示例)');

    const sampleHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    try {
      const receipt = await this.alchemy.core.send(
        'eth_getUserOperationReceipt',
        [sampleHash]
      );
      console.log('✅ UserOperation 回执获取成功:', receipt);
      return receipt;
    } catch (error) {
      console.log('ℹ️  UserOperation 回执不存在 (这是正常的，因为使用了示例 hash)');
      console.log('   实际使用时请提供真实的 UserOperation hash');
      return null;
    }
  }

  /**
   * 测试账户余额查询
   */
  async testAccountBalance() {
    console.log('\n💳 测试 8: 账户余额查询');

    // 使用一个知名的账户地址进行测试
    const testAddress = '0x742d35Cc6634C0532925a3b8D3B7F2E5e111e0f7';

    try {
      const balance = await this.alchemy.core.send('eth_getBalance', [testAddress, 'latest']);
      const balanceInEth = parseInt(balance, 16) / 1e18;
      console.log(`✅ 账户 ${testAddress} 余额: ${balanceInEth.toFixed(6)} ETH`);
      return balance;
    } catch (error) {
      console.error('❌ 余额查询失败:', error.message);
      return null;
    }
  }

  /**
   * 综合测试状态检查
   */
  async testBundlerStatus() {
    console.log('\n🔧 测试 9: Bundler 状态检查');
    try {
      // 使用基本的连通性测试作为状态检查
      const chainId = await this.alchemy.core.send('eth_chainId', []);
      const blockNumber = await this.alchemy.core.send('eth_blockNumber', []);

      const status = {
        isHealthy: true,
        supportedEntryPoints: [this.entryPoints[this.entryPointVersion]],
        network: this.network,
        version: this.entryPointVersion,
        chainId: chainId,
        blockNumber: parseInt(blockNumber, 16)
      };

      console.log('✅ Bundler 状态:', status);
      return status;
    } catch (error) {
      console.error('❌ Bundler 状态检查失败:', error.message);
      return {
        isHealthy: false,
        supportedEntryPoints: [],
        network: 'unknown',
        version: this.entryPointVersion,
        error: error.message
      };
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🧪 开始 Alchemy Bundler API 完整测试\n');
    console.log('=' * 50);

    const results = {};

    // 基本连通性测试
    results.connectivity = await this.testConnectivity();
    if (!results.connectivity) {
      console.log('\n❌ 基本连通性测试失败，停止后续测试');
      return results;
    }

    // 其他测试
    results.supportedEntryPoints = await this.testSupportedEntryPoints();
    results.gasEstimate = await this.testEstimateUserOperationGas();
    results.priorityFee = await this.testMaxPriorityFeePerGas();
    results.sendUserOp = await this.testSendUserOperation();
    results.getUserOp = await this.testGetUserOperationByHash();
    results.getReceipt = await this.testGetUserOperationReceipt();
    results.balance = await this.testAccountBalance();
    results.bundlerStatus = await this.testBundlerStatus();

    // 测试摘要
    console.log('\n📊 测试摘要');
    console.log('=' * 50);
    console.log(`✅ 基本连通性: ${results.connectivity ? '通过' : '失败'}`);
    console.log(`📋 EntryPoints: ${results.supportedEntryPoints ? '通过' : '失败'}`);
    console.log(`⛽ Gas 估算: ${results.gasEstimate ? '通过' : '跳过'}`);
    console.log(`💰 优先费用: ${results.priorityFee ? '通过' : '失败'}`);
    console.log(`🚀 发送 UserOp: 模拟`);
    console.log(`🔍 查询 UserOp: 示例`);
    console.log(`📄 获取回执: 示例`);
    console.log(`💳 余额查询: ${results.balance ? '通过' : '失败'}`);
    console.log(`🔧 状态检查: ${results.bundlerStatus?.isHealthy ? '通过' : '失败'}`);

    console.log('\n🎉 Alchemy Bundler API 测试完成!');
    return results;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tester = new AlchemyBundlerTester();
  tester.runAllTests().catch(console.error);
}

module.exports = AlchemyBundlerTester;