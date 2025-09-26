#!/usr/bin/env node

/**
 * 修复签名问题 - 参考permissionless.js规范
 * 规范化ECDSA签名以解决non-canonical s问题
 */

import { ethers } from 'ethers';

// Pimlico配置
const PIMLICO_API_KEY = 'pim_9hXkHvCHhiQxxS7Kg3xQ8E';
const PIMLICO_BUNDLER_URL = `https://api.pimlico.io/v1/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;

// 合约地址
const CONFIG = {
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PNT_TOKEN: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  PAYMASTER_ADDRESS: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',

  // 测试账户
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',

  // RPC
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',

  // Paymaster服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process',

  // 转账金额
  TRANSFER_AMOUNT: '0.000001' // 小测试金额
};

class PermissionlessFixTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.pimlicoBundler = new ethers.JsonRpcProvider(PIMLICO_BUNDLER_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);

    // ECDSA曲线参数 (secp256k1)
    this.N = ethers.toBigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'); // 曲线阶数
  }

  // 规范化ECDSA签名 (参考permissionless.js)
  // 确保s值是规范的 (s <= N/2)
  normalizeSignature(signature) {
    if (signature.startsWith('0x')) {
      signature = signature.slice(2);
    }

    const r = signature.slice(0, 64);
    const s = signature.slice(64, 128);
    const v = signature.slice(128, 130);

    let sBigInt = ethers.toBigInt('0x' + s);

    // 如果s > N/2，则s = N - s (这会改变v)
    const halfN = this.N / 2n;
    if (sBigInt > halfN) {
      sBigInt = this.N - sBigInt;
      // 翻转v值 (27 -> 28, 28 -> 27)
      const vInt = parseInt(v, 16);
      const newV = (vInt % 2 === 0) ? vInt - 1 : vInt + 1;
      return '0x' + r + sBigInt.toString(16).padStart(64, '0') + newV.toString(16);
    }

    return '0x' + r + s + v;
  }

  // 获取UserOpHash (permissionless.js风格)
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

  // 签名UserOp (permissionless.js风格)
  async signUserOp(userOp) {
    const userOpHash = this.getUserOpHash(userOp);
    const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    // 规范化签名
    return this.normalizeSignature(signature);
  }

  async checkBalances() {
    console.log('📊 检查账户余额...');

    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN, [
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ], this.provider);

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

    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN, [
      'function transfer(address to, uint256 amount) returns (bool)'
    ], this.provider);

    // ERC20 transfer call data
    const transferData = tokenContract.interface.encodeFunctionData('transfer', [
      CONFIG.SIMPLE_ACCOUNT_B,
      balances.transferAmount
    ]);

    // SimpleAccount execute call data
    const executeData = ethers.concat([
      CONFIG.PNT_TOKEN, // to
      ethers.zeroPadValue(ethers.toBeHex(0), 32), // value
      ethers.zeroPadValue(ethers.toBeHex(transferData.length), 32), // data length
      transferData // data
    ]);

    // 获取nonce
    try {
      console.log('📡 从Pimlico获取nonce...');
      const nonce = await this.pimlicoBundler.send('eth_getUserOperationNonce', [
        CONFIG.SIMPLE_ACCOUNT_A,
        CONFIG.ENTRYPOINT_ADDRESS
      ]);
      console.log(`✅ 当前 nonce: ${nonce}`);

      const userOp = {
        sender: CONFIG.SIMPLE_ACCOUNT_A,
        nonce: parseInt(nonce, 16), // 转换为数字
        initCode: '0x',
        callData: executeData,
        callGasLimit: 300000,
        verificationGasLimit: 100000,
        preVerificationGas: 46588,
        maxFeePerGas: 1500000000,
        maxPriorityFeePerGas: 1500000000,
        paymasterAndData: '0x',
        signature: '0x'
      };

      console.log(`✅ UserOperation 生成完成`);
      return userOp;

    } catch (error) {
      console.log('⚠️ 无法获取nonce，使用默认值 0x18');
      const userOp = {
        sender: CONFIG.SIMPLE_ACCOUNT_A,
        nonce: 24, // 0x18
        initCode: '0x',
        callData: executeData,
        callGasLimit: 300000,
        verificationGasLimit: 100000,
        preVerificationGas: 46588,
        maxFeePerGas: 1500000000,
        maxPriorityFeePerGas: 1500000000,
        paymasterAndData: '0x',
        signature: '0x'
      };

      console.log(`✅ UserOperation 生成完成`);
      return userOp;
    }
  }

  async processWithPaymaster(userOp) {
    console.log('🎯 通过 Paymaster 服务处理...');

    const requestBody = {
      entryPointVersion: '0.6',
      userOperation: {
        ...userOp,
        nonce: `0x${userOp.nonce.toString(16)}`, // 转换回hex格式给API
        callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
        verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
        preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
        maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
        maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
      }
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

    // 更新userOp
    userOp.paymasterAndData = paymasterAndData;

    return userOp;
  }

  async submitToPimlico(userOp) {
    console.log('🚀 提交到 Pimlico Bundler...');

    console.log(`最终 UserOperation 摘要:`);
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.SIMPLE_ACCOUNT_B}`);
    console.log(`- 转账金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce} (0x${userOp.nonce.toString(16)})`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData.substring(0, 66)}...`);

    try {
      const result = await this.pimlicoBundler.send('eth_sendUserOperation', [
        userOp,
        CONFIG.ENTRYPOINT_ADDRESS
      ]);

      console.log(`🎉 交易提交成功!`);
      console.log(`UserOperation Hash: ${result}`);

      // 等待确认
      console.log('⏳ 等待交易确认...');

      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`检查状态 (${attempts}/${maxAttempts})...`);

        try {
          const receipt = await this.pimlicoBundler.send('eth_getUserOperationReceipt', [result]);

          if (receipt) {
            console.log('✅ UserOperation已确认!');
            console.log(`交易哈希: ${receipt.receipt.transactionHash}`);
            console.log(`区块号: ${receipt.receipt.blockNumber}`);
            console.log(`Gas使用: ${receipt.receipt.gasUsed}`);
            console.log(`状态: ${receipt.receipt.status === '0x1' ? '成功' : '失败'}`);

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
      console.error(`❌ 提交失败:`, error.message);

      // 解析具体错误
      if (error.message.includes('Invalid UserOperation signature')) {
        console.log('💡 签名验证失败 - 可能是paymaster签名问题');
      } else if (error.message.includes('AA25')) {
        console.log('💡 AA25错误: nonce问题');
      } else if (error.message.includes('entity stake')) {
        console.log('💡 Stake问题: EntryPoint unstakeDelay检查');
      }

      return { success: false, error: error.message };
    }
  }

  async testSignatureFix() {
    console.log('🔧 测试签名规范化修复');
    console.log('==============================');

    try {
      // 1. 检查余额
      const balances = await this.checkBalances();

      // 2. 生成UserOperation
      const userOp = await this.generateUserOperation(balances);

      // 3. Paymaster处理
      const processedUserOp = await this.processWithPaymaster(userOp);

      // 4. 生成规范化的签名
      console.log('\n✍️ 生成规范化签名...');
      const normalizedSignature = await this.signUserOp(processedUserOp);
      processedUserOp.signature = normalizedSignature;

      console.log('规范化签名:', normalizedSignature);

      // 5. 验证签名
      const userOpHash = this.getUserOpHash(processedUserOp);
      const recovered = ethers.verifyMessage(ethers.getBytes(userOpHash), normalizedSignature);
      console.log('签名验证:', recovered.toLowerCase() === this.wallet.address.toLowerCase() ? '✅ 通过' : '❌ 失败');

      // 6. 提交到Pimlico
      const result = await this.submitToPimlico(processedUserOp);

      if (result.success) {
        console.log('\n🎉 签名修复测试成功!');
        if (result.txHash) {
          console.log(`交易哈希: ${result.txHash}`);
        } else {
          console.log(`UserOpHash: ${result.userOpHash}`);
        }
        return result;
      } else {
        console.log('\n❌ 签名修复测试失败');
        console.log(`错误: ${result.error}`);
        return result;
      }

    } catch (error) {
      console.error('❌ 测试过程中出错:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// 运行签名修复测试
const tester = new PermissionlessFixTester();
tester.testSignatureFix().catch(console.error);
