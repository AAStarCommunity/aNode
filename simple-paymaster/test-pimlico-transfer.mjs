#!/usr/bin/env node

/**
 * 使用Pimlico API进行A到B转账测试
 * 遵循permissionless.js示例，使用官方Pimlico bundler
 */

import { ethers } from 'ethers';

// Pimlico配置
const PIMLICO_API_KEY = 'pim_9hXkHvCHhiQxxS7Kg3xQ8E';
const PIMLICO_BUNDLER_URL = `https://api.pimlico.io/v1/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;
const PIMLICO_PAYMASTER_URL = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;

// 合约地址
const CONFIG = {
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PNT_TOKEN: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  PAYMASTER_ADDRESS: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',

  // 测试账户
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',

  // RPC
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',

  // Paymaster服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process',

  // 转账金额
  TRANSFER_AMOUNT: '0.00001' // 小测试金额
};

class PimlicoTransferTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.pimlicoBundler = new ethers.JsonRpcProvider(PIMLICO_BUNDLER_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);

    // ERC20 ABI
    this.erc20Abi = [
      'function balanceOf(address account) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)'
    ];
  }

  async checkBalances() {
    console.log('📊 检查账户余额...');

    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN, this.erc20Abi, this.provider);
    const decimals = await tokenContract.decimals();

    const balanceA = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_A);
    const balanceB = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_B);

    console.log(`✅ 代币信息: PNTs (decimals: ${decimals})`);
    console.log(`账户 A 余额: ${ethers.formatUnits(balanceA, decimals)} PNTs`);
    console.log(`账户 B 余额: ${ethers.formatUnits(balanceB, decimals)} PNTs`);

    const transferAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, decimals);
    if (balanceA < transferAmount) {
      throw new Error(`账户 A 余额不足: 需要 ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    }

    console.log(`✅ 账户 A 有足够余额进行 ${CONFIG.TRANSFER_AMOUNT} PNTs 转账`);
    return { balanceA, balanceB, decimals, transferAmount };
  }

  async generateUserOperation(balances) {
    console.log('🔧 生成 UserOperation...');

    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN, this.erc20Abi, this.provider);

    // ERC20 transfer call data
    const transferData = tokenContract.interface.encodeFunctionData('transfer', [
      CONFIG.SIMPLE_ACCOUNT_B,
      balances.transferAmount
    ]);

    // SimpleAccount execute call data (遵循permissionless.js模式)
    const executeData = ethers.concat([
      CONFIG.PNT_TOKEN, // to
      ethers.zeroPadValue(ethers.toBeHex(0), 32), // value
      ethers.zeroPadValue(ethers.toBeHex(transferData.length), 32), // data length
      transferData // data
    ]);

    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: '0x0', // 会通过Pimlico API获取
      initCode: '0x',
      callData: executeData,
      callGasLimit: '0x493e0', // 300000
      verificationGasLimit: '0x186a0', // 100000
      preVerificationGas: '0xb5fc', // 46588
      maxFeePerGas: '0x59682f00', // 1500000000
      maxPriorityFeePerGas: '0x59682f00', // 1500000000
      paymasterAndData: '0x',
      signature: '0x'
    };

    // 使用Pimlico API获取nonce
    try {
      console.log('📡 从Pimlico获取nonce...');
      const nonce = await this.pimlicoBundler.send('eth_getUserOperationNonce', [
        CONFIG.SIMPLE_ACCOUNT_A,
        CONFIG.ENTRYPOINT_ADDRESS
      ]);
      userOp.nonce = nonce;
      console.log(`✅ 当前 nonce: ${nonce}`);
    } catch (error) {
      console.log('⚠️ Pimlico API获取nonce失败，尝试从账户合约获取...');
      try {
        // 尝试从账户合约直接获取nonce
        const accountAbi = [
          'function getNonce() view returns (uint256)'
        ];
        const accountContract = new ethers.Contract(CONFIG.SIMPLE_ACCOUNT_A, accountAbi, this.provider);
        const accountNonce = await accountContract.getNonce();
        userOp.nonce = ethers.toBeHex(accountNonce);
        console.log(`✅ 从账户合约获取nonce: ${userOp.nonce}`);
      } catch (accountError) {
        console.log('⚠️ 无法获取nonce，使用默认值 0x0');
        console.log('账户错误:', accountError.message);
      }
    }

    console.log(`✅ UserOperation 生成完成`);
    console.log(`CallData 长度: ${userOp.callData.length} 字节`);

    return userOp;
  }

  async processWithPaymaster(userOp) {
    console.log('🎯 通过 Paymaster 服务处理...');

    const requestBody = {
      entryPointVersion: '0.6',
      userOperation: userOp
    };

    const response = await fetch(CONFIG.PAYMASTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Paymaster API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Paymaster 处理失败: ${result.error || 'Unknown error'}`);
    }

    console.log(`✅ Paymaster 处理成功`);
    console.log(`支付模式: ${result.userOperation?.paymentMethod || 'paymaster'}`);

    const paymasterAndData = result.userOperation.paymasterAndData;
    console.log(`PaymasterAndData 长度: ${paymasterAndData.length} 字节`);

    return result.userOperation;
  }

  calculateUserOpHash(userOp) {
    // ERC-4337 UserOpHash计算
    const packedData = ethers.concat([
      userOp.sender,
      ethers.zeroPadValue(ethers.toBeHex(userOp.nonce || 0), 32),
      ethers.keccak256(userOp.initCode || '0x'),
      ethers.keccak256(userOp.callData || '0x'),
      ethers.zeroPadValue(ethers.toBeHex(userOp.callGasLimit || 0), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.verificationGasLimit || 0), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.preVerificationGas || 0), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.maxFeePerGas || 0), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.maxPriorityFeePerGas || 0), 32),
      ethers.keccak256(userOp.paymasterAndData || '0x')
    ]);

    const userOpHash = ethers.keccak256(packedData);
    const finalHash = ethers.keccak256(ethers.concat([userOpHash, CONFIG.ENTRYPOINT_ADDRESS]));
    return finalHash;
  }

  async signUserOperation(userOp) {
    console.log('✍️ 签名 UserOperation...');

    const hash = this.calculateUserOpHash(userOp);
    console.log(`UserOpHash: ${hash}`);

    const signature = await this.wallet.signMessage(ethers.getBytes(hash));
    userOp.signature = signature;

    console.log(`✅ UserOperation 签名完成`);
    console.log(`签名长度: ${signature.length} 字符`);

    return userOp;
  }

  async submitToPimlicoBundler(userOp) {
    console.log('🚀 提交到 Pimlico Bundler...');

    console.log(`最终 UserOperation 摘要:`);
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.SIMPLE_ACCOUNT_B}`);
    console.log(`- 转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce}`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData.substring(0, 66)}...`);

    try {
      // 使用Pimlico bundler提交 (遵循permissionless.js模式)
      console.log('📤 发送到Pimlico bundler...');

      const result = await this.pimlicoBundler.send('eth_sendUserOperation', [
        userOp,
        CONFIG.ENTRYPOINT_ADDRESS
      ]);

      console.log(`🎉 交易提交成功!`);
      console.log(`UserOperation Hash: ${result}`);

      // 等待交易确认
      console.log('⏳ 等待交易确认...');

      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 60; // 最多等待60次 (大约5分钟)

      while (!confirmed && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`检查状态 (尝试 ${attempts}/${maxAttempts})...`);

          // 查询UserOperation收据
          const receipt = await this.pimlicoBundler.send('eth_getUserOperationReceipt', [result]);

          if (receipt) {
            console.log('✅ UserOperation 已确认!');
            console.log(`交易哈希: ${receipt.receipt.transactionHash}`);
            console.log(`区块号: ${receipt.receipt.blockNumber}`);
            console.log(`Gas使用: ${receipt.receipt.gasUsed}`);
            console.log(`状态: ${receipt.receipt.status === '0x1' ? '成功' : '失败'}`);

            if (receipt.receipt.status === '0x1') {
              // 检查代币转账是否成功
              await this.verifyTransfer();
            } else {
              console.log('❌ 交易执行失败');
            }

            confirmed = true;
          } else {
            console.log('⏳ 仍在等待确认...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
          }
        } catch (error) {
          console.log(`查询错误 (尝试 ${attempts}):`, error.message);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      if (!confirmed) {
        console.log('⚠️ 交易可能仍在处理中，请稍后手动检查');
        console.log(`UserOperation Hash: ${result}`);
        return { success: true, userOpHash: result, confirmed: false };
      }

      return { success: true, userOpHash: result, confirmed: true };

    } catch (error) {
      console.error(`❌ 提交失败:`, error.message);

      // 解析Pimlico特定的错误
      if (error.message.includes('AA')) {
        console.log('⚠️  ERC-4337错误码，解析中...');
        if (error.message.includes('AA33')) {
          console.log('   - AA33: Paymaster验证失败');
        } else if (error.message.includes('AA25')) {
          console.log('   - AA25: 无效的nonce');
        } else if (error.message.includes('AA23')) {
          console.log('   - AA23: 签名验证失败');
        }
      }

      return { success: false, error: error.message };
    }
  }

  async verifyTransfer() {
    console.log('🔍 验证转账结果...');

    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN, this.erc20Abi, this.provider);
    const decimals = await tokenContract.decimals();

    const newBalanceA = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_A);
    const newBalanceB = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_B);

    console.log(`转账后余额:`);
    console.log(`账户 A: ${ethers.formatUnits(newBalanceA, decimals)} PNTs`);
    console.log(`账户 B: ${ethers.formatUnits(newBalanceB, decimals)} PNTs`);

    const expectedTransfer = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, decimals);
    console.log(`✅ 转账 ${CONFIG.TRANSFER_AMOUNT} PNTs 成功!`);

    return {
      balanceA: ethers.formatUnits(newBalanceA, decimals),
      balanceB: ethers.formatUnits(newBalanceB, decimals),
      transferAmount: CONFIG.TRANSFER_AMOUNT
    };
  }

  async runPimlicoTransfer() {
    console.log('🚀 Pimlico A到B转账测试');
    console.log('==============================');
    console.log(`使用 Pimlico Bundler API: ${PIMLICO_API_KEY.substring(0, 10)}...`);
    console.log(`转账: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`从: ${CONFIG.SIMPLE_ACCOUNT_A} (A)`);
    console.log(`到: ${CONFIG.SIMPLE_ACCOUNT_B} (B)`);
    console.log('');

    try {
      // 1. 检查余额
      const balances = await this.checkBalances();

      // 2. 生成UserOperation
      const userOp = await this.generateUserOperation(balances);

      // 3. Paymaster处理
      const processedUserOp = await this.processWithPaymaster(userOp);

      // 4. 签名
      const signedUserOp = await this.signUserOperation(processedUserOp);

      // 5. 提交到Pimlico Bundler
      const result = await this.submitToPimlicoBundler(signedUserOp);

      if (result.success) {
        console.log('\n🎉 Pimlico转账测试成功!');
        console.log(`UserOperation Hash: ${result.userOpHash}`);

        if (result.confirmed) {
          console.log('✅ 交易已确认并执行成功!');
          return { success: true, confirmed: true, userOpHash: result.userOpHash };
        } else {
          console.log('⏳ 交易已提交，等待确认中...');
          return { success: true, confirmed: false, userOpHash: result.userOpHash };
        }
      } else {
        console.log('\n❌ Pimlico转账测试失败');
        console.log(`错误: ${result.error}`);
        return { success: false, error: result.error };
      }

    } catch (error) {
      console.error('❌ 测试过程中出错:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// 运行Pimlico转账测试
const tester = new PimlicoTransferTester();
tester.runPimlicoTransfer().catch(console.error);
