#!/usr/bin/env node

/**
 * 直接测试SimpleAccount的execute功能
 */

import { ethers } from 'ethers';

const CONFIG = {
  SENDER_A: '0x63544c8Aa95cBa5bb4F2182FC2184CE3023Ae259',
  RECEIVER_B: '0x3F27A0C11033eF96a3B0a9ee479A23C7C739D5A8',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  PNT_CONTRACT: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  TRANSFER_AMOUNT: '0.001', // 减少到0.001 PNT进行测试
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'
};

const SIMPLE_ACCOUNT_ABI = [
  'function nonce() view returns (uint256)',
  'function getNonce() view returns (uint256)',
  'function execute(address dest, uint256 value, bytes calldata func)',
  'function owner() view returns (address)'
];

class SimpleAccountDirectTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
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

  async testSimpleAccountExecute() {
    console.log('🔧 测试SimpleAccount execute功能...');

    const simpleAccount = new ethers.Contract(CONFIG.SENDER_A, SIMPLE_ACCOUNT_ABI, this.wallet);

    // ERC20 transfer数据
    const tokenInterface = new ethers.Interface([
      'function transfer(address,uint256) returns (bool)'
    ]);

    const transferAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, 18);
    const transferData = tokenInterface.encodeFunctionData('transfer', [
      CONFIG.RECEIVER_B,
      transferAmount
    ]);

    console.log(`转账金额: ${CONFIG.TRANSFER_AMOUNT} PNT (${transferAmount.toString()} wei)`);
    console.log(`Transfer data: ${transferData}`);

    try {
      // 直接调用SimpleAccount的execute函数
      console.log('🚀 执行转账...');
      const tx = await simpleAccount.execute(
        CONFIG.PNT_CONTRACT, // to
        0, // value
        transferData // data
      );

      console.log(`交易已提交: ${tx.hash}`);
      console.log('⏳ 等待确认...');

      const receipt = await tx.wait();
      console.log(`✅ 交易成功!`);
      console.log(`区块号: ${receipt.blockNumber}`);
      console.log(`Gas使用: ${receipt.gasUsed}`);

      return tx.hash;
    } catch (error) {
      console.error('❌ 执行失败:', error.message);
      return null;
    }
  }

  async runDirectTest() {
    console.log('🚀 直接SimpleAccount转账测试');
    console.log('================================');

    try {
      // 检查余额
      await this.checkBalances();

      // 执行转账
      const txHash = await this.testSimpleAccountExecute();

      if (txHash) {
        console.log('\n🎯 测试成功!');
        console.log(`交易哈希: ${txHash}`);

        // 再次检查余额确认转账成功
        console.log('\n📊 验证转账结果...');
        await this.checkBalances();

        return txHash;
      } else {
        console.log('\n❌ 测试失败');
        return null;
      }

    } catch (error) {
      console.error('❌ 测试过程中出错:', error.message);
      return null;
    }
  }
}

// 运行测试
const tester = new SimpleAccountDirectTester();
tester.runDirectTest().then(result => {
  if (result) {
    console.log('\n🎯 最终结果: 交易Hash =', result);
  } else {
    console.log('\n❌ 测试未完成');
  }
}).catch(console.error);
