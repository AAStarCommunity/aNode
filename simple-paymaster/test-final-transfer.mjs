#!/usr/bin/env node

/**
 * 最终完整转账测试
 * 使用指定的参数进行实际的ERC-4337转账
 */

import { ethers } from 'ethers';

// 测试配置
const CONFIG = {
  // 账户
  SENDER: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6', // SimpleAccount A
  RECEIVER: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854', // SimpleAccount B
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',

  // 合约地址
  ENTRYPOINT_V06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  ENTRYPOINT_V07: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  PNT_CONTRACT: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  PAYMASTER_CONTRACT: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',

  // 转账金额
  TRANSFER_AMOUNT: '0.005', // 0.005 PNTs

  // RPC
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',
  ALCHEMY_API_KEY: 'Bx4QRW1-vnwJUePSAAD7N',

  // Paymaster服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process'
};

class FinalTransferTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);

    // Alchemy bundler URL
    this.alchemyBundlerUrl = `https://eth-sepolia.g.alchemy.com/v2/${CONFIG.ALCHEMY_API_KEY}`;
    this.alchemyBundler = new ethers.JsonRpcProvider(this.alchemyBundlerUrl);

    // ERC20 ABI
    this.erc20Abi = [
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function transfer(address to, uint256 amount) returns (bool)'
    ];
  }

  async checkBalances() {
    console.log('📊 检查账户余额...');

    const tokenContract = new ethers.Contract(CONFIG.PNT_CONTRACT, this.erc20Abi, this.provider);
    const decimals = await tokenContract.decimals();

    const balanceA = await tokenContract.balanceOf(CONFIG.SENDER);
    const balanceB = await tokenContract.balanceOf(CONFIG.RECEIVER);

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

  async generateUserOperation(balances, entryPointVersion) {
    console.log(`🔧 生成 UserOperation (EntryPoint ${entryPointVersion})...`);

    const tokenContract = new ethers.Contract(CONFIG.PNT_CONTRACT, this.erc20Abi, this.provider);

    // ERC20 transfer call data
    const transferData = tokenContract.interface.encodeFunctionData('transfer', [
      CONFIG.RECEIVER,
      balances.transferAmount
    ]);

    // SimpleAccount execute call data
    const executeData = ethers.concat([
      CONFIG.PNT_CONTRACT, // to
      ethers.zeroPadValue(ethers.toBeHex(0), 32), // value
      ethers.zeroPadValue(ethers.toBeHex(transferData.length), 32), // data length
      transferData // data
    ]);

    // 获取nonce - 直接从账户合约查询
    let nonce = '0x0';
    try {
      console.log('📡 从账户合约获取nonce...');

      // SimpleAccount nonce函数
      const accountAbi = ['function getNonce() view returns (uint256)'];
      const accountContract = new ethers.Contract(CONFIG.SENDER, accountAbi, this.provider);
      const accountNonce = await accountContract.getNonce();

      nonce = ethers.toBeHex(accountNonce);
      console.log(`✅ 当前 nonce: ${nonce} (dec: ${accountNonce})`);
    } catch (error) {
      console.log('⚠️ 无法获取nonce，使用默认值 0x0');
      console.log('错误:', error.message);
    }

    const userOp = {
      sender: CONFIG.SENDER,
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

    console.log(`✅ UserOperation 生成完成`);
    return userOp;
  }

  async processWithPaymaster(userOp, entryPointVersion) {
    console.log('🎯 通过 Paymaster 服务处理...');

    const requestBody = {
      entryPointVersion: entryPointVersion,
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

  // 计算UserOpHash (EntryPoint标准)
  getUserOpHash(userOp, entryPointAddress) {
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
    return ethers.keccak256(ethers.concat([userOpHash, entryPointAddress]));
  }

  // 签名UserOp (SimpleAccount方式)
  async signUserOp(userOp, entryPointAddress) {
    const userOpHash = this.getUserOpHash(userOp, entryPointAddress);
    const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    return signature;
  }

  async submitToAlchemy(userOp, entryPointVersion) {
    console.log('🚀 提交到 Alchemy Bundler...');

    const entryPointAddress = entryPointVersion === '0.6' ? CONFIG.ENTRYPOINT_V06 : CONFIG.ENTRYPOINT_V07;

    console.log(`最终 UserOperation 摘要:`);
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.RECEIVER}`);
    console.log(`- 转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- EntryPoint: ${entryPointAddress} (v${entryPointVersion})`);
    console.log(`- Nonce: ${userOp.nonce}`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData.substring(0, 66)}...`);

    try {
      const result = await this.alchemyBundler.send('eth_sendUserOperation', [
        userOp,
        entryPointAddress
      ]);

      console.log(`🎉 交易提交成功!`);
      console.log(`UserOperation Hash: ${result}`);

      // 等待确认
      console.log('⏳ 等待交易确认...');

      let attempts = 0;
      const maxAttempts = 60; // 最多等待60次 (大约5分钟)

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`检查状态 (${attempts}/${maxAttempts})...`);

        try {
          const receipt = await this.alchemyBundler.send('eth_getUserOperationReceipt', [result]);

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
                gasUsed: receipt.receipt.gasUsed,
                status: receipt.receipt.status
              };
            } else {
              console.log('\n❌ 交易执行失败');
              return {
                success: false,
                userOpHash: result,
                error: 'Transaction failed',
                receipt
              };
            }
          }
        } catch (error) {
          console.log(`查询失败: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
      }

      console.log('⚠️ 交易可能仍在处理中');
      return { success: true, pending: true, userOpHash: result };

    } catch (error) {
      console.error(`❌ 提交失败:`, error.message);

      // 解析具体错误
      if (error.message.includes('Invalid UserOperation signature')) {
        console.log('💡 签名验证失败 - 可能是paymaster签名问题');
      } else if (error.message.includes('AA25')) {
        console.log('💡 AA25错误: nonce问题');
      } else if (error.message.includes('entity stake')) {
        console.log('💡 Stake问题: EntryPoint unstakeDelay检查');
        console.log('⚠️  这可能是因为EntryPoint v0.6的unstakeDelay总是1秒的问题');
      }

      return { success: false, error: error.message };
    }
  }

  async testEntryPointVersion(entryPointVersion) {
    console.log(`\n🧪 测试 EntryPoint ${entryPointVersion}`);
    console.log('=' * 50);

    try {
      // 1. 检查余额
      const balances = await this.checkBalances();

      // 2. 生成UserOperation
      const userOp = await this.generateUserOperation(balances, entryPointVersion);

      // 3. Paymaster处理
      const processedUserOp = await this.processWithPaymaster(userOp, entryPointVersion);

      // 4. 签名
      const entryPointAddress = entryPointVersion === '0.6' ? CONFIG.ENTRYPOINT_V06 : CONFIG.ENTRYPOINT_V07;
      const signature = await this.signUserOp(processedUserOp, entryPointAddress);
      processedUserOp.signature = signature;

      console.log('✍️ UserOperation签名完成');

      // 5. 提交到Alchemy
      const result = await this.submitToAlchemy(processedUserOp, entryPointVersion);

      return result;

    } catch (error) {
      console.error(`❌ EntryPoint ${entryPointVersion} 测试失败:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async runCompleteTest() {
    console.log('🚀 ERC-4337 完整转账测试');
    console.log('==============================');
    console.log(`发送方: ${CONFIG.SENDER} (SimpleAccount A)`);
    console.log(`接收方: ${CONFIG.RECEIVER} (SimpleAccount B)`);
    console.log(`转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`Paymaster: ${CONFIG.PAYMASTER_CONTRACT}`);
    console.log(`RPC: Alchemy Sepolia`);
    console.log('');

    const results = {};

    // 测试EntryPoint v0.6
    console.log('📋 测试 1: EntryPoint v0.6');
    results.v06 = await this.testEntryPointVersion('0.6');

    if (results.v06.success && results.v06.txHash) {
      console.log(`\n🎉 EntryPoint v0.6 测试成功!`);
      console.log(`交易哈希: ${results.v06.txHash}`);
      return results.v06; // 返回成功的交易
    }

    // 如果v0.6失败，尝试v0.7
    console.log('\n📋 测试 2: EntryPoint v0.7 (备选)');
    results.v07 = await this.testEntryPointVersion('0.7');

    if (results.v07.success && results.v07.txHash) {
      console.log(`\n🎉 EntryPoint v0.7 测试成功!`);
      console.log(`交易哈希: ${results.v07.txHash}`);
      return results.v07; // 返回成功的交易
    }

    // 如果都失败，返回最后的结果
    console.log('\n❌ 所有测试都失败了');
    console.log('v0.6 结果:', results.v06);
    console.log('v0.7 结果:', results.v07);

    return {
      success: false,
      error: 'All tests failed',
      results
    };
  }
}

// 运行完整测试
const tester = new FinalTransferTester();
tester.runCompleteTest().then(result => {
  console.log('\n📊 最终测试结果:');
  console.log('================');
  if (result.success) {
    console.log('✅ 测试成功!');
    console.log(`UserOperation Hash: ${result.userOpHash}`);
    console.log(`交易哈希: ${result.txHash}`);
    console.log(`区块号: ${result.blockNumber}`);
    console.log(`Gas使用: ${result.gasUsed}`);
  } else {
    console.log('❌ 测试失败:', result.error);
  }
}).catch(console.error);
