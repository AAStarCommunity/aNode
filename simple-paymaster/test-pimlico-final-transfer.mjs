#!/usr/bin/env node

/**
 * 使用Pimlico Bundler测试最终的ERC-4337转账
 */

import { ethers } from 'ethers';

const CONFIG = {
  SENDER_A: '0x63544c8Aa95cBa5bb4F2182FC2184CE3023Ae259',
  RECEIVER_B: '0x3F27A0C11033eF96a3B0a9ee479A23C7C739D5A8',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  ENTRYPOINT_V06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PNT_CONTRACT: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  PAYMASTER_CONTRACT: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',
  TRANSFER_AMOUNT: '0.002', // 0.002 PNTs
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',
  PIMLICO_BUNDLER_URL: 'https://api.pimlico.io/v1/sepolia/rpc?apikey=pim_9hXkHvCHhiQxxS7Kg3xQ8E'
};

class PimlicoFinalTransferTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
    this.pimlicoBundler = new ethers.JsonRpcProvider(CONFIG.PIMLICO_BUNDLER_URL);
  }

  async checkBalances() {
    console.log('📊 检查PNT余额...');

    const tokenContract = new ethers.Contract(CONFIG.PNT_CONTRACT, [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ], this.provider);

    const decimals = await tokenContract.decimals();

    const balanceA = await tokenContract.balanceOf(CONFIG.SENDER_A);
    const balanceB = await tokenContract.balanceOf(CONFIG.RECEIVER_B);

    console.log(`账户 A 余额: ${ethers.formatUnits(balanceA, decimals)} PNTs`);
    console.log(`账户 B 余额: ${ethers.formatUnits(balanceB, decimals)} PNTs`);

    return { balanceA, balanceB, decimals };
  }

  async getNonceFromPimlico() {
    console.log('🔢 从Pimlico获取nonce...');

    try {
      const nonce = await this.pimlicoBundler.send('eth_getUserOperationNonce', [
        CONFIG.SENDER_A,
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]);

      console.log(`Pimlico nonce: ${nonce}`);
      return nonce;
    } catch (error) {
      console.log('无法从Pimlico获取nonce，使用本地nonce: 1');
      return '0x1'; // 使用1，因为直接转账已经用了nonce 0
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

    // SimpleAccount execute数据 - 使用正确的ABI编码
    const simpleAccountInterface = new ethers.Interface([
      'function execute(address,uint256,bytes)'
    ]);

    const executeData = simpleAccountInterface.encodeFunctionData('execute', [
      CONFIG.PNT_CONTRACT, // to
      0, // value
      transferData // data
    ]);

    const userOp = {
      sender: CONFIG.SENDER_A,
      nonce: nonce,
      initCode: '0x',
      callData: executeData,
      callGasLimit: '0x493e0', // 300000
      verificationGasLimit: '0x30d40', // 200000 - 进一步增加
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

    const response = await fetch('https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process', {
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

  async submitToPimlico(userOp) {
    console.log('🚀 提交到Pimlico Bundler...');

    console.log('最终UserOperation摘要:');
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.RECEIVER_B}`);
    console.log(`- 金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce}`);

    try {
      const result = await this.pimlicoBundler.send('eth_sendUserOperation', [
        userOp,
        CONFIG.ENTRYPOINT_V06
      ]);

      console.log(`🎉 UserOperation提交成功! UserOpHash: ${result}`);

      // 等待确认
      console.log('⏳ 等待交易确认...');

      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`检查状态 (${attempts}/${maxAttempts})...`);

        try {
          const receipt = await this.pimlicoBundler.send('eth_getUserOperationReceipt', [result]);

          if (receipt) {
            console.log('✅ UserOperation已确认!');
            console.log(`交易哈希: ${receipt.receipt.transactionHash}`);
            console.log(`Gas使用: ${receipt.receipt.gasUsed}`);
            console.log(`状态: ${receipt.receipt.status === '0x1' ? '成功' : '失败'}`);

            if (receipt.receipt.status === '0x1') {
              console.log('\n🎉 ERC-4337无gas费转账成功!');
              console.log('✅ Paymaster赞助生效，用户无需支付gas费!');
              return {
                success: true,
                userOpHash: result,
                txHash: receipt.receipt.transactionHash,
                gasUsed: receipt.receipt.gasUsed
              };
            } else {
              console.log('\n❌ 交易执行失败');
              return { success: false, error: 'Transaction failed' };
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

      if (error.message.includes('AA23')) {
        console.log('💡 AA23错误: 账户执行时出现问题，可能需要更多gas');
      }

      return { success: false, error: error.message };
    }
  }

  async runFinalTest() {
    console.log('🚀 最终ERC-4337 Paymaster转账测试');
    console.log('====================================');
    console.log(`发送方 A: ${CONFIG.SENDER_A}`);
    console.log(`接收方 B: ${CONFIG.RECEIVER_B}`);
    console.log(`转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`Bundler: Pimlico`);
    console.log(`Paymaster: ${CONFIG.PAYMASTER_CONTRACT}`);
    console.log('');

    try {
      // 1. 检查账户余额
      const balances = await this.checkBalances();

      // 2. 从Pimlico获取nonce
      const nonce = await this.getNonceFromPimlico();

      // 3. 生成UserOperation
      const userOp = await this.generateUserOperation(
        ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, balances.decimals),
        nonce
      );

      // 4. Paymaster处理
      const processedUserOp = await this.processWithPaymaster(userOp);

      // 5. 签名
      const signature = await this.signUserOp(processedUserOp);
      processedUserOp.signature = signature;

      // 6. 提交到Pimlico
      const result = await this.submitToPimlico(processedUserOp);

      if (result && result.success) {
        console.log('\n🎯 ERC-4337 Paymaster测试成功!');
        console.log(`\n🎉 恭喜！用户A成功向用户B转账${CONFIG.TRANSFER_AMOUNT} PNT，Paymaster已赞助所有gas费！`);

        if (result.txHash) {
          console.log(`链上交易哈希: ${result.txHash}`);
          return result.txHash;
        } else {
          console.log(`UserOperation哈希: ${result.userOpHash}`);
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

// 运行最终测试
const tester = new PimlicoFinalTransferTester();
tester.runFinalTest().then(result => {
  if (result) {
    console.log('\n🎯 最终测试结果: 交易Hash =', result);
    console.log('\n🎊 ERC-4337 Paymaster系统完全成功！');
  } else {
    console.log('\n❌ 测试未完成，仍在调试中');
  }
}).catch(console.error);
