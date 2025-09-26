#!/usr/bin/env node

/**
 * 调试签名验证问题
 * 对比不同签名方式的结果
 */

import { ethers } from 'ethers';

// 配置
const CONFIG = {
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'
};

class SignatureDebugger {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  // ERC-4337标准的UserOpHash计算
  calculateUserOpHash(userOp) {
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

  // 测试不同的签名方式
  async testSignatureMethods() {
    console.log('🔐 签名方式对比测试');
    console.log('==================');

    // 构造测试UserOp
    const testUserOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: '0x18',
      initCode: '0x',
      callData: '0x1234567890abcdef',
      callGasLimit: '0x493e0',
      verificationGasLimit: '0x186a0',
      preVerificationGas: '0xb5fc',
      maxFeePerGas: '0x59682f00',
      maxPriorityFeePerGas: '0x59682f00',
      paymasterAndData: '0xabcdef1234567890',
      signature: '0x'
    };

    console.log('测试UserOp:');
    console.log('- sender:', testUserOp.sender);
    console.log('- nonce:', testUserOp.nonce);
    console.log('- callData:', testUserOp.callData);
    console.log('- paymasterAndData:', testUserOp.paymasterAndData);
    console.log('');

    // 计算UserOpHash
    const userOpHash = this.calculateUserOpHash(testUserOp);
    console.log('UserOpHash:', userOpHash);

    // 方法1: 直接对hash签名 (我们当前使用的方法)
    console.log('\n📝 方法1: 直接对hash签名');
    const signature1 = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    console.log('签名1:', signature1);

    // 验证签名1
    const recovered1 = ethers.verifyMessage(ethers.getBytes(userOpHash), signature1);
    console.log('恢复地址1:', recovered1);
    console.log('匹配:', recovered1.toLowerCase() === this.wallet.address.toLowerCase() ? '✅' : '❌');

    // 方法2: 使用hashMessage (EIP-191)
    console.log('\n📝 方法2: 使用hashMessage (EIP-191)');
    const messageHash = ethers.hashMessage(ethers.getBytes(userOpHash));
    console.log('消息Hash:', messageHash);
    const signature2 = await this.wallet.signMessage(ethers.getBytes(userOpHash)); // 实际上是一样的
    console.log('签名2:', signature2);

    // 方法3: 检查SimpleAccount的签名验证逻辑
    console.log('\n🔍 检查SimpleAccount签名逻辑');

    // SimpleAccount通常使用标准的ECDSA验证
    // 它会调用: ECDSA.recover(hash, signature)
    // 其中hash是keccak256(abi.encodePacked(userOpHash, entryPoint))

    // 模拟SimpleAccount的验证逻辑
    try {
      const simpleAccountAbi = [
        'function getUserOpHash((address,uint256,bytes,bytes,address,uint256,uint256,uint256,uint256,bytes,bytes) memory userOp) view returns (bytes32)'
      ];

      // 由于我们不能直接调用合约，让我们手动验证
      console.log('SimpleAccount验证逻辑:');
      console.log('1. 计算userOpHash');
      console.log('2. 计算finalHash = keccak256(abi.encodePacked(userOpHash, entryPoint))');
      console.log('3. 使用ECDSA.recover(finalHash, signature)');

      console.log('\n我们的计算结果:');
      console.log('- userOpHash:', userOpHash);
      console.log('- finalHash (用于签名):', userOpHash);
      console.log('- 签名者地址:', this.wallet.address);

      // 测试恢复
      const testRecovery = ethers.recoverAddress(userOpHash, signature1);
      console.log('- 恢复测试结果:', testRecovery);
      console.log('- 匹配期望:', testRecovery.toLowerCase() === this.wallet.address.toLowerCase() ? '✅' : '❌');

    } catch (error) {
      console.log('SimpleAccount检查失败:', error.message);
    }

    return {
      userOpHash,
      signature1,
      recovered1,
      valid: recovered1.toLowerCase() === this.wallet.address.toLowerCase()
    };
  }

  async debugPaymasterAndData() {
    console.log('\n🎯 PaymasterAndData格式检查');
    console.log('==========================');

    // 从我们的paymaster服务获取的示例
    const samplePaymasterAndData = '0x68b2ae87612979fd82ca04425dc46583c8e1b2d50000000000000000000000000482e705df67013f8fc8315f09273aca8ba1b413f869416f18e40eeab3ed824c0a509d2b9ad3e0d8a2bafd578f287fc0f5d00c3ff62549fc7a4d5ca6b08ab3371c';

    console.log('示例paymasterAndData:', samplePaymasterAndData);
    console.log('长度:', samplePaymasterAndData.length, '字符');

    // 解析结构
    const paymasterAddress = samplePaymasterAndData.slice(0, 42); // 0x + 40 chars
    const validUntil = samplePaymasterAndData.slice(42, 50); // 6 bytes
    const validAfter = samplePaymasterAndData.slice(50, 58); // 6 bytes
    const signature = samplePaymasterAndData.slice(58); // rest

    console.log('解析结果:');
    console.log('- Paymaster地址:', paymasterAddress);
    console.log('- ValidUntil (hex):', validUntil);
    console.log('- ValidAfter (hex):', validAfter);
    console.log('- ValidUntil (dec):', parseInt(validUntil, 16));
    console.log('- ValidAfter (dec):', parseInt(validAfter, 16));
    console.log('- 签名长度:', signature.length, '字符');

    return {
      paymasterAddress,
      validUntil,
      validAfter,
      signature
    };
  }

  async runDebug() {
    console.log('🐛 签名调试测试');
    console.log('================');

    try {
      // 1. 测试签名方法
      const sigResult = await this.testSignatureMethods();
      console.log('');

      // 2. 检查paymasterAndData格式
      const paymasterResult = await this.debugPaymasterAndData();
      console.log('');

      // 3. 总结
      console.log('📊 调试结果总结');
      console.log('================');
      console.log(`签名验证: ${sigResult.valid ? '✅ 有效' : '❌ 无效'}`);
      console.log(`Paymaster格式: ✅ 解析成功`);
      console.log(`签名长度: ${paymasterResult.signature.length} 字符`);

      if (sigResult.valid) {
        console.log('\n💡 可能的解决方案:');
        console.log('1. 检查SimpleAccount是否使用不同的hash计算方式');
        console.log('2. 尝试使用不同的nonce值');
        console.log('3. 验证paymasterAndData的完整性');
      }

    } catch (error) {
      console.error('❌ 调试过程中出错:', error.message);
    }
  }
}

// 运行调试测试
const signatureDebugger = new SignatureDebugger();
signatureDebugger.runDebug().catch(console.error);
