#!/usr/bin/env node

/**
 * 生产环境完整测试 - v0.7 EntryPoint A到B转账
 * 使用线上 Paymaster 服务测试完整的 v0.7 交易流程
 */

import { ethers } from 'ethers';

// 配置 - v0.7 版本
const CONFIG = {
  // 线上 Paymaster 服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev',

  // Alchemy API Key
  ALCHEMY_API_KEY: 'Bx4QRW1-vnwJUePSAAD7N',
  ALCHEMY_URL: 'https://eth-sepolia.g.alchemy.com/v2/',

  // 合约地址 - v0.7
  ENTRYPOINT_ADDRESS: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
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

console.log('🚀 生产环境 v0.7 完整测试');
console.log('==============================');
console.log(`EntryPoint: ${CONFIG.ENTRYPOINT_ADDRESS} (v0.7)`);
console.log(`线上 Paymaster: ${CONFIG.PAYMASTER_URL}`);
console.log(`转账: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
console.log(`从: ${CONFIG.SIMPLE_ACCOUNT_A} (A)`);
console.log(`到: ${CONFIG.SIMPLE_ACCOUNT_B} (B)`);
console.log('');

class ProductionV07Tester {
  constructor() {
    this.paymasterUrl = CONFIG.PAYMASTER_URL;
    this.alchemyUrl = CONFIG.ALCHEMY_URL + CONFIG.ALCHEMY_API_KEY;
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  /**
   * 测试线上 Paymaster 健康状态
   */
  async testHealthCheck() {
    console.log('1️⃣ 测试线上 Paymaster 健康状态...');

    try {
      const response = await fetch(`${this.paymasterUrl}/health`);
      const result = await response.json();

      if (result.status === 'ok') {
        console.log('✅ 线上 Paymaster 健康');
        console.log(`   服务: ${result.service}`);
        console.log(`   版本: ${result.version}`);
        console.log(`   阶段: ${result.phase}`);
        return true;
      } else {
        console.log('❌ Paymaster 状态异常');
        return false;
      }
    } catch (error) {
      console.error('❌ 健康检查失败:', error.message);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: []
        })
      });

      const result = await response.json();

      if (result.result) {
        const chainId = parseInt(result.result, 16);
        console.log(`✅ Alchemy 连接成功! Chain ID: ${chainId}`);
        return true;
      } else {
        console.log('❌ Alchemy 连接失败');
        return false;
      }
    } catch (error) {
      console.error('❌ Alchemy 测试失败:', error.message);
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
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ], this.provider);

      const [balanceA, balanceB, decimals] = await Promise.all([
        tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_A),
        tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_B),
        tokenContract.decimals()
      ]);

      const balanceAFormatted = ethers.formatUnits(balanceA, decimals);
      const balanceBFormatted = ethers.formatUnits(balanceB, decimals);

      console.log(`✅ 代币信息: PNTs (decimals: ${decimals})`);
      console.log(`账户 A 余额: ${balanceAFormatted} PNTs`);
      console.log(`账户 B 余额: ${balanceBFormatted} PNTs`);

      const transferAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, decimals);
      if (balanceA >= transferAmount) {
        console.log(`✅ 账户 A 有足够余额进行 ${CONFIG.TRANSFER_AMOUNT} PNTs 转账`);
        return { balanceA, balanceB, decimals };
      } else {
        console.log(`❌ 账户 A 余额不足`);
        return null;
      }
    } catch (error) {
      console.error('❌ 余额检查失败:', error.message);
      return null;
    }
  }

  /**
   * 生成 UserOperation (v0.7 PackedUserOperation 格式)
   */
  async generateUserOperation(balanceInfo) {
    console.log('4️⃣ 生成 v0.7 UserOperation...');

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

    // 构建 execute 调用数据 (SimpleAccount.execute)
    const accountInterface = new ethers.Interface([
      'function execute(address dest, uint256 value, bytes calldata func)'
    ]);

    const executeData = accountInterface.encodeFunctionData('execute', [
      CONFIG.PNT_TOKEN_ADDRESS, // target
      0, // value
      transferData // data
    ]);

    // 构造 v0.7 PackedUserOperation
    // accountGasLimits: packed(uint128 verificationGasLimit, uint128 callGasLimit)
    const verificationGasLimit = BigInt('0x5208'); // 21000
    const callGasLimit = BigInt('0x186a0'); // 100000
    const accountGasLimits = ethers.concat([
      ethers.zeroPadValue(ethers.toBeHex(verificationGasLimit), 16), // 16 bytes
      ethers.zeroPadValue(ethers.toBeHex(callGasLimit), 16) // 16 bytes
    ]);

    // gasFees: packed(uint128 maxPriorityFeePerGas, uint128 maxFeePerGas)
    const maxPriorityFeePerGas = BigInt('0x3b9aca00'); // 1 gwei
    const maxFeePerGas = BigInt('0x3b9aca00'); // 1 gwei
    const gasFees = ethers.concat([
      ethers.zeroPadValue(ethers.toBeHex(maxPriorityFeePerGas), 16), // 16 bytes
      ethers.zeroPadValue(ethers.toBeHex(maxFeePerGas), 16) // 16 bytes
    ]);

    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: `0x${nonce.toString(16)}`,
      initCode: '0x',
      callData: executeData,
      accountGasLimits: accountGasLimits,
      preVerificationGas: '0xB61C', // 46620
      gasFees: gasFees,
      paymasterAndData: '0x', // 待填充
      signature: '0x'
    };

    console.log('✅ v0.7 UserOperation 生成完成');
    console.log(`CallData 长度: ${executeData.length - 2} 字节`);
    console.log('');

    return userOp;
  }

  /**
   * 通过线上 Paymaster 服务处理 (v0.7)
   */
  async processWithOnlinePaymaster(userOp) {
    console.log('5️⃣ 通过线上 Paymaster v0.7 处理...');

    try {
      const response = await fetch(`${this.paymasterUrl}/api/v1/paymaster/process/v07`, {
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

      console.log('✅ 线上 Paymaster v0.7 处理成功');
      console.log(`支付模式: ${result.paymentMethod}`);
      console.log(`处理时间: ${result.processing.totalDuration}`);

      const paymasterAndData = result.userOperation.paymasterAndData;
      console.log(`PaymasterAndData 长度: ${paymasterAndData.length - 2} 字节`);

      console.log('');
      return result.userOperation;

    } catch (error) {
      console.error('❌ 线上 Paymaster v0.7 处理失败:', error.message);
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
   * 签名 UserOperation (v0.7)
   */
  async signUserOperation(userOp) {
    console.log('6️⃣ 签名 v0.7 UserOperation...');

    // 计算 UserOpHash - 使用 EntryPoint 合约
    const entryPointContract = new ethers.Contract(CONFIG.ENTRYPOINT_ADDRESS, [
      'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes accountGasLimits, uint256 preVerificationGas, bytes gasFees, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
    ], this.provider);

    const userOpTuple = [
      userOp.sender,
      userOp.nonce,
      userOp.initCode,
      userOp.callData,
      userOp.accountGasLimits,
      userOp.preVerificationGas,
      userOp.gasFees,
      userOp.paymasterAndData,
      userOp.signature
    ];

    const userOpHash = await entryPointContract.getUserOpHash(userOpTuple);
    console.log(`UserOpHash: ${userOpHash}`);

    // 使用 signMessage (v0.7 SimpleAccount 兼容)
    const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    userOp.signature = signature;

    console.log('✅ v0.7 UserOperation 签名完成');
    console.log(`签名长度: ${signature.length - 2} 字符`);
    console.log('');

    return userOp;
  }

  /**
   * 提交到 Alchemy Bundler (v0.7)
   */
  async submitToAlchemy(userOp) {
    console.log('7️⃣ 提交到 Alchemy Bundler (v0.7)...');

    console.log('最终 v0.7 UserOperation 摘要:');
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.SIMPLE_ACCOUNT_B}`);
    console.log(`- 转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce}`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData.substring(0, 50)}...`);
    console.log(`- 签名: ${userOp.signature.substring(0, 50)}...`);
    console.log('');

    try {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, CONFIG.ENTRYPOINT_ADDRESS]
      };

      const response = await fetch(this.alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Alchemy API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`Bundler error: ${result.error.message}`);
      }

      const userOpHash = result.result;
      console.log('🎉 提交成功!');
      console.log(`UserOpHash: ${userOpHash}`);
      console.log('');

      return userOpHash;

    } catch (error) {
      console.error('❌ Bundler 提交失败:', error.message);
      return null;
    }
  }

  /**
   * 运行完整测试
   */
  async runFullTest() {
    console.log('开始 v0.7 完整测试流程...\n');

    // 1. 健康检查
    const healthOk = await this.testHealthCheck();
    if (!healthOk) {
      console.log('❌ 健康检查失败，停止测试');
      return false;
    }

    // 2. Alchemy 连通性
    const alchemyOk = await this.testAlchemyConnectivity();
    if (!alchemyOk) {
      console.log('❌ Alchemy 连通性测试失败，停止测试');
      return false;
    }

    // 3. 余额检查
    const balanceInfo = await this.checkBalances();
    if (!balanceInfo) {
      console.log('❌ 余额检查失败，停止测试');
      return false;
    }

    // 4. 生成 UserOperation
    const userOp = await this.generateUserOperation(balanceInfo);

    // 5. Paymaster 处理
    const processedUserOp = await this.processWithOnlinePaymaster(userOp);
    if (!processedUserOp) {
      console.log('❌ Paymaster 处理失败，停止测试');
      return false;
    }

    // 6. 签名
    const signedUserOp = await this.signUserOperation(processedUserOp);

    // 7. 提交到 Bundler
    const userOpHash = await this.submitToAlchemy(signedUserOp);
    if (!userOpHash) {
      console.log('❌ Bundler 提交失败');
      return false;
    }

    console.log('🎯 生产环境 v0.7 验证成功!');
    console.log(`UserOpHash: ${userOpHash}`);

    return userOpHash;
  }
}

// 运行测试
const tester = new ProductionV07Tester();
tester.runFullTest().then(success => {
  if (success) {
    console.log('\n🎊 生产环境 v0.7 完整测试成功完成!');
    console.log('✅ v0.7 A → B 转账交易已提交!');
  } else {
    console.log('\n❌ 生产环境 v0.7 测试失败');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 测试执行失败:', error);
  process.exit(1);
});
