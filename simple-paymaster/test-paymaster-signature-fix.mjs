#!/usr/bin/env node

/**
 * 专门修复paymaster签名问题
 * 分析和修复non-canonical s问题
 */

import { ethers } from 'ethers';

// 配置
const CONFIG = {
  PAYMASTER_ADDRESS: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process',
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'
};

class PaymasterSignatureFixer {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);

    // ECDSA曲线参数
    this.N = ethers.toBigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
  }

  // 规范化ECDSA签名 (确保s <= N/2)
  normalizeSignature(signature) {
    console.log('🔧 规范化签名:', signature);

    if (signature.startsWith('0x')) {
      signature = signature.slice(2);
    }

    const r = signature.slice(0, 64);
    const s = signature.slice(64, 128);
    const v = signature.slice(128, 130);

    let sBigInt = ethers.toBigInt('0x' + s);
    const halfN = this.N / 2n;

    console.log('原始 s:', '0x' + s);
    console.log('s > N/2:', sBigInt > halfN);

    if (sBigInt > halfN) {
      const oldS = sBigInt;
      sBigInt = this.N - sBigInt;

      // 翻转v值
      const vInt = parseInt(v, 16);
      const newV = (vInt % 2 === 0) ? vInt - 1 : vInt + 1;

      const normalized = '0x' + r + sBigInt.toString(16).padStart(64, '0') + newV.toString(16);
      console.log('翻转后 s:', '0x' + sBigInt.toString(16).padStart(64, '0'));
      console.log('翻转后 v:', newV.toString(16));
      console.log('规范化签名:', normalized);

      return normalized;
    }

    return '0x' + r + s + v;
  }

  // 计算UserOpHash
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

  // 验证单个签名
  verifySignature(hash, signature, expectedAddress) {
    try {
      const recovered = ethers.verifyMessage(ethers.getBytes(hash), signature);
      const isValid = recovered.toLowerCase() === expectedAddress.toLowerCase();
      console.log(`签名验证: ${isValid ? '✅' : '❌'} (恢复地址: ${recovered})`);
      return isValid;
    } catch (error) {
      console.log('签名验证失败:', error.message);
      return false;
    }
  }

  // 分析paymasterAndData中的签名
  analyzePaymasterSignature(paymasterAndData) {
    console.log('\n🔍 分析paymasterAndData:');
    console.log('完整数据:', paymasterAndData);
    console.log('长度:', paymasterAndData.length, '字符');

    // 解析结构: paymasterAddress(20字节) + validUntil(6字节) + validAfter(6字节) + signature(65字节)
    // 20 + 6 + 6 + 65 = 97字节 = 194字符 (不包括0x)
    const addrLen = 42; // 0x + 40 chars for 20 bytes
    const timeLen = 12; // 12 chars for 6 bytes

    const paymasterAddress = paymasterAndData.slice(0, addrLen);
    const validUntil = paymasterAndData.slice(addrLen, addrLen + timeLen);
    const validAfter = paymasterAndData.slice(addrLen + timeLen, addrLen + timeLen + timeLen);
    const signatureStart = addrLen + timeLen + timeLen;
    const signature = '0x' + paymasterAndData.slice(signatureStart);

    console.log('Paymaster地址:', paymasterAddress);
    console.log('ValidUntil (hex):', validUntil, `(dec: ${parseInt(validUntil || '0', 16)})`);
    console.log('ValidAfter (hex):', validAfter, `(dec: ${parseInt(validAfter || '0', 16)})`);
    console.log('签名:', signature);
    console.log('签名长度:', signature.length, '字符');

    // 构造paymasterData用于hash计算 (address + validUntil + validAfter)
    const paymasterData = paymasterAndData.slice(0, signatureStart);
    console.log('PaymasterData (for hash):', paymasterData);

    return {
      paymasterAddress,
      validUntil,
      validAfter,
      signature,
      paymasterData
    };
  }

  // 测试paymaster签名修复
  async testPaymasterSignatureFix() {
    console.log('🔧 测试paymaster签名修复');
    console.log('=============================');

    // 使用实际的测试数据
    const testUserOp = {
      sender: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
      nonce: 24,
      initCode: '0x',
      callData: '0x3e7b771d4541ec85c8137e950598ac97553a337a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008aa9059cbb00000000000000000000000027243fac2c0bef46f143a705708dc4a7ed476854000000000000000000000000000000000000000000000000000000e8d4a51000',
      callGasLimit: 300000,
      verificationGasLimit: 100000,
      preVerificationGas: 46588,
      maxFeePerGas: 1500000000,
      maxPriorityFeePerGas: 1500000000,
      paymasterAndData: '0x68b2ae87612979fd82ca04425dc46583c8e1b2d5000000000000000000000000b17a6f47d4413aad9d50ea532ec29f01ebe94c5bf4ace3b1a296e0bdd1ed37e153231d7edb6d27d2a5a4e7a4878024aedc93b97eea95320db934bf218627e9c41b',
      signature: '0x8956a81adee17fefc552092bd8f0aeefe06a0f4c5bd66a1132f287b6e6c81cf2542b186238bc155ac0ffc97960d9021ec5716d815ba058913a7fa92cb7a9d5e51c'
    };

    console.log('1️⃣ 分析UserOp签名...');
    const userOpHash = this.getUserOpHash(testUserOp);
    console.log('UserOpHash:', userOpHash);

    const userOpValid = this.verifySignature(userOpHash, testUserOp.signature, this.wallet.address);
    console.log('UserOp签名有效:', userOpValid);

    console.log('\n2️⃣ 分析paymaster签名...');
    const pmAnalysis = this.analyzePaymasterSignature(testUserOp.paymasterAndData);

    // 计算paymaster签名应该验证的hash
    const paymasterDataHash = ethers.keccak256(pmAnalysis.paymasterData);
    const paymasterHash = ethers.keccak256(ethers.concat([paymasterDataHash, userOpHash]));

    console.log('PaymasterDataHash:', paymasterDataHash);
    console.log('Paymaster验证Hash:', paymasterHash);

    // 验证原始签名
    console.log('\n验证原始paymaster签名...');
    const originalValid = this.verifySignature(paymasterHash, pmAnalysis.signature, this.wallet.address);

    if (!originalValid) {
      console.log('\n🔧 尝试规范化paymaster签名...');

      // 规范化签名
      const normalizedSig = this.normalizeSignature(pmAnalysis.signature);
      console.log('规范化后签名:', normalizedSig);

      // 验证规范化签名
      const normalizedValid = this.verifySignature(paymasterHash, normalizedSig, this.wallet.address);

      if (normalizedValid) {
        console.log('\n✅ 签名规范化成功!');
        console.log('原始签名:', pmAnalysis.signature);
        console.log('修复签名:', normalizedSig);

        // 构造修复后的paymasterAndData
        const fixedPaymasterAndData = pmAnalysis.paymasterData + normalizedSig.slice(2);
        console.log('修复后paymasterAndData:', fixedPaymasterAndData);

        return {
          success: true,
          fixedPaymasterAndData,
          originalSignature: pmAnalysis.signature,
          fixedSignature: normalizedSig
        };
      } else {
        console.log('\n❌ 签名规范化失败');
        return { success: false, error: 'Normalization failed' };
      }
    } else {
      console.log('\n✅ 原始paymaster签名已经有效');
      return { success: true, fixedPaymasterAndData: testUserOp.paymasterAndData };
    }
  }

  async runFix() {
    console.log('🚀 Paymaster签名修复测试');

    try {
      const result = await this.testPaymasterSignatureFix();

      console.log('\n📊 修复结果总结');
      console.log('================');
      if (result.success) {
        console.log('✅ Paymaster签名修复成功');
        if (result.fixedPaymasterAndData !== result.originalPaymasterAndData) {
          console.log('🔄 签名已规范化');
          console.log('修复后的paymasterAndData长度:', result.fixedPaymasterAndData.length);
        } else {
          console.log('ℹ️ 签名本来就是有效的');
        }
      } else {
        console.log('❌ 签名修复失败');
        console.log('错误:', result.error);
      }

      return result;

    } catch (error) {
      console.error('❌ 修复过程中出错:', error.message);
      return { error: error.message };
    }
  }
}

// 运行修复测试
const fixer = new PaymasterSignatureFixer();
fixer.runFix().catch(console.error);
