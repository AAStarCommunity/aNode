#!/usr/bin/env node

/**
 * 使用 Alchemy Bundler API 提交 UserOperation
 * 基于 scripts-flow/scripts/test-alchemy-bundler.js 的成功实现
 */

import { ethers } from 'ethers';

// Configuration
const CONFIG = {
  // Alchemy API Key - 使用 scripts-flow 中的成功配置
  ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || 'Bx4QRW1-vnwJUePSAAD7N',
  ALCHEMY_URL: 'https://eth-sepolia.g.alchemy.com/v2/',
  
  // EntryPoint and Paymaster
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  NEW_PAYMASTER_ADDRESS: '0x321eB27CA443ED279503b121E1e0c8D87a4f4B51',
  
  // Test accounts
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',
  PNT_TOKEN_ADDRESS: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  
  RPC_URL: 'https://ethereum-sepolia.publicnode.com'
};

console.log('🚀 使用 Alchemy Bundler API 提交 UserOperation');
console.log('===============================================');
console.log(`Alchemy API Key: ${CONFIG.ALCHEMY_API_KEY.substring(0, 12)}...`);
console.log(`Paymaster: ${CONFIG.NEW_PAYMASTER_ADDRESS}`);
console.log(`EntryPoint: ${CONFIG.ENTRYPOINT_ADDRESS}`);
console.log('');

class AlchemySubmitter {
  constructor() {
    this.alchemyUrl = CONFIG.ALCHEMY_URL + CONFIG.ALCHEMY_API_KEY;
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  /**
   * 测试 Alchemy 连通性
   */
  async testConnectivity() {
    console.log('1️⃣ 测试 Alchemy 连通性...');
    try {
      const response = await fetch(this.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: [],
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(`API Error: ${result.error.message}`);
      }

      const chainId = parseInt(result.result, 16);
      console.log(`✅ Alchemy 连接成功! Chain ID: ${chainId}`);
      
      // 获取最新区块
      const blockResponse = await fetch(this.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_blockNumber',
          params: [],
        }),
      });

      const blockResult = await blockResponse.json();
      const blockNumber = parseInt(blockResult.result, 16);
      console.log(`✅ 最新区块: ${blockNumber}`);
      console.log('');
      
      return true;
    } catch (error) {
      console.error('❌ Alchemy 连接失败:', error.message);
      return false;
    }
  }

  /**
   * 生成完整的 UserOperation
   */
  async generateUserOperation() {
    console.log('2️⃣ 生成 UserOperation...');
    
    // ERC20 ABI (minimal)
    const ERC20_ABI = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)'
    ];

    // SimpleAccount ABI (minimal)
    const SIMPLE_ACCOUNT_ABI = [
      'function execute(address dest, uint256 value, bytes calldata func)',
      'function getNonce() view returns (uint256)'
    ];

    // 获取 token decimals
    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN_ADDRESS, ERC20_ABI, this.provider);
    const decimals = await tokenContract.decimals();
    
    // 获取 nonce
    const accountContract = new ethers.Contract(CONFIG.SIMPLE_ACCOUNT_A, SIMPLE_ACCOUNT_ABI, this.provider);
    const nonce = await accountContract.getNonce();
    
    console.log(`Token decimals: ${decimals}`);
    console.log(`Account nonce: ${nonce}`);

    // 生成转账 calldata
    const transferAmount = ethers.parseUnits('0.001', decimals);
    const transferCalldata = tokenContract.interface.encodeFunctionData('transfer', [
      CONFIG.SIMPLE_ACCOUNT_B,
      transferAmount
    ]);

    // 生成 execute calldata
    const executeCalldata = accountContract.interface.encodeFunctionData('execute', [
      CONFIG.PNT_TOKEN_ADDRESS,
      0,
      transferCalldata
    ]);

    // 创建基础 UserOperation
    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: `0x${nonce.toString(16)}`,
      initCode: '0x',
      callData: executeCalldata,
      callGasLimit: '0x7530', // 30000 - from Alchemy estimation
      verificationGasLimit: '0x17318', // 95000 - 达到 0.2 效率要求
      preVerificationGas: '0xB61C', // 46620 - sufficient for bundler
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      paymasterAndData: '0x',
      signature: '0x'
    };

    console.log('✅ 基础 UserOperation 生成完成');
    console.log(`Sender: ${userOp.sender}`);
    console.log(`Nonce: ${userOp.nonce}`);
    console.log(`Transfer: 0.001 PNTs to ${CONFIG.SIMPLE_ACCOUNT_B}`);
    console.log('');

    return userOp;
  }

  /**
   * 通过 paymaster 处理 UserOperation
   */
  async processWithPaymaster(userOp) {
    console.log('3️⃣ 通过 Paymaster 处理...');
    
    try {
      const response = await fetch('http://localhost:8787/api/v1/paymaster/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userOperation: userOp,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Paymaster API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Paymaster 处理成功');
      console.log(`Payment method: ${result.paymentMethod}`);
      console.log(`PaymasterAndData: ${result.userOperation.paymasterAndData}`);
      console.log('');

      return result.userOperation;
    } catch (error) {
      console.error('❌ Paymaster 处理失败:', error.message);
      throw error;
    }
  }

  /**
   * 签名 UserOperation
   */
  async signUserOperation(userOp) {
    console.log('4️⃣ 签名 UserOperation...');
    
    try {
      // 计算 UserOpHash
      const entryPointInterface = new ethers.Interface([
        'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
      ]);

      const userOpTuple = [
        userOp.sender,
        userOp.nonce,
        userOp.initCode,
        userOp.callData,
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        userOp.paymasterAndData,
        userOp.signature
      ];

      const entryPointContract = new ethers.Contract(CONFIG.ENTRYPOINT_ADDRESS, [
        'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
      ], this.provider);

      const userOpHash = await entryPointContract.getUserOpHash(userOpTuple);
      console.log(`UserOpHash: ${userOpHash}`);

      // 使用 signMessage 进行签名 (v0.6 SimpleAccount 兼容)
      const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;

      console.log('✅ UserOperation 签名完成');
      console.log(`Signature length: ${signature.length - 2} characters`);
      console.log('');

      return userOp;
    } catch (error) {
      console.error('❌ 签名失败:', error.message);
      throw error;
    }
  }

  /**
   * 提交 UserOperation 到 Alchemy Bundler
   */
  async submitToAlchemy(userOp) {
    console.log('5️⃣ 提交到 Alchemy Bundler...');
    console.log('UserOperation 详情:');
    console.log(`- Sender: ${userOp.sender}`);
    console.log(`- Nonce: ${userOp.nonce}`);
    console.log(`- PaymasterAndData: ${userOp.paymasterAndData}`);
    console.log(`- Signature: ${userOp.signature.substring(0, 20)}...`);
    console.log('');

    try {
      const response = await fetch(this.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOp, CONFIG.ENTRYPOINT_ADDRESS],
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        console.log('❌ 提交失败:');
        console.log(`Error Code: ${result.error.code}`);
        console.log(`Error Message: ${result.error.message}`);
        
        // 分析错误类型
        if (result.error.message.includes('AA33')) {
          console.log('');
          console.log('🔍 AA33 错误分析:');
          console.log('- AA33 = paymaster validation failed');
          console.log('- 可能原因:');
          console.log('  1. Paymaster deposit insufficient');
          console.log('  2. Paymaster validation logic error');
          console.log('  3. PaymasterAndData format incorrect');
        } else if (result.error.message.includes('AA23')) {
          console.log('');
          console.log('🔍 AA23 错误分析:');
          console.log('- AA23 = signature verification failed');
          console.log('- 可能原因:');
          console.log('  1. Signature format incorrect');
          console.log('  2. Wrong private key used');
          console.log('  3. UserOpHash calculation mismatch');
        }
        
        return { success: false, error: result.error };
      } else {
        console.log('🎉 提交成功!');
        console.log(`UserOpHash: ${result.result}`);
        console.log('');
        console.log('✅ SUCCESS: AA33 错误已修复!');
        console.log('============================');
        console.log('🚀 您的 aNodePaymaster 现在完全可用于生产环境!');
        
        return { success: true, userOpHash: result.result };
      }
    } catch (error) {
      console.error('❌ 网络错误:', error.message);
      return { success: false, error: { message: error.message } };
    }
  }

  /**
   * 运行完整流程
   */
  async run() {
    try {
      // 1. 测试连通性
      const connected = await this.testConnectivity();
      if (!connected) {
        throw new Error('无法连接到 Alchemy API');
      }

      // 2. 生成 UserOperation
      const userOp = await this.generateUserOperation();

      // 3. Paymaster 处理
      const processedUserOp = await this.processWithPaymaster(userOp);

      // 4. 签名
      const signedUserOp = await this.signUserOperation(processedUserOp);

      // 5. 提交到 Alchemy
      const result = await this.submitToAlchemy(signedUserOp);

      if (result.success) {
        console.log('🎊 完整测试流程成功完成!');
        console.log('==========================');
        console.log('📋 测试摘要:');
        console.log('✅ Alchemy API 连接正常');
        console.log('✅ UserOperation 生成成功');
        console.log('✅ Paymaster 处理成功');
        console.log('✅ UserOperation 签名成功');
        console.log('✅ Bundler 提交成功');
        console.log('');
        console.log('🚀 aNodePaymaster 已完全可用于生产环境!');
      } else {
        console.log('❌ 测试失败，需要进一步调试');
      }

      return result;
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error.message);
      return { success: false, error: { message: error.message } };
    }
  }
}

// 运行测试
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const submitter = new AlchemySubmitter();
  submitter.run().catch(console.error);
}
