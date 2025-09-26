#!/usr/bin/env node

/**
 * 使用新部署的标准SimpleAccount进行ERC-4337转账测试
 */

import { ethers } from 'ethers';

// 配置 - 使用新部署的标准SimpleAccount
const CONFIG = {
  // 新部署的标准SimpleAccount地址
  SENDER_A: '0x63544c8Aa95cBa5bb4F2182FC2184CE3023Ae259', // SimpleAccount A
  RECEIVER_B: '0x3F27A0C11033eF96a3B0a9ee479A23C7C739D5A8', // SimpleAccount B

  // 所有者私钥 (用于签名UserOperation)
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',

  // 合约地址
  ENTRYPOINT_V06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PNT_CONTRACT: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  PAYMASTER_CONTRACT: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',

  // 转账金额
  TRANSFER_AMOUNT: '0.005', // 0.005 PNTs

  // RPC
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',

  // Paymaster服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process'
};

// SimpleAccount ABI
const SIMPLE_ACCOUNT_ABI = [
  'function nonce() view returns (uint256)',
  'function getNonce() view returns (uint256)',
  'function execute(address dest, uint256 value, bytes calldata func)',
  'function validateUserOp((address,uint256,bytes,bytes,address,uint256,uint256,uint256,uint256,bytes,bytes) memory userOp, bytes32 userOpHash, uint256 missingAccountFunds) returns (uint256)',
  'function owner() view returns (address)'
];

class StandardAccountTransferTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  async checkAccountBalances() {
    console.log('📊 检查账户PNT余额...');

    const tokenContract = new ethers.Contract(CONFIG.PNT_CONTRACT, [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ], this.provider);

    const decimals = await tokenContract.decimals();

    const balanceA = await tokenContract.balanceOf(CONFIG.SENDER_A);
    const balanceB = await tokenContract.balanceOf(CONFIG.RECEIVER_B);

    console.log(`✅ 代币信息: PNTs (decimals: ${decimals})`);
    console.log(`账户 A 余额: ${ethers.formatUnits(balanceA, decimals)} PNTs`);
    console.log(`账户 B 余额: ${ethers.formatUnits(balanceB, decimals)} PNTs`);

    const transferAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, decimals);

    if (balanceA < transferAmount) {
      console.log(`❌ 账户 A 余额不足，需要至少 ${CONFIG.TRANSFER_AMOUNT} PNTs`);
      console.log('请先向账户 A 转入足够的 PNT 代币');
      return null;
    }

    console.log(`✅ 账户 A 有足够余额进行 ${CONFIG.TRANSFER_AMOUNT} PNTs 转账`);
    return { balanceA, balanceB, decimals, transferAmount };
  }

  async checkSimpleAccountStatus() {
    console.log('🔍 检查SimpleAccount状态...');

    const simpleAccountA = new ethers.Contract(CONFIG.SENDER_A, SIMPLE_ACCOUNT_ABI, this.provider);

    try {
      const ownerA = await simpleAccountA.owner();
      const nonceA = await simpleAccountA.getNonce();

      console.log(`✅ SimpleAccount A:`);
      console.log(`  地址: ${CONFIG.SENDER_A}`);
      console.log(`  Owner: ${ownerA}`);
      console.log(`  Nonce: ${nonceA}`);

      if (ownerA.toLowerCase() !== this.wallet.address.toLowerCase()) {
        console.log('❌ Owner地址不匹配');
        return false;
      }

      console.log('✅ SimpleAccount A 状态正常');
      return { nonceA: nonceA.toString() };

    } catch (error) {
      console.log('❌ SimpleAccount检查失败:', error.message);
      return false;
    }
  }

  async generateUserOperation(transferAmount, nonce) {
    console.log('🔧 生成UserOperation...');

    // ERC20 transfer数据
    const tokenInterface = new ethers.Interface([
      'function transfer(address,uint256) returns (bool)'
    ]);

    const transferData = tokenInterface.encodeFunctionData('transfer', [
      CONFIG.RECEIVER_B,
      transferAmount
    ]);

    // SimpleAccount execute数据
    const executeData = ethers.concat([
      CONFIG.PNT_CONTRACT, // to
      ethers.zeroPadValue(ethers.toBeHex(0), 32), // value
      ethers.zeroPadValue(ethers.toBeHex(transferData.length), 32), // data length
      transferData // data
    ]);

    const userOp = {
      sender: CONFIG.SENDER_A,
      nonce: nonce,
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

    console.log(`✅ UserOperation生成完成, nonce: ${nonce}`);
    return userOp;
  }

  async processWithPaymaster(userOp) {
    console.log('🎯 通过Paymaster服务处理...');

    const response = await fetch(CONFIG.PAYMASTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryPointVersion: '0.6',
        userOperation: userOp
      })
    });

    if (!response.ok) {
      throw new Error(`Paymaster API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`Paymaster处理失败: ${result.error}`);
    }

    console.log('✅ Paymaster处理成功');
    console.log(`支付模式: ${result.userOperation?.paymentMethod || 'paymaster'}`);

    const paymasterAndData = result.userOperation.paymasterAndData;
    console.log(`PaymasterAndData长度: ${paymasterAndData.length} 字节`);

    return result.userOperation;
  }

  getUserOpHash(userOp) {
    const packedData = ethers.concat([
      userOp.sender,
      ethers.zeroPadValue(ethers.toBeHex(userOp.nonce), 32),
      ethers.keccak256(userOp.initCode),
      ethers.keccak256(userOp.callData),
      ethers.zeroPadValue(ethers.toBeHex(userOp.callGasLimit), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.verificationGasLimit), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.preVerificationGas), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.maxFeePerGas), 32),
      ethers.zeroPadValue(ethers.toBeHex(userOp.maxPriorityFeePerGas), 32),
      ethers.keccak256(userOp.paymasterAndData)
    ]);

    const userOpHash = ethers.keccak256(packedData);
    return ethers.keccak256(ethers.concat([userOpHash, CONFIG.ENTRYPOINT_V06]));
  }

  async signUserOp(userOp) {
    const userOpHash = this.getUserOpHash(userOp);
    console.log('🔑 UserOpHash:', userOpHash);

    const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    console.log('✍️ 签名生成完成');
    return signature;
  }

  async submitToBundler(userOp) {
    console.log('🚀 提交到Alchemy Bundler...');

    const alchemyBundler = new ethers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N`
    );

    console.log('最终UserOperation摘要:');
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.RECEIVER_B}`);
    console.log(`- 金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce}`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData.substring(0, 66)}...`);

    try {
      const result = await alchemyBundler.send('eth_sendUserOperation', [
        userOp,
        CONFIG.ENTRYPOINT_V06
      ]);

      console.log(`🎉 交易提交成功! UserOpHash: ${result}`);

      // 等待确认
      console.log('⏳ 等待交易确认...');

      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`检查状态 (${attempts}/${maxAttempts})...`);

        try {
          const receipt = await alchemyBundler.send('eth_getUserOperationReceipt', [result]);

          if (receipt) {
            console.log('✅ UserOperation已确认!');
            console.log(`交易哈希: ${receipt.receipt.transactionHash}`);
            console.log(`区块号: ${receipt.receipt.blockNumber}`);
            console.log(`Gas使用: ${receipt.receipt.gasUsed}`);
            console.log(`状态: ${receipt.receipt.status === '0x1' ? '成功' : '失败'}`);

            if (receipt.receipt.status === '0x1') {
              console.log('\n🎉 实际转账成功!');
              return {
                success: true,
                userOpHash: result,
                txHash: receipt.receipt.transactionHash,
                blockNumber: receipt.receipt.blockNumber,
                gasUsed: receipt.receipt.gasUsed
              };
            } else {
              console.log('\n❌ 交易执行失败');
              return { success: false, userOpHash: result, error: 'Transaction failed' };
            }
          }
        } catch (error) {
          console.log(`查询失败: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      console.log('⚠️ 交易可能仍在处理中');
      return { success: true, pending: true, userOpHash: result };

    } catch (error) {
      console.error('❌ 提交失败:', error.message);

      if (error.message.includes('Invalid UserOperation signature')) {
        console.log('💡 签名验证失败 - 这可能是因为使用了标准SimpleAccount，签名验证逻辑与bundler期望一致！');
        console.log('🔧 可能的解决方案:');
        console.log('1. 检查EntryPoint版本兼容性');
        console.log('2. 验证UserOp格式是否正确');
        console.log('3. 确认nonce值是否正确');
      } else if (error.message.includes('AA25')) {
        console.log('💡 AA25错误: nonce问题 - 账户可能已经有其他交易');
      }

      return { success: false, error: error.message };
    }
  }

  async runStandardAccountTest() {
    console.log('🚀 标准SimpleAccount ERC-4337转账测试');
    console.log('=====================================');
    console.log(`发送方 A: ${CONFIG.SENDER_A}`);
    console.log(`接收方 B: ${CONFIG.RECEIVER_B}`);
    console.log(`转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`Paymaster: ${CONFIG.PAYMASTER_CONTRACT}`);
    console.log('');

    try {
      // 1. 检查账户余额
      const balances = await this.checkAccountBalances();
      if (!balances) {
        console.log('❌ 余额检查失败，无法继续测试');
        return null;
      }

      // 2. 检查SimpleAccount状态
      const accountStatus = await this.checkSimpleAccountStatus();
      if (!accountStatus) {
        console.log('❌ SimpleAccount状态检查失败，无法继续测试');
        return null;
      }

      // 3. 生成UserOperation
      const userOp = await this.generateUserOperation(balances.transferAmount, accountStatus.nonceA);

      // 4. Paymaster处理
      const processedUserOp = await this.processWithPaymaster(userOp);

      // 5. 签名
      const signature = await this.signUserOp(processedUserOp);
      processedUserOp.signature = signature;

      console.log('✍️ UserOperation签名完成');

      // 6. 提交到bundler
      const result = await this.submitToBundler(processedUserOp);

      if (result && result.success) {
        console.log('\n🎯 测试成功!');
        if (result.txHash) {
          console.log(`交易哈希: ${result.txHash}`);
          return result.txHash;
        } else {
          console.log(`UserOpHash: ${result.userOpHash}`);
          return result.userOpHash;
        }
      } else {
        console.log('\n❌ 测试失败');
        console.log(`错误: ${result?.error || '未知错误'}`);
        return null;
      }

    } catch (error) {
      console.error('❌ 测试过程中出错:', error.message);
      return null;
    }
  }
}

// 运行测试
const tester = new StandardAccountTransferTester();
tester.runStandardAccountTest().then(result => {
  if (result) {
    console.log('\n🎯 最终结果: 交易Hash =', result);
  } else {
    console.log('\n❌ 测试未完成');
  }
}).catch(console.error);
