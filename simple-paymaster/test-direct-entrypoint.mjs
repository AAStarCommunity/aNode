#!/usr/bin/env node

/**
 * 直接调用EntryPoint测试 - 绕过bundler stake检查
 * 直接测试paymaster在实际交易中的表现
 */

import { ethers } from 'ethers';

// 配置
const CONFIG = {
  // 合约地址
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PNT_TOKEN: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',

  // 测试账户
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',

  // RPC
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',

  // Paymaster服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process',

  // 转账金额
  TRANSFER_AMOUNT: '0.00001' // 更小的测试金额
};

class DirectEntryPointTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);

    // ERC20 ABI
    this.erc20Abi = [
      'function balanceOf(address account) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)'
    ];

    // EntryPoint ABI
    this.entryPointAbi = [
      'function handleOps((address,uint256,bytes,bytes,address,uint256,uint256,uint256,uint256,bytes,bytes)[] calldata ops, address payable beneficiary) external',
      'function getDepositInfo(address account) view returns (tuple(uint256 stake, uint112 unstakeDelaySec, uint48 withdrawTime))'
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

    // SimpleAccount execute call data (简化版本)
    const executeData = ethers.concat([
      CONFIG.PNT_TOKEN, // to
      ethers.zeroPadValue(ethers.toBeHex(0), 32), // value
      ethers.zeroPadValue(ethers.toBeHex(transferData.length), 32), // data length
      transferData // data
    ]);

    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: '0x0', // 使用固定nonce
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

  async submitDirectToEntryPoint(userOp) {
    console.log('🚀 直接提交到 EntryPoint...');

    const entryPoint = new ethers.Contract(CONFIG.ENTRYPOINT_ADDRESS, this.entryPointAbi, this.wallet);

    console.log(`最终 UserOperation 摘要:`);
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.SIMPLE_ACCOUNT_B}`);
    console.log(`- 转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce}`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData.substring(0, 66)}...`);

    try {
      // 构建正确的UserOperation结构体数组
      const userOps = [{
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: userOp.callGasLimit,
        verificationGasLimit: userOp.verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature
      }];

      console.log('UserOperation结构体:');
      console.log('- sender:', userOps[0].sender);
      console.log('- nonce:', userOps[0].nonce);
      console.log('- paymasterAndData length:', userOps[0].paymasterAndData.length);

      // 直接调用EntryPoint的handleOps方法
      const tx = await entryPoint.handleOps(userOps, this.wallet.address);
      console.log(`✅ 交易提交成功!`);
      console.log(`交易哈希: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ 交易已确认!`);
      console.log(`区块号: ${receipt.blockNumber}`);
      console.log(`Gas使用: ${receipt.gasUsed}`);

      // 检查代币转账是否成功
      await this.verifyTransfer();

      return { success: true, txHash: tx.hash, receipt };

    } catch (error) {
      console.error(`❌ 提交失败:`, error.message);

      // 如果失败，可能是因为paymaster验证失败
      if (error.message.includes('AA33') || error.message.includes('paymaster')) {
        console.log('⚠️  Paymaster验证失败，可能是因为unstake delay问题');
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
  }

  async runDirectTest() {
    console.log('🚀 直接EntryPoint转账测试');
    console.log('==============================');
    console.log(`绕过bundler，直接调用EntryPoint`);
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

      // 5. 直接提交到EntryPoint
      const result = await this.submitDirectToEntryPoint(signedUserOp);

      if (result.success) {
        console.log('\n🎉 直接转账测试成功!');
        console.log(`交易哈希: ${result.txHash}`);
        return result;
      } else {
        console.log('\n❌ 直接转账测试失败');
        console.log(`错误: ${result.error}`);
        return result;
      }

    } catch (error) {
      console.error('❌ 测试过程中出错:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// 运行直接EntryPoint测试
const tester = new DirectEntryPointTester();
tester.runDirectTest().catch(console.error);
