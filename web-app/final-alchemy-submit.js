#!/usr/bin/env node
/**
 * 最终版本：使用正确的 ERC-4337 签名方式
 * 基于之前成功的 Rundler 经验
 */

import { ethers } from 'ethers';
import axios from 'axios';

const CONFIG = {
  apiKey: '9bwo2HaiHpUXnDS-rohIK',
  privateKey: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',

  simpleAccountA: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  simpleAccountB: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',
  pntToken: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'
};

const ALCHEMY_URL = `https://eth-sepolia.g.alchemy.com/v2/${CONFIG.apiKey}`;

async function finalAlchemySubmit() {
  console.log('🎯 最终版本：向 Alchemy 提交 UserOperation');
  console.log('🔧 使用正确的 ERC-4337 签名方式');
  console.log('=' .repeat(50));

  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
    const signer = new ethers.Wallet(CONFIG.privateKey, provider);

    console.log(`🔑 Signer: ${signer.address}`);
    console.log(`📍 A→B: ${CONFIG.simpleAccountA} → ${CONFIG.simpleAccountB}`);

    // 1. 获取正确的 nonce
    const entryPointAbi = ['function getNonce(address sender, uint192 key) view returns (uint256 nonce)'];
    const entryPoint = new ethers.Contract(CONFIG.entryPoint, entryPointAbi, provider);
    const nonce = await entryPoint.getNonce(CONFIG.simpleAccountA, 0);

    console.log(`📊 SimpleAccount Nonce: ${nonce} (0x${nonce.toString(16)})`);

    // 2. 构建 callData
    const transferAmount = ethers.parseEther('1');

    const transferData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [CONFIG.simpleAccountB, transferAmount]
    );
    const transferCallData = '0xa9059cbb' + transferData.slice(2);

    const executeData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'bytes'],
      [CONFIG.pntToken, 0, transferCallData]
    );
    const callData = '0xb61d27f6' + executeData.slice(2);

    // 3. 构建 UserOperation
    const userOp = {
      sender: CONFIG.simpleAccountA,
      nonce: `0x${nonce.toString(16)}`,
      initCode: "0x",
      callData: callData,
      callGasLimit: "0x11170",
      verificationGasLimit: "0x11170",
      preVerificationGas: "0xAF50",
      maxFeePerGas: "0x77359400",
      maxPriorityFeePerGas: "0x5F5E100",
      paymasterAndData: "0x",
      signature: "0x"
    };

    // 4. 创建 ERC-4337 标准的 UserOperation Hash
    // 这是关键！使用正确的 hash 方式
    const chainId = 11155111; // Sepolia

    const userOpStructHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([
      'address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'
    ], [
      userOp.sender,
      userOp.nonce,
      ethers.keccak256(userOp.initCode),
      ethers.keccak256(userOp.callData),
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      ethers.keccak256(userOp.paymasterAndData)
    ]));

    // 添加 EntryPoint 和 chainId
    const userOpHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([
      'bytes32', 'address', 'uint256'
    ], [
      userOpStructHash,
      CONFIG.entryPoint,
      chainId
    ]));

    console.log(`🏗️  UserOpHash: ${userOpHash}`);

    // 5. 签名 (使用标准的 EIP-191 前缀)
    const message = ethers.getBytes(userOpHash);
    const signature = await signer.signMessage(message);
    userOp.signature = signature;

    console.log(`✅ 签名完成: ${signature.slice(0, 20)}...`);

    // 6. 发送到 Alchemy
    console.log('\n🚀 发送到 Alchemy Bundler...');

    const response = await axios.post(ALCHEMY_URL, {
      "jsonrpc": "2.0",
      "method": "eth_sendUserOperation",
      "params": [userOp, CONFIG.entryPoint],
      "id": 1
    }, {
      headers: { "Content-Type": "application/json" }
    });

    if (response.data.error) {
      throw new Error(`发送失败: ${response.data.error.message}`);
    }

    const resultHash = response.data.result;
    console.log('🎉 发送成功!');
    console.log(`📝 UserOp Hash: ${resultHash}`);

    // 7. 等待确认
    console.log('\n⏳ 等待确认...');
    for (let i = 0; i < 30; i++) {
      try {
        const receiptResponse = await axios.post(ALCHEMY_URL, {
          "jsonrpc": "2.0",
          "method": "eth_getUserOperationReceipt",
          "params": [resultHash],
          "id": 1
        });

        if (receiptResponse.data.result) {
          const receipt = receiptResponse.data.result;
          console.log('\n✅ 交易确认成功!');
          console.log(`📄 Transaction Hash: ${receipt.receipt.transactionHash}`);
          console.log(`⛽ Gas Used: ${parseInt(receipt.actualGasUsed).toLocaleString()}`);
          console.log(`💰 Gas Cost: ${ethers.formatEther(receipt.actualGasCost)} ETH`);
          console.log(`📦 Block: ${receipt.receipt.blockNumber}`);
          console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${receipt.receipt.transactionHash}`);

          console.log('\n🎉 成功！UserOperation 通过 Alchemy Bundler 执行完成!');
          console.log('💡 这证明了 A、B 账户配置和 Alchemy API 集成正常工作');

          break;
        }
      } catch (e) {
        // 继续等待
      }

      await new Promise(r => setTimeout(r, 2000));
      console.log(`   尝试 ${i + 1}/30...`);
    }

  } catch (error) {
    console.error('\n❌ 提交失败:', error.message);

    if (error.response?.data?.error) {
      console.error('📋 API 详细错误:', error.response.data.error);
    }

    console.error('\n🔍 调试信息:');
    console.error(error);
  }
}

finalAlchemySubmit().catch(console.error);