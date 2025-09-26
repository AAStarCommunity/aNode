#!/usr/bin/env node

/**
 * 使用标准SimpleAccount进行最终测试
 * 直接使用标准SimpleAccount实现来解决签名验证问题
 */

import { ethers } from 'ethers';

// 使用标准的SimpleAccount地址 (如果存在的话)
// 或者我们需要先部署一个标准的SimpleAccount

// 配置 - 使用我们将要部署的标准SimpleAccount
const CONFIG = {
  // 我们将部署的标准SimpleAccount
  SENDER: '0x0000000000000000000000000000000000000000', // 将在部署后设置
  RECEIVER: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854', // SimpleAccount B
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',

  // 合约地址
  ENTRYPOINT_V06: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  PNT_CONTRACT: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  PAYMASTER_CONTRACT: '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51',

  // 转账金额
  TRANSFER_AMOUNT: '0.005', // 0.005 PNTs

  // RPC
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N',

  // Paymaster服务
  PAYMASTER_URL: 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev/api/v1/paymaster/process'
};

// SimpleAccount ABI
const SIMPLE_ACCOUNT_ABI = [
  'function nonce() view returns (uint256)',
  'function getNonce() view returns (uint256)',
  'function execute(address dest, uint256 value, bytes calldata func)',
  'function validateUserOp((address,uint256,bytes,bytes,address,uint256,uint256,uint256,uint256,bytes,bytes) memory userOp, bytes32 userOpHash, uint256 missingAccountFunds) returns (uint256)',
  'function owner() view returns (address)'
];

class StandardAccountTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    this.wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, this.provider);
  }

  async deployStandardSimpleAccount() {
    console.log('🚀 部署标准SimpleAccount...');

    // SimpleAccount字节码 - 从编译输出中获取
    // 注意：这里我们需要先编译并获取字节码

    console.log('⚠️  需要先编译SimpleAccount合约获取字节码');
    console.log('运行以下命令获取字节码:');
    console.log('cd simple-paymaster/contracts && forge build src/SimpleAccount.sol --extra-output bytecode');

    // 或者我们可以尝试直接调用部署脚本
    console.log('\n或者运行部署脚本:');
    console.log('cd simple-paymaster && forge script contracts/script/DeploySimpleAccount.s.sol --rpc-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N --broadcast');

    return null;
  }

  // 从编译输出中提取字节码 (手动方式)
  getSimpleAccountBytecode() {
    // 这个需要从forge build的输出中提取
    // 我们可以先运行编译，然后读取输出文件
    return null; // 暂时返回null
  }

  async testWithStandardAccount(accountAddress) {
    console.log(`🎯 使用标准SimpleAccount测试: ${accountAddress}`);

    CONFIG.SENDER = accountAddress;

    // 创建SimpleAccount合约实例
    const simpleAccount = new ethers.Contract(accountAddress, SIMPLE_ACCOUNT_ABI, this.provider);

    // 检查合约是否正确部署
    try {
      const owner = await simpleAccount.owner();
      const nonce = await simpleAccount.getNonce();

      console.log(`✅ SimpleAccount部署验证:`);
      console.log(`- 地址: ${accountAddress}`);
      console.log(`- Owner: ${owner}`);
      console.log(`- Nonce: ${nonce}`);

      if (owner.toLowerCase() !== this.wallet.address.toLowerCase()) {
        console.log('❌ Owner地址不匹配');
        return null;
      }

    } catch (error) {
      console.log('❌ SimpleAccount合约调用失败:', error.message);
      return null;
    }

    // 现在进行转账测试
    return await this.performTransfer();
  }

  async performTransfer() {
    console.log('\n💸 执行ERC-4337转账...');

    // 检查余额
    const tokenContract = new ethers.Contract(CONFIG.PNT_CONTRACT, [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function transfer(address,uint256) returns (bool)'
    ], this.provider);

    const decimals = await tokenContract.decimals();
    const balance = await tokenContract.balanceOf(CONFIG.SENDER);
    const transferAmount = ethers.parseUnits(CONFIG.TRANSFER_AMOUNT, decimals);

    console.log(`余额检查: ${ethers.formatUnits(balance, decimals)} PNTs`);

    if (balance < transferAmount) {
      console.log('❌ 余额不足');
      return null;
    }

    // 生成UserOperation
    const userOp = await this.generateUserOperation(transferAmount);

    // Paymaster处理
    const processedUserOp = await this.processWithPaymaster(userOp);

    // 签名
    const signature = await this.signUserOp(processedUserOp, CONFIG.ENTRYPOINT_V06);
    processedUserOp.signature = signature;

    console.log('✍️ UserOperation签名完成');

    // 提交到bundler
    return await this.submitToBundler(processedUserOp);
  }

  async generateUserOperation(transferAmount) {
    console.log('🔧 生成UserOperation...');

    // ERC20 transfer数据
    const tokenInterface = new ethers.Interface([
      'function transfer(address,uint256) returns (bool)'
    ]);

    const transferData = tokenInterface.encodeFunctionData('transfer', [
      CONFIG.RECEIVER,
      transferAmount
    ]);

    // SimpleAccount execute数据
    const executeData = ethers.concat([
      CONFIG.PNT_CONTRACT, // to
      ethers.zeroPadValue(ethers.toBeHex(0), 32), // value
      ethers.zeroPadValue(ethers.toBeHex(transferData.length), 32), // data length
      transferData // data
    ]);

    // 获取nonce
    const simpleAccount = new ethers.Contract(CONFIG.SENDER, SIMPLE_ACCOUNT_ABI, this.provider);
    const nonce = await simpleAccount.getNonce();

    const userOp = {
      sender: CONFIG.SENDER,
      nonce: nonce.toString(),
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

    console.log(`✅ UserOperation生成完成, nonce: ${nonce}`);
    return userOp;
  }

  async processWithPaymaster(userOp) {
    console.log('🎯 Paymaster处理...');

    const response = await fetch(CONFIG.PAYMASTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryPointVersion: '0.6',
        userOperation: userOp
      })
    });

    if (!response.ok) {
      throw new Error(`Paymaster API error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(`Paymaster处理失败: ${result.error}`);
    }

    console.log('✅ Paymaster处理成功');
    return result.userOperation;
  }

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
    return ethers.keccak256(ethers.concat([userOpHash, CONFIG.ENTRYPOINT_V06]));
  }

  async signUserOp(userOp) {
    const userOpHash = this.getUserOpHash(userOp);
    console.log('🔑 UserOpHash:', userOpHash);

    const signature = await this.wallet.signMessage(ethers.getBytes(userOpHash));
    console.log('✍️ 签名生成完成');
    return signature;
  }

  async submitToBundler(userOp) {
    console.log('🚀 提交到Bundler...');

    // 使用Alchemy bundler
    const alchemyBundler = new ethers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N`
    );

    console.log('最终UserOperation摘要:');
    console.log(`- 发送者: ${userOp.sender}`);
    console.log(`- 接收者: ${CONFIG.RECEIVER}`);
    console.log(`- 金额: ${CONFIG.TRANSFER_AMOUNT} PNTs`);
    console.log(`- Nonce: ${userOp.nonce}`);

    try {
      const result = await alchemyBundler.send('eth_sendUserOperation', [
        userOp,
        CONFIG.ENTRYPOINT_V06
      ]);

      console.log(`🎉 交易提交成功! UserOpHash: ${result}`);
      return result;

    } catch (error) {
      console.error('❌ 提交失败:', error.message);

      if (error.message.includes('Invalid UserOperation signature')) {
        console.log('💡 签名验证仍然失败 - 可能需要调整SimpleAccount实现');
      }

      return null;
    }
  }

  async runTest() {
    console.log('🚀 标准SimpleAccount测试');
    console.log('========================');

    console.log('第一步: 部署标准SimpleAccount');
    const accountAddress = await this.deployStandardSimpleAccount();

    if (!accountAddress) {
      console.log('⚠️ 无法部署SimpleAccount，请先手动部署');
      console.log('使用命令:');
      console.log('cd simple-paymaster/contracts');
      console.log('forge script script/DeploySimpleAccount.s.sol --rpc-url https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N --broadcast');

      // 假设我们已经知道地址，让用户输入
      console.log('\n请输入已部署的SimpleAccount地址:');
      // 这里可以让用户输入地址，或者使用已知的地址

      return null;
    }

    console.log('\n第二步: 使用标准SimpleAccount进行转账测试');
    return await this.testWithStandardAccount(accountAddress);
  }
}

// 运行测试
const tester = new StandardAccountTester();
tester.runTest().then(result => {
  if (result) {
    console.log('\n🎯 测试成功! 交易Hash:', result);
  } else {
    console.log('\n❌ 测试失败');
  }
}).catch(console.error);
