#!/usr/bin/env node

/**
 * 直接测试SimpleAccount合约的签名验证逻辑
 * 检查我们是否使用了正确的签名方法
 */

import { ethers } from 'ethers';

// 配置
const CONFIG = {
  SENDER: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  ENTRYPOINT: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'
};

class SimpleAccountVerifier {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  // SimpleAccount ABI (简化版，用于验证签名)
  getSimpleAccountAbi() {
    return [
      'function getNonce() view returns (uint256)',
      'function validateUserOp((address,uint256,bytes,bytes,address,uint256,uint256,uint256,uint256,bytes,bytes) memory userOp, bytes32 userOpHash, uint256 missingAccountFunds) public returns (uint256 validationData)',
      'function isValidSignature(bytes32 hash, bytes memory signature) public view returns (bytes4)'
    ];
  }

  // 计算UserOpHash (与EntryPoint相同)
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
    return ethers.keccak256(ethers.concat([userOpHash, CONFIG.ENTRYPOINT]));
  }

  // 测试不同的签名方法
  async testSignatureMethods() {
    console.log('🔐 测试SimpleAccount签名验证');
    console.log('==============================');

    // 创建一个测试UserOp
    const testUserOp = {
      sender: CONFIG.SENDER,
      nonce: 24, // 0x18
      initCode: '0x',
      callData: '0x1234567890abcdef', // 简化的测试数据
      callGasLimit: 21000,
      verificationGasLimit: 100000,
      preVerificationGas: 21000,
      maxFeePerGas: 1500000000,
      maxPriorityFeePerGas: 1500000000,
      paymasterAndData: '0x',
      signature: '0x'
    };

    console.log('测试UserOp:');
    console.log('- sender:', testUserOp.sender);
    console.log('- nonce:', testUserOp.nonce);
    console.log('- callData:', testUserOp.callData);
    console.log('');

    // 计算UserOpHash
    const userOpHash = this.getUserOpHash(testUserOp);
    console.log('UserOpHash:', userOpHash);

    // 方法1: 直接签名 (我们当前使用的方法)
    console.log('\n📝 方法1: 直接对hash签名');
    const signature1 = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    console.log('签名1:', signature1);

    // 验证签名1
    const recovered1 = ethers.verifyMessage(ethers.getBytes(userOpHash), signature1);
    console.log('恢复地址1:', recovered1);
    console.log('期望地址:', this.wallet.address);
    console.log('匹配:', recovered1.toLowerCase() === this.wallet.address.toLowerCase() ? '✅' : '❌');

    // 方法2: 模拟SimpleAccount的签名验证
    console.log('\n🔍 测试SimpleAccount合约签名验证');

    try {
      const simpleAccount = new ethers.Contract(CONFIG.SENDER, this.getSimpleAccountAbi(), this.provider);

      // 首先获取nonce
      const nonce = await simpleAccount.getNonce();
      console.log('合约nonce:', nonce.toString());

      // 更新UserOp nonce
      testUserOp.nonce = parseInt(nonce.toString());
      const updatedUserOpHash = this.getUserOpHash(testUserOp);
      console.log('更新后的UserOpHash:', updatedUserOpHash);

      // 重新签名
      const signature2 = await this.wallet.signMessage(ethers.getBytes(updatedUserOpHash));
      console.log('更新后的签名:', signature2);

      // 验证签名2
      const recovered2 = ethers.verifyMessage(ethers.getBytes(updatedUserOpHash), signature2);
      console.log('恢复地址2:', recovered2);
      console.log('匹配:', recovered2.toLowerCase() === this.wallet.address.toLowerCase() ? '✅' : '❌');

      // 尝试调用合约的isValidSignature方法 (如果存在)
      try {
        const isValid = await simpleAccount.isValidSignature(updatedUserOpHash, signature2);
        console.log('合约isValidSignature结果:', isValid);
        console.log('签名有效性:', isValid === '0x1626ba7e' ? '✅ ERC-1271有效' : '❌ 无效');
      } catch (error) {
        console.log('isValidSignature方法不存在或调用失败');
      }

    } catch (error) {
      console.log('SimpleAccount合约调用失败:', error.message);
      console.log('这表明我们可能没有使用标准的SimpleAccount实现');
    }

    return {
      userOpHash,
      signature1,
      recovered1,
      valid: recovered1.toLowerCase() === this.wallet.address.toLowerCase()
    };
  }

  // 检查账户实现
  async checkAccountImplementation() {
    console.log('\n🔍 检查账户实现');

    try {
      // 获取账户代码
      const code = await this.provider.getCode(CONFIG.SENDER);
      console.log('账户代码长度:', code.length, '字节');

      if (code === '0x') {
        console.log('❌ 账户不存在');
        return false;
      }

      // 检查是否包含标准的SimpleAccount函数签名
      const hasValidateUserOp = code.includes('0d6c944a'); // validateUserOp函数签名
      const hasExecute = code.includes('0xb61d27f6'); // execute函数签名

      console.log('包含validateUserOp:', hasValidateUserOp ? '✅' : '❌');
      console.log('包含execute:', hasExecute ? '✅' : '❌');

      if (!hasValidateUserOp || !hasExecute) {
        console.log('⚠️ 这可能不是标准的SimpleAccount实现');
        console.log('建议: 使用标准的SimpleAccount合约');
      }

      return hasValidateUserOp && hasExecute;

    } catch (error) {
      console.log('检查账户实现失败:', error.message);
      return false;
    }
  }

  async runVerification() {
    console.log('🚀 SimpleAccount签名验证测试');

    try {
      // 1. 检查账户实现
      const isStandard = await this.checkAccountImplementation();

      // 2. 测试签名方法
      const result = await this.testSignatureMethods();

      console.log('\n📊 测试结果总结');
      console.log('================');
      console.log(`标准SimpleAccount: ${isStandard ? '✅' : '❌'}`);
      console.log(`本地签名验证: ${result.valid ? '✅' : '❌'}`);

      if (!isStandard) {
        console.log('\n💡 问题诊断:');
        console.log('1. 我们使用的账户可能不是标准的SimpleAccount');
        console.log('2. 这会导致bundler签名验证失败');
        console.log('3. 解决方案: 使用标准的SimpleAccount实现');
      }

      if (!result.valid) {
        console.log('\n❌ 签名验证失败，需要修复签名生成逻辑');
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
