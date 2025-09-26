#!/usr/bin/env node

/**
 * 调试UserOperation格式问题
 */

import { ethers } from 'ethers';

const CONFIG = {
  SENDER_A: '0x63544c8Aa95cBa5bb4F2182FC2184CE3023Ae259',
  RECEIVER_B: '0x3F27A0C11033eF96a3B0a9ee479A23C7C739D5A8',
  PNT_CONTRACT: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  PAYMASTER_CONTRACT: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',
  ENTRYPOINT_V06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  TRANSFER_AMOUNT: '0.005',
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'
};

class UserOpFormatDebugger {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  }

  async analyzeCallData() {
    console.log('🔍 分析callData格式...');

    // ERC20 transfer数据
    const tokenInterface = new ethers.Interface([
      'function transfer(address,uint256) returns (bool)'
    ]);

    const transferAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, 18);
    const transferData = tokenInterface.encodeFunctionData('transfer', [
      CONFIG.RECEIVER_B,
      transferAmount
    ]);

    console.log('✅ Transfer数据:');
    console.log('  转账金额 (wei):', transferAmount.toString());
    console.log('  接收者:', CONFIG.RECEIVER_B);
    console.log('  Transfer data:', transferData);
    console.log('  Transfer data长度:', transferData.length);

    // SimpleAccount execute数据 - 这是问题的关键
    const executeData = ethers.concat([
      CONFIG.PNT_CONTRACT, // to (20 bytes)
      ethers.zeroPadValue(ethers.toBeHex(0), 32), // value (32 bytes)
      ethers.zeroPadValue(ethers.toBeHex(transferData.length), 32), // data length (32 bytes)
      transferData // data (variable)
    ]);

    console.log('\n✅ Execute callData:');
    console.log('  To address:', CONFIG.PNT_CONTRACT);
    console.log('  Value: 0');
    console.log('  Data length:', transferData.length);
    console.log('  Full executeData:', executeData);
    console.log('  Full executeData长度:', executeData.length);

    // 检查executeData的格式是否正确
    const toAddress = executeData.slice(0, 42); // 0x + 40 chars
    const value = executeData.slice(42, 106); // next 32 bytes
    const dataLength = executeData.slice(106, 170); // next 32 bytes
    const actualData = executeData.slice(170); // remaining

    console.log('\n🔧 解析executeData:');
    console.log('  To (20 bytes):', toAddress);
    console.log('  Value (32 bytes):', value);
    console.log('  Data length (32 bytes):', dataLength, '(期望:', ethers.toBeHex(transferData.length), ')');
    console.log('  Actual data:', actualData);
    console.log('  Actual data matches transferData:', actualData === transferData);

    return { executeData, transferData };
  }

  async analyzePaymasterData() {
    console.log('\n🔍 分析paymasterAndData格式...');

    // 模拟从paymaster服务返回的数据
    const mockPaymasterAndData = '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51000000000000000000000000fe8571368e58c5fb29f8f4ff2ba6b5793feca8fedd6e1b8d54fc7a38f02885be4eec97f3b42479a2d95370e971b748dd475d0b17b836756895ba880ad863374b1b';

    console.log('PaymasterAndData:', mockPaymasterAndData);
    console.log('长度:', mockPaymasterAndData.length, '字符 (期望偶数)');

    // 检查长度是否为偶数
    const isEvenLength = mockPaymasterAndData.length % 2 === 0;
    console.log('长度是否偶数:', isEvenLength);

    if (!isEvenLength) {
      console.log('❌ paymasterAndData长度不是偶数，这会导致错误');
      return false;
    }

    // 解析paymasterAndData结构
    const paymasterAddress = mockPaymasterAndData.slice(0, 42); // 0x + 40 chars
    const validUntil = mockPaymasterAndData.slice(42, 106); // next 32 bytes
    const validAfter = mockPaymasterAndData.slice(106, 170); // next 32 bytes
    const signature = mockPaymasterAndData.slice(170); // remaining

    console.log('\n🔧 解析paymasterAndData:');
    console.log('  Paymaster address:', paymasterAddress);
    console.log('  Valid until (32 bytes):', validUntil);
    console.log('  Valid after (32 bytes):', validAfter);
    console.log('  Signature (65 bytes):', signature);
    console.log('  Signature长度:', signature.length / 2, '字节 (期望65字节)');

    // 检查signature长度 (130 hex chars = 65 bytes)
    if (signature.length !== 130) {
      console.log('❌ 签名长度不正确，期望130个十六进制字符 (65字节)');
      return false;
    }

    return true;
  }

  async checkUserOpStructure() {
    console.log('\n🔍 检查完整UserOperation结构...');

    const { executeData } = await this.analyzeCallData();

    const userOp = {
      sender: CONFIG.SENDER_A,
      nonce: '0x0',
      initCode: '0x',
      callData: executeData,
      callGasLimit: '0x493e0', // 300000
      verificationGasLimit: '0x186a0', // 100000
      preVerificationGas: '0xb5fc', // 46588
      maxFeePerGas: '0x59682f00', // 1500000000
      maxPriorityFeePerGas: '0x59682f00', // 1500000000
      paymasterAndData: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51000000000000000000000000fe8571368e58c5fb29f8f4ff2ba6b5793feca8fedd6e1b8d54fc7a38f02885be4eec97f3b42479a2d95370e971b748dd475d0b17b836756895ba880ad863374b1b',
      signature: '0x8a56f3bff78bc760b184b8e65d0dc334bdbc6938ed20167920c472d7bb5d39511d117bf10e2d4015a74380abd59b8e5cc2bc29157e73ee7cb1139062cfc5f0e11c'
    };

    console.log('完整UserOperation:');
    Object.keys(userOp).forEach(key => {
      const value = userOp[key];
      console.log(`  ${key}: ${typeof value === 'string' && value.startsWith('0x') ? value.substring(0, 66) + '...' : value}`);
    });

    // 检查所有字段都是有效的十六进制字符串
    console.log('\n🔧 字段验证:');
    Object.keys(userOp).forEach(key => {
      const value = userOp[key];
      if (typeof value === 'string') {
        const isHex = /^0x[0-9a-fA-F]*$/.test(value);
        const isEvenLength = value.length % 2 === 0;
        console.log(`  ${key}: ${isHex ? '✅' : '❌'} hex, ${isEvenLength ? '✅' : '❌'} even length`);
      }
    });

    return userOp;
  }

  async runDebug() {
    console.log('🚀 UserOperation格式调试');
    console.log('==============================');

    try {
      await this.analyzeCallData();
      await this.analyzePaymasterData();
      const userOp = await this.checkUserOpStructure();

      console.log('\n🎯 调试完成');

      // 提供修复建议
      console.log('\n💡 可能的修复方案:');
      console.log('1. 检查callData格式 - SimpleAccount execute调用可能格式错误');
      console.log('2. 验证paymasterAndData长度 - 确保所有字段正确填充');
      console.log('3. 检查所有十六进制字符串长度 - 必须为偶数');
      console.log('4. 尝试使用更简单的callData格式');

    } catch (error) {
      console.error('❌ 调试过程中出错:', error.message);
    }
  }
}

// 运行调试
const debugger_ = new UserOpFormatDebugger();
debugger_.runDebug();
