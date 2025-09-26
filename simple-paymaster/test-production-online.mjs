#!/usr/bin/env node

/**
 * 生产环境完整测试 - 使用线上 Paymaster 服务
 * 测试 UserOperation 生成 → 线上 Paymaster 处理 → 签名 → Alchemy 提交
 */

import { ethers } from 'ethers';

// 配置 - 使用生产环境 Paymaster API
const CONFIG = {
  // 线上 Paymaster 服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev',

  // Alchemy API Key
  ALCHEMY_API_KEY: 'Bx4QRW1-vnwJUePSAAD7N',
  ALCHEMY_URL: 'https://eth-sepolia.g.alchemy.com/v2/',

  // 合约地址
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PNT_TOKEN_ADDRESS: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',

  // 测试账户
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',

  // RPC
  RPC_URL: 'https://ethereum-sepolia.publicnode.com',

  // 转账金额: 0.005 PNTs (测试用小金额)
  TRANSFER_AMOUNT: '0.005'
};

console.log('🚀 生产环境完整测试');
console.log('==============================');
console.log(`线上 Paymaster: ${CONFIG.PAYMASTER_URL}`);
console.log(`转账: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
console.log(`从: ${CONFIG.SIMPLE_ACCOUNT_A} (A)`);
console.log(`到: ${CONFIG.SIMPLE_ACCOUNT_B} (B)`);
console.log('');

class ProductionTester {
  constructor() {
    this.paymasterUrl = CONFIG.PAYMASTER_URL;
    this.alchemyUrl = CONFIG.ALCHEMY_URL + CONFIG.ALCHEMY_API_KEY;
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  /**
   * 测试线上 Paymaster 健康状态
   */
  async testPaymasterHealth() {
    console.log('1️⃣ 测试线上 Paymaster 健康状态...');

    try {
      const response = await fetch(`${this.paymasterUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 线上 Paymaster 健康');
      console.log(`   服务: ${data.service}`);
      console.log(`   版本: ${data.version}`);
      console.log(`   状态: ${data.status}`);
      console.log(`   时间戳: ${data.timestamp}`);
      console.log('');
      return true;
    } catch (error) {
      console.error('❌ 线上 Paymaster 健康检查失败:', error.message);
      return false;
    }
  }

  /**
   * 测试 Alchemy 连通性
   */
  async testAlchemyConnectivity() {
    console.log('2️⃣ 测试 Alchemy 连通性...');

    try {
      const response = await fetch(this.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: [],
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(`API Error: ${result.error.message}`);
      }

      const chainId = parseInt(result.result, 16);
      console.log(`✅ Alchemy 连接成功! Chain ID: ${chainId}`);

      // 获取最新区块
      const blockResponse = await fetch(this.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_blockNumber',
          params: [],
        }),
      });

      const blockResult = await blockResponse.json();
      const blockNumber = parseInt(blockResult.result, 16);
      console.log(`✅ 最新区块: ${blockNumber}`);
      console.log('');

      return true;
    } catch (error) {
      console.error('❌ Alchemy 连接失败:', error.message);
      return false;
    }
  }

  /**
   * 检查账户余额
   */
  async checkBalances() {
    console.log('3️⃣ 检查账户余额...');

    try {
      const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN_ADDRESS, [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
      ], this.provider);

      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();

      const balanceA = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_A);
      const balanceB = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_B);

      console.log(`✅ 代币信息: ${symbol} (decimals: ${decimals})`);
      console.log(`账户 A 余额: ${ethers.formatUnits(balanceA, decimals)} ${symbol}`);
      console.log(`账户 B 余额: ${ethers.formatUnits(balanceB, decimals)} ${symbol}`);
      console.log('');

      return { decimals, symbol, balanceA, balanceB };
    } catch (error) {
      console.error('❌ 检查余额失败:', error.message);
      return null;
    }
  }

  /**
   * 生成 UserOperation
   */
  async generateUserOperation(balanceInfo) {
    console.log('4️⃣ 生成 UserOperation...');

    if (!balanceInfo) return null;

    const { decimals } = balanceInfo;

    // 获取当前 nonce
    const accountContract = new ethers.Contract(CONFIG.SIMPLE_ACCOUNT_A, [
      'function getNonce() view returns (uint256)'
    ], this.provider);

    const nonce = await accountContract.getNonce();
    console.log(`当前 nonce: ${nonce}`);

    // 计算转账金额: 0.005 PNTs
    const transferAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, decimals);
    console.log(`转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs = ${transferAmount.toString()} wei`);

    // 生成 ERC20 transfer 调用
    const tokenInterface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)'
    ]);

    const transferData = tokenInterface.encodeFunctionData('transfer', [
      CONFIG.SIMPLE_ACCOUNT_B,
      transferAmount
    ]);

    // 生成 SimpleAccount execute 调用
    const accountInterface = new ethers.Interface([
      'function execute(address dest, uint256 value, bytes calldata func)'
    ]);

    const executeData = accountInterface.encodeFunctionData('execute', [
      CONFIG.PNT_TOKEN_ADDRESS, // target
      0, // value
      transferData // data
    ]);

    // 构造 UserOperation - 使用验证成功的参数
    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: `0x${nonce.toString(16)}`,
      initCode: '0x',
      callData: executeData,
      callGasLimit: '0x7530', // 30000
      verificationGasLimit: '0x17318', // 95000 - 优化的效率值
      preVerificationGas: '0xB61C', // 46620
      maxFeePerGas: '0x3b9aca00', // 1 gwei
      maxPriorityFeePerGas: '0x3b9aca00', // 1 gwei
      paymasterAndData: '0x', // 待填充
      signature: '0x'
    };

    console.log('✅ UserOperation 生成完成');
    console.log(`CallData 长度: ${executeData.length - 2} 字节`);
    console.log('');

    return userOp;
  }

  /**
   * 通过线上 Paymaster 服务处理
   */
  async processWithOnlinePaymaster(userOp) {
    console.log('5️⃣ 通过线上 Paymaster 服务处理...');

    try {
      const response = await fetch(`${this.paymasterUrl}/api/v1/paymaster/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userOperation: userOp,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Paymaster API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Paymaster processing failed: ${result.error?.message}`);
      }

      console.log('✅ 线上 Paymaster 处理成功');
      console.log(`支付模式: ${result.paymentMethod}`);
      console.log(`处理时间: ${result.processing.totalDuration}`);

      const paymasterAndData = result.userOperation.paymasterAndData;
      console.log(`PaymasterAndData 长度: ${paymasterAndData.length - 2} 字节`);

      if (paymasterAndData.length !== 66) { // 0x + 64 chars
        console.log('⚠️  PaymasterAndData 长度异常，期望 64 字节');
      }

      console.log('');
      return result.userOperation;

    } catch (error) {
      console.error('❌ 线上 Paymaster 处理失败:', error.message);
      console.log('');
      console.log('💡 可能的解决方案:');
      console.log('1. 检查线上服务是否正常运行');
      console.log('2. 验证网络连接');
      console.log('3. 检查 Paymaster 合约状态');
      console.log('');
      return null;
    }
  }

  /**
   * 签名 UserOperation
   */
  async signUserOperation(userOp) {
    console.log('6️⃣ 签名 UserOperation...');

    // 计算 UserOpHash
    const entryPointContract = new ethers.Contract(CONFIG.ENTRYPOINT_ADDRESS, [
      'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
    ], this.provider);

    const userOpTuple = [
      userOp.sender,
      userOp.nonce,
      userOp.initCode,
      userOp.callData,
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      userOp.paymasterAndData,
      userOp.signature
    ];

    const userOpHash = await entryPointContract.getUserOpHash(userOpTuple);
    console.log(`UserOpHash: ${userOpHash}`);

    // 使用 signMessage (v0.6 SimpleAccount 兼容)
    const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    userOp.signature = signature;

    console.log('✅ UserOperation 签名完成');
    console.log(`签名长度: ${signature.length - 2} 字符`);
    console.log('');

    return userOp;
  }

  /**
   * 提交到 Alchemy Bundler
   */
  async submitToAlchemy(userOp) {
    console.log('7️⃣ 提交到 Alchemy Bundler...');

    console.log('最终 UserOperation 摘要:');
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.SIMPLE_ACCOUNT_B}`);
    console.log(`- 转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce}`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData.substring(0, 42)}...`);
    console.log(`- 签名: ${userOp.signature.substring(0, 20)}...`);
    console.log('');

    try {
      const response = await fetch(this.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOp, CONFIG.ENTRYPOINT_ADDRESS],
        }),
      });

      const result = await response.json();

      if (result.error) {
        console.log('❌ 提交失败:');
        console.log(`Error Code: ${result.error.code}`);
        console.log(`Error Message: ${result.error.message}`);

        // 提供调试建议
        if (result.error.message.includes('AA33')) {
          console.log('');
          console.log('🔍 AA33 错误分析:');
          console.log('- AA33 = paymaster validation failed');
          console.log('- 检查线上 Paymaster 合约状态');
        } else if (result.error.message.includes('AA23')) {
          console.log('');
          console.log('🔍 AA23 错误分析:');
          console.log('- AA23 = signature verification failed');
          console.log('- 检查签名和 nonce');
        } else if (result.error.message.includes('gas')) {
          console.log('');
          console.log('🔍 Gas 错误分析:');
          console.log('- 检查 gas 参数设置');
        }

        return { success: false, error: result.error };
      } else {
        console.log('🎉 提交成功!');
        console.log(`UserOpHash: ${result.result}`);
        console.log('');
        console.log('✅ SUCCESS: 生产环境 ERC20 转账 UserOperation 已提交!');
        console.log('==============================');
        console.log('📋 交易摘要:');
        console.log(`   从: ${CONFIG.SIMPLE_ACCOUNT_A}`);
        console.log(`   到: ${CONFIG.SIMPLE_ACCOUNT_B}`);
        console.log(`   金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
        console.log(`   Paymaster: 线上服务处理`);
        console.log(`   Hash: ${result.result}`);
        console.log('');
        console.log('⏳ 交易正在处理中，请等待确认...');
        console.log('');
        console.log('🎯 生产环境验证成功!');
        console.log('线上 Paymaster 服务完全正常工作!');

        return { success: true, userOpHash: result.result };
      }
    } catch (error) {
      console.error('❌ 网络错误:', error.message);
      return { success: false, error: { message: error.message } };
    }
  }

  /**
   * 运行完整生产环境测试
   */
  async run() {
    try {
      // 1. 测试线上 Paymaster 健康状态
      const paymasterHealthy = await this.testPaymasterHealth();
      if (!paymasterHealthy) {
        throw new Error('线上 Paymaster 服务不可用');
      }

      // 2. 测试 Alchemy 连通性
      const alchemyConnected = await this.testAlchemyConnectivity();
      if (!alchemyConnected) {
        throw new Error('无法连接到 Alchemy API');
      }

      // 3. 检查余额
      const balanceInfo = await this.checkBalances();
      if (!balanceInfo) {
        throw new Error('无法获取账户余额');
      }

      // 验证账户 A 有足够余额
      const requiredAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, balanceInfo.decimals);
      if (balanceInfo.balanceA < requiredAmount) {
        throw new Error(`账户 A 余额不足。需要: ${CONFIG.TRANSFER_AMOUNT} PNTs, 当前: ${ethers.formatUnits(balanceInfo.balanceA, balanceInfo.decimals)} PNTs`);
      }

      console.log(`✅ 账户 A 有足够余额进行 ${CONFIG.TRANSFER_AMOUNT} PNTs 转账`);
      console.log('');

      // 4. 生成 UserOperation
      const userOp = await this.generateUserOperation(balanceInfo);
      if (!userOp) {
        throw new Error('无法生成 UserOperation');
      }

      // 5. 通过线上 Paymaster 处理
      const processedUserOp = await this.processWithOnlinePaymaster(userOp);
      if (!processedUserOp) {
        throw new Error('线上 Paymaster 处理失败');
      }

      // 6. 签名
      const signedUserOp = await this.signUserOperation(processedUserOp);

      // 7. 提交到 Alchemy
      const result = await this.submitToAlchemy(signedUserOp);

      if (result.success) {
        console.log('');
        console.log('🎊 生产环境完整测试成功完成!');
        console.log('====================================');
        console.log('');
        console.log('📊 技术验证:');
        console.log('✅ 线上 Paymaster 健康检查通过');
        console.log('✅ Alchemy API 连接正常');
        console.log('✅ ERC20 代币余额充足');
        console.log('✅ UserOperation 生成正确');
        console.log('✅ 线上 Paymaster 处理成功');
        console.log('✅ 签名验证通过');
        console.log('✅ Bundler 接受并处理');
        console.log('');
        console.log('🚀 aNodePaymaster 生产环境完全验证成功!');
        console.log(`   交易 Hash: ${result.userOpHash}`);
        console.log('');
        console.log('🎯 结论: 线上 Paymaster 服务运行正常，可以为用户提供无 gas 交易服务!');
      } else {
        console.log('');
        console.log('❌ 生产环境测试失败，需要进一步调试');
        console.log('请检查错误信息并参考 BUG_ANALYSIS_AND_SOLUTIONS.md');
      }

      return result;

    } catch (error) {
      console.error('❌ 生产环境测试过程中发生错误:', error.message);
      console.log('');
      console.log('💡 故障排除建议:');
      console.log('1. 检查线上 Paymaster 服务状态');
      console.log('2. 验证 Alchemy API 密钥');
      console.log('3. 确认账户余额充足');
      console.log('4. 检查网络连接');
      console.log('');
      return { success: false, error: { message: error.message } };
    }
  }
}

// 运行生产环境测试
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const tester = new ProductionTester();
  tester.run().catch(console.error);
}

export { ProductionTester };
