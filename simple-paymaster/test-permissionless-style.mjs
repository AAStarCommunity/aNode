#!/usr/bin/env node

/**
 * 使用permissionless.js风格的测试
 * 遵循官方ERC-4337签名规范
 */

import { ethers } from 'ethers';

// 配置
const CONFIG = {
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  PIMLICO_API_KEY: 'pim_9hXkHvCHhiQxxS7Kg3xQ8E',
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'
};

class PermissionlessStyleTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  // 标准的ERC-4337 UserOpHash计算 (permissionless.js方式)
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
    return ethers.keccak256(ethers.concat([userOpHash, CONFIG.ENTRYPOINT_ADDRESS]));
  }

  // SimpleAccount签名方式 (直接对hash签名)
  async signUserOp(userOp) {
    const userOpHash = this.getUserOpHash(userOp);
    return this.wallet.signMessage(ethers.getBytes(userOpHash));
  }

  // 验证签名 (SimpleAccount方式)
  verifySignature(userOp, signature) {
    const userOpHash = this.getUserOpHash(userOp);
    const recovered = ethers.verifyMessage(ethers.getBytes(userOpHash), signature);
    return recovered;
  }

  async testFullFlow() {
    console.log('🚀 Permissionless.js风格测试');
    console.log('==============================');

    // 1. 构造UserOp (使用实际测试数据)
    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: 24, // 0x18
      initCode: '0x',
      callData: '0x3e7b771d4541ec85c8137e950598ac97553a337a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008aa9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed476854000000000000000000000000000000000000000000000000000009184e72a000',
      callGasLimit: 300000,
      verificationGasLimit: 100000,
      preVerificationGas: 46588,
      maxFeePerGas: 1500000000,
      maxPriorityFeePerGas: 1500000000,
      paymasterAndData: '0x68b2ae87612979fd82ca04425dc46583c8e1b2d50000000000000000000000000482e705df67013f8fc8315f09273aca8ba1b413f869416f18e40eeab3ed824c0a509d2b9ad3e0d8a2bafd578f287fc0f5d00c3ff62549fc7a4d5ca6b08ab3371c',
      signature: '0x'
    };

    console.log('UserOp配置:');
    console.log('- sender:', userOp.sender);
    console.log('- nonce:', userOp.nonce);
    console.log('- callGasLimit:', userOp.callGasLimit);
    console.log('');

    // 2. 计算UserOpHash
    const userOpHash = this.getUserOpHash(userOp);
    console.log('📝 UserOpHash:', userOpHash);

    // 3. 生成签名
    const signature = await this.signUserOp(userOp);
    console.log('✍️ 签名:', signature);

    // 4. 验证签名
    const recovered = this.verifySignature(userOp, signature);
    console.log('🔍 恢复地址:', recovered);
    console.log('🎯 期望地址:', this.wallet.address);
    console.log('✅ 签名验证:', recovered.toLowerCase() === this.wallet.address.toLowerCase() ? '通过' : '失败');

    // 5. 使用Pimlico API测试
    console.log('\n🌐 测试Pimlico Bundler...');

    try {
      const pimlicoUrl = `https://api.pimlico.io/v1/sepolia/rpc?apikey=${CONFIG.PIMLICO_API_KEY}`;
      const bundler = new ethers.JsonRpcProvider(pimlicoUrl);

      // 设置签名
      userOp.signature = signature;

      console.log('发送UserOp到Pimlico...');

      const result = await bundler.send('eth_sendUserOperation', [
        userOp,
        CONFIG.ENTRYPOINT_ADDRESS
      ]);

      console.log('🎉 提交成功! UserOpHash:', result);

      // 等待确认
      console.log('⏳ 等待交易确认...');

      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`检查状态 (${attempts}/${maxAttempts})...`);

        try {
          const receipt = await bundler.send('eth_getUserOperationReceipt', [result]);

          if (receipt) {
            console.log('✅ UserOperation已确认!');
            console.log('交易哈希:', receipt.receipt.transactionHash);
            console.log('区块:', receipt.receipt.blockNumber);
            console.log('Gas使用:', receipt.receipt.gasUsed);
            console.log('状态:', receipt.receipt.status === '0x1' ? '成功' : '失败');

            if (receipt.receipt.status === '0x1') {
              console.log('\n🎉 实际转账成功!');
              return { success: true, txHash: receipt.receipt.transactionHash };
            } else {
              console.log('\n❌ 交易执行失败');
              return { success: false, error: 'Transaction failed' };
            }
          }
        } catch (error) {
          console.log(`查询失败: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('⚠️ 交易可能仍在处理中');
      return { success: true, pending: true, userOpHash: result };

    } catch (error) {
      console.error('❌ Pimlico提交失败:', error.message);

      if (error.message.includes('AA25')) {
        console.log('💡 AA25错误: nonce问题，尝试不同的nonce值');
      } else if (error.message.includes('Invalid UserOperation signature')) {
        console.log('💡 签名验证失败，可能需要调整签名方式');
      }

      return { success: false, error: error.message };
    }
  }

  async runTest() {
    console.log('🔬 ERC-4337 Permissionless.js风格测试');

    try {
      const result = await this.testFullFlow();

      console.log('\n📊 测试结果');
      console.log('==========');
      if (result.success) {
        if (result.txHash) {
          console.log('✅ 实际转账成功!');
          console.log('交易哈希:', result.txHash);
        } else if (result.pending) {
          console.log('⏳ 交易已提交，等待确认');
          console.log('UserOpHash:', result.userOpHash);
        } else {
          console.log('✅ UserOp已提交');
          console.log('UserOpHash:', result.userOpHash);
        }
      } else {
        console.log('❌ 测试失败:', result.error);
      }

    } catch (error) {
      console.error('❌ 测试异常:', error.message);
    }
  }
}

// 运行测试
const tester = new PermissionlessStyleTester();
tester.runTest().catch(console.error);
