#!/usr/bin/env node

/**
 * 模拟SimpleAccount验证逻辑
 * 使用与合约完全相同的验证方式
 */

import { ethers } from 'ethers';

// 配置
const CONFIG = {
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'
};

class SimpleAccountVerifier {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  // 模拟SimpleAccount的验证逻辑
  // SimpleAccount._validateSignature 使用 ECDSA.recover(digest, signature)
  // 其中 digest = _hashTypedDataV4(structHash)
  // 但对于UserOperation，SimpleAccount直接使用:
  // bytes32 hash = _getUserOpHash(userOp);
  // address recovered = ECDSA.recover(hash, userOp.signature);

  calculateUserOpHash(userOp) {
    // 这是EntryPoint.getUserOpHash的逻辑
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

  // 模拟ECDSA.recover函数 (SimpleAccount使用这个)
  recoverECDSA(hash, signature) {
    // 移除可能的前缀
    let sig = signature;
    if (sig.startsWith('0x')) {
      sig = sig.slice(2);
    }

    // 分解r, s, v
    const r = '0x' + sig.slice(0, 64);
    const s = '0x' + sig.slice(64, 128);
    const v = parseInt(sig.slice(128, 130), 16);

    // 使用ethers的recoverAddress
    try {
      return ethers.recoverAddress(hash, { r, s, v });
    } catch (error) {
      console.log('ECDSA恢复失败:', error.message);
      return ethers.ZeroAddress;
    }
  }

  async testSimpleAccountVerification() {
    console.log('🔐 SimpleAccount验证逻辑测试');
    console.log('=============================');

    // 使用与实际测试相同的UserOp
    const testUserOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: '0x18', // 从实际测试中获取的正确nonce
      initCode: '0x',
      callData: '0x3e7b771d4541ec85c8137e950598ac97553a337a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008aa9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed476854000000000000000000000000000000000000000000000000000009184e72a000',
      callGasLimit: '0x493e0',
      verificationGasLimit: '0x186a0',
      preVerificationGas: '0xb5fc',
      maxFeePerGas: '0x59682f00',
      maxPriorityFeePerGas: '0x59682f00',
      paymasterAndData: '0x68b2ae87612979fd82ca04425dc46583c8e1b2d50000000000000000000000000482e705df67013f8fc8315f09273aca8ba1b413f869416f18e40eeab3ed824c0a509d2b9ad3e0d8a2bafd578f287fc0f5d00c3ff62549fc7a4d5ca6b08ab3371c',
      signature: '0x'
    };

    console.log('测试UserOp:');
    console.log('- sender:', testUserOp.sender);
    console.log('- nonce:', testUserOp.nonce);
    console.log('- callData长度:', testUserOp.callData.length);
    console.log('- paymasterAndData长度:', testUserOp.paymasterAndData.length);
    console.log('');

    // 1. 计算UserOpHash (EntryPoint方式)
    const userOpHash = this.calculateUserOpHash(testUserOp);
    console.log('1️⃣ UserOpHash (EntryPoint计算):', userOpHash);

    // 2. 生成签名 (使用我们的方式)
    console.log('\n2️⃣ 生成签名...');
    const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    console.log('生成的签名:', signature);

    // 3. 使用ECDSA.recover验证 (SimpleAccount方式)
    console.log('\n3️⃣ 使用ECDSA.recover验证...');
    const recoveredAddress = this.recoverECDSA(userOpHash, signature);
    console.log('恢复的地址:', recoveredAddress);
    console.log('期望的地址:', this.wallet.address);
    console.log('地址匹配:', recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase() ? '✅' : '❌');

    // 4. 检查是否与SimpleAccount的owner匹配
    const isValidSignature = recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase();

    // 5. 验证paymaster签名
    console.log('\n4️⃣ 验证paymaster签名...');
    const paymasterAndData = testUserOp.paymasterAndData;
    const paymasterData = paymasterAndData.slice(0, 58); // address + validUntil + validAfter
    const paymasterSignature = '0x' + paymasterAndData.slice(58);

    const paymasterDataHash = ethers.keccak256(paymasterData);
    const paymasterHash = ethers.keccak256(ethers.concat([paymasterDataHash, userOpHash]));

    const paymasterRecovered = this.recoverECDSA(paymasterHash, paymasterSignature);
    console.log('Paymaster签名恢复地址:', paymasterRecovered);
    console.log('Paymaster地址匹配:', paymasterRecovered.toLowerCase() === this.wallet.address.toLowerCase() ? '✅' : '❌');

    return {
      userOpHash,
      signature,
      recoveredAddress,
      isValidSignature,
      paymasterValid: paymasterRecovered.toLowerCase() === this.wallet.address.toLowerCase()
    };
  }

  async runVerification() {
    console.log('🔍 SimpleAccount验证测试');
    console.log('========================');

    try {
      const result = await this.testSimpleAccountVerification();

      console.log('\n📊 验证结果总结');
      console.log('================');
      console.log(`UserOp签名验证: ${result.isValidSignature ? '✅ 通过' : '❌ 失败'}`);
      console.log(`Paymaster签名验证: ${result.paymasterValid ? '✅ 通过' : '❌ 失败'}`);

      if (result.isValidSignature && result.paymasterValid) {
        console.log('\n🎉 所有签名验证通过！问题可能在其他地方。');
        console.log('💡 建议检查:');
        console.log('1. nonce是否正确');
        console.log('2. gas参数是否合理');
        console.log('3. bundler的验证逻辑');
      } else {
        console.log('\n❌ 签名验证失败，需要修复签名生成逻辑。');
      }

      return result;

    } catch (error) {
      console.error('❌ 验证过程中出错:', error.message);
      return { error: error.message };
    }
  }
}

// 运行验证测试
const verifier = new SimpleAccountVerifier();
verifier.runVerification().catch(console.error);
