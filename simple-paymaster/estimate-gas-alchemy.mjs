#!/usr/bin/env node

/**
 * 使用 Alchemy API 估算 UserOperation 的正确 gas 限制
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

console.log('⛽ 使用 Alchemy API 估算 Gas 限制');
console.log('================================');

async function estimateGas() {
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, provider);
    const alchemyUrl = CONFIG.ALCHEMY_URL + CONFIG.ALCHEMY_API_KEY;

    // 生成基础 UserOperation
    console.log('1️⃣ 生成基础 UserOperation...');
    
    const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'];
    const SIMPLE_ACCOUNT_ABI = ['function execute(address dest, uint256 value, bytes calldata func)', 'function getNonce() view returns (uint256)'];

    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN_ADDRESS, ERC20_ABI, provider);
    const accountContract = new ethers.Contract(CONFIG.SIMPLE_ACCOUNT_A, SIMPLE_ACCOUNT_ABI, provider);
    
    const decimals = await tokenContract.decimals();
    const nonce = await accountContract.getNonce();
    const transferAmount = ethers.parseUnits('0.001', decimals);
    
    const transferCalldata = tokenContract.interface.encodeFunctionData('transfer', [CONFIG.SIMPLE_ACCOUNT_B, transferAmount]);
    const executeCalldata = accountContract.interface.encodeFunctionData('execute', [CONFIG.PNT_TOKEN_ADDRESS, 0, transferCalldata]);

    // 创建基础 UserOperation (所有 gas 值设为 0，让 Alchemy 估算)
    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: `0x${nonce.toString(16)}`,
      initCode: '0x',
      callData: executeCalldata,
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      paymasterAndData: CONFIG.NEW_PAYMASTER_ADDRESS + '000000000000000000000000', // paymaster + padding
      signature: '0x' + '0'.repeat(130) // mock signature
    };

    console.log('✅ 基础 UserOperation 生成完成');
    console.log(`Nonce: ${nonce}`);
    console.log('');

    // 使用 Alchemy 估算 Gas
    console.log('2️⃣ 调用 Alchemy Gas 估算...');
    
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_estimateUserOperationGas',
        params: [userOp, CONFIG.ENTRYPOINT_ADDRESS],
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      console.log('❌ Gas 估算失败:');
      console.log(`Error Code: ${result.error.code}`);
      console.log(`Error Message: ${result.error.message}`);
      
      // 如果估算失败，使用保守的默认值
      console.log('');
      console.log('🔧 使用保守的默认 Gas 值:');
      const conservativeGas = {
        callGasLimit: '0x7530', // 30000
        verificationGasLimit: '0x2dc6c0', // 3000000 - 非常高的值确保效率
        preVerificationGas: '0xB61C' // 46620
      };
      
      console.log(`callGasLimit: ${conservativeGas.callGasLimit} (${parseInt(conservativeGas.callGasLimit, 16)})`);
      console.log(`verificationGasLimit: ${conservativeGas.verificationGasLimit} (${parseInt(conservativeGas.verificationGasLimit, 16)})`);
      console.log(`preVerificationGas: ${conservativeGas.preVerificationGas} (${parseInt(conservativeGas.preVerificationGas, 16)})`);
      
      return conservativeGas;
    } else {
      console.log('✅ Gas 估算成功!');
      console.log('估算结果:', result.result);
      
      const gasEstimate = result.result;
      console.log('');
      console.log('📊 Gas 限制详情:');
      console.log(`callGasLimit: ${gasEstimate.callGasLimit} (${parseInt(gasEstimate.callGasLimit, 16)})`);
      console.log(`verificationGasLimit: ${gasEstimate.verificationGasLimit} (${parseInt(gasEstimate.verificationGasLimit, 16)})`);
      console.log(`preVerificationGas: ${gasEstimate.preVerificationGas} (${parseInt(gasEstimate.preVerificationGas, 16)})`);
      
      if (gasEstimate.maxFeePerGas) {
        console.log(`maxFeePerGas: ${gasEstimate.maxFeePerGas} (${parseInt(gasEstimate.maxFeePerGas, 16)})`);
      }
      if (gasEstimate.maxPriorityFeePerGas) {
        console.log(`maxPriorityFeePerGas: ${gasEstimate.maxPriorityFeePerGas} (${parseInt(gasEstimate.maxPriorityFeePerGas, 16)})`);
      }
      
      return gasEstimate;
    }
  } catch (error) {
    console.error('❌ 估算过程中发生错误:', error.message);
    return null;
  }
}

// 运行估算
estimateGas().then(gasEstimate => {
  if (gasEstimate) {
    console.log('');
    console.log('💡 建议在 submit-via-alchemy.mjs 中使用这些 Gas 值');
    console.log('==================================================');
    console.log(`callGasLimit: '${gasEstimate.callGasLimit}',`);
    console.log(`verificationGasLimit: '${gasEstimate.verificationGasLimit}',`);
    console.log(`preVerificationGas: '${gasEstimate.preVerificationGas}',`);
  }
}).catch(console.error);
