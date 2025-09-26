#!/usr/bin/env node

/**
 * 直接提交 UserOperation，不通过 paymaster 服务
 * 用于调试 gas 限制问题
 */

import { ethers } from 'ethers';

const CONFIG = {
  ALCHEMY_API_KEY: 'Bx4QRW1-vnwJUePSAAD7N',
  ALCHEMY_URL: 'https://eth-sepolia.g.alchemy.com/v2/',
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  NEW_PAYMASTER_ADDRESS: '0x321eB27CA443ED279503b121E1e0c8D87a4f4B51',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',
  PNT_TOKEN_ADDRESS: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  RPC_URL: 'https://ethereum-sepolia.publicnode.com'
};

console.log('🚀 直接提交测试 (不通过 paymaster 服务)');
console.log('========================================');

async function directSubmitTest() {
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, provider);
    const alchemyUrl = CONFIG.ALCHEMY_URL + CONFIG.ALCHEMY_API_KEY;

    console.log('1️⃣ 生成 UserOperation...');
    
    const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];
    const SIMPLE_ACCOUNT_ABI = ['function execute(address dest, uint256 value, bytes calldata func)', 'function getNonce() view returns (uint256)'];

    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN_ADDRESS, ERC20_ABI, provider);
    const accountContract = new ethers.Contract(CONFIG.SIMPLE_ACCOUNT_A, SIMPLE_ACCOUNT_ABI, provider);
    
    const decimals = await tokenContract.decimals();
    const nonce = await accountContract.getNonce();
    const transferAmount = ethers.parseUnits('0.001', decimals);
    
    const transferCalldata = tokenContract.interface.encodeFunctionData('transfer', [CONFIG.SIMPLE_ACCOUNT_B, transferAmount]);
    const executeCalldata = accountContract.interface.encodeFunctionData('execute', [CONFIG.PNT_TOKEN_ADDRESS, 0, transferCalldata]);

    // 创建 UserOperation - 直接设置 paymasterAndData
    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: `0x${nonce.toString(16)}`,
      initCode: '0x',
      callData: executeCalldata,
      callGasLimit: '0x7530', // 30000
      verificationGasLimit: '0x17318', // 95000 - 目标效率 0.2
      preVerificationGas: '0xB61C', // 46620
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      paymasterAndData: CONFIG.NEW_PAYMASTER_ADDRESS + '000000000000000000000000', // paymaster + padding
      signature: '0x'
    };

    console.log('✅ UserOperation 生成完成');
    console.log('Gas 参数验证:');
    console.log(`- callGasLimit: ${userOp.callGasLimit} (${parseInt(userOp.callGasLimit, 16)})`);
    console.log(`- verificationGasLimit: ${userOp.verificationGasLimit} (${parseInt(userOp.verificationGasLimit, 16)})`);
    console.log(`- preVerificationGas: ${userOp.preVerificationGas} (${parseInt(userOp.preVerificationGas, 16)})`);
    console.log(`- paymasterAndData: ${userOp.paymasterAndData} (${userOp.paymasterAndData.length - 2} chars)`);
    console.log('');

    console.log('2️⃣ 签名 UserOperation...');
    
    const entryPointContract = new ethers.Contract(CONFIG.ENTRYPOINT_ADDRESS, [
      'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
    ], provider);

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

    const userOpHash = await entryPointContract.getUserOpHash(userOpTuple);
    console.log(`UserOpHash: ${userOpHash}`);

    const signature = await wallet.signMessage(ethers.getBytes(userOpHash));
    userOp.signature = signature;

    console.log('✅ 签名完成');
    console.log('');

    console.log('3️⃣ 提交到 Alchemy...');
    console.log('最终 UserOperation:');
    console.log(JSON.stringify(userOp, null, 2));
    console.log('');

    const response = await fetch(alchemyUrl, {
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
      
      if (result.error.message.includes('verificationGasLimit')) {
        console.log('');
        console.log('🔍 Gas 限制分析:');
        console.log('- 当前 verificationGasLimit:', parseInt(userOp.verificationGasLimit, 16));
        console.log('- 这应该是 5000000，符合 Alchemy 的限制');
        console.log('- 错误可能来自其他地方');
      }
    } else {
      console.log('🎉 提交成功!');
      console.log(`UserOpHash: ${result.result}`);
      console.log('');
      console.log('✅ SUCCESS: 所有问题都已解决!');
    }

    return result;
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    return { error: { message: error.message } };
  }
}

directSubmitTest().catch(console.error);
