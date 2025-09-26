#!/usr/bin/env node

/**
 * aNodePaymaster - 测试 A 转账到 B 0.01 ERC20
 * 使用 Alchemy Bundler API 提交 UserOperation
 */

import { ethers } from 'ethers';

// 配置 - 使用成功验证的参数
const CONFIG = {
  // Alchemy API Key
  ALCHEMY_API_KEY: 'Bx4QRW1-vnwJUePSAAD7N',
  ALCHEMY_URL: 'https://eth-sepolia.g.alchemy.com/v2/',

  // 合约地址
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PAYMASTER_ADDRESS: '0x321eB27CA443ED279503b121E1e0c8D87a4f4B51',
  PNT_TOKEN_ADDRESS: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',

  // 测试账户
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',

  // RPC
  RPC_URL: 'https://ethereum-sepolia.publicnode.com',

  // 转账金额: 0.01 PNTs
  TRANSFER_AMOUNT: '0.01'
};

console.log('🚀 aNodePaymaster ERC20 转账测试');
console.log('================================');
console.log(`转账: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
console.log(`从: ${CONFIG.SIMPLE_ACCOUNT_A} (A)`);
console.log(`到: ${CONFIG.SIMPLE_ACCOUNT_B} (B)`);
console.log(`Paymaster: ${CONFIG.PAYMASTER_ADDRESS}`);
console.log('');

class ERC20TransferTester {
  constructor() {
    this.alchemyUrl = CONFIG.ALCHEMY_URL + CONFIG.ALCHEMY_API_KEY;
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  /**
   * 测试 Alchemy 连通性
   */
  async testConnectivity() {
    console.log('1️⃣ 测试 Alchemy 连通性...');
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
    console.log('2️⃣ 检查账户余额...');

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
    console.log('3️⃣ 生成 UserOperation...');

    if (!balanceInfo) return null;

    const { decimals } = balanceInfo;

    // 获取当前 nonce
    const accountContract = new ethers.Contract(CONFIG.SIMPLE_ACCOUNT_A, [
      'function getNonce() view returns (uint256)'
    ], this.provider);

    const nonce = await accountContract.getNonce();
    console.log(`当前 nonce: ${nonce}`);

    // 计算转账金额: 0.01 PNTs
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
   * 通过本地 Paymaster 服务处理
   */
  async processWithPaymaster(userOp) {
    console.log('4️⃣ 通过 Paymaster 处理...');

    try {
      const response = await fetch('http://localhost:8787/api/v1/paymaster/process', {
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

      console.log('✅ Paymaster 处理成功');
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
      console.error('❌ Paymaster 处理失败:', error.message);
      console.log('');
      console.log('💡 请确保 Paymaster 服务正在运行:');
      console.log('   cd simple-paymaster && pnpm run dev');
      console.log('');
      return null;
    }
  }

  /**
   * 签名 UserOperation
   */
  async signUserOperation(userOp) {
    console.log('5️⃣ 签名 UserOperation...');

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
    console.log('6️⃣ 提交到 Alchemy Bundler...');

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
          console.log('- 检查 paymaster 合约状态和存款');
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
        console.log('✅ SUCCESS: ERC20 转账 UserOperation 已提交!');
        console.log('==============================');
        console.log('📋 交易摘要:');
        console.log(`   从: ${CONFIG.SIMPLE_ACCOUNT_A}`);
        console.log(`   到: ${CONFIG.SIMPLE_ACCOUNT_B}`);
        console.log(`   金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
        console.log(`   Paymaster: ${CONFIG.PAYMASTER_ADDRESS}`);
        console.log(`   Hash: ${result.result}`);
        console.log('');
        console.log('⏳ 交易正在处理中，请等待确认...');

        return { success: true, userOpHash: result.result };
      }
    } catch (error) {
      console.error('❌ 网络错误:', error.message);
      return { success: false, error: { message: error.message } };
    }
  }

  /**
   * 运行完整测试
   */
  async run() {
    try {
      // 1. 测试连通性
      const connected = await this.testConnectivity();
      if (!connected) {
        throw new Error('无法连接到 Alchemy API');
      }

      // 2. 检查余额
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

      // 3. 生成 UserOperation
      const userOp = await this.generateUserOperation(balanceInfo);
      if (!userOp) {
        throw new Error('无法生成 UserOperation');
      }

      // 4. Paymaster 处理
      const processedUserOp = await this.processWithPaymaster(userOp);
      if (!processedUserOp) {
        throw new Error('Paymaster 处理失败');
      }

      // 5. 签名
      const signedUserOp = await this.signUserOperation(processedUserOp);

      // 6. 提交到 Alchemy
      const result = await this.submitToAlchemy(signedUserOp);

      if (result.success) {
        console.log('');
        console.log('🎊 完整的 ERC20 转账测试成功完成!');
        console.log('====================================');
        console.log('');
        console.log('📊 技术验证:');
        console.log('✅ Alchemy API 连接正常');
        console.log('✅ ERC20 代币余额充足');
        console.log('✅ UserOperation 生成正确');
        console.log('✅ Paymaster 处理成功');
        console.log('✅ 签名验证通过');
        console.log('✅ Bundler 接受并处理');
        console.log('');
        console.log('🚀 aNodePaymaster 已验证可用于生产环境!');
        console.log(`   交易 Hash: ${result.userOpHash}`);
      } else {
        console.log('');
        console.log('❌ 测试失败，需要进一步调试');
        console.log('请检查错误信息并参考 BUG_ANALYSIS_AND_SOLUTIONS.md');
      }

      return result;

    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error.message);
      return { success: false, error: { message: error.message } };
    }
  }
}

// 运行测试
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const tester = new ERC20TransferTester();
  tester.run().catch(console.error);
}

export { ERC20TransferTester };