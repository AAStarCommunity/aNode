#!/usr/bin/env node

/**
 * aNodePaymaster 使用示例
 * 演示如何在应用中集成 aNodePaymaster
 */

import { ethers } from 'ethers';

// 配置
const PAYMASTER_URL = 'http://localhost:8787'; // 生产环境替换为实际 URL
const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

/**
 * 为 UserOperation 请求 paymaster 数据
 */
async function sponsorUserOperation(userOp) {
  try {
    console.log('📤 请求 Paymaster 赞助...');

    const response = await fetch(`${PAYMASTER_URL}/api/v1/paymaster/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userOperation: userOp,
      }),
    });

    if (!response.ok) {
      throw new Error(`Paymaster API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Paymaster processing failed: ${result.error?.message}`);
    }

    console.log('✅ Paymaster 赞助成功');
    console.log(`   支付模式: ${result.paymentMethod}`);
    console.log(`   处理时间: ${result.processing.totalDuration}`);

    return result.userOperation;
  } catch (error) {
    console.error('❌ Paymaster 赞助失败:', error.message);
    throw error;
  }
}

/**
 * 完整的 ERC-4337 UserOperation 流程示例
 */
async function completeExample() {
  console.log('🚀 aNodePaymaster 集成示例');
  console.log('===============================\n');

  // 1. 创建基础 UserOperation (从你的钱包应用中获得)
  const baseUserOp = {
    sender: '0x742d35Cc6634C0532925a3b8D3B7F2E5e111e0f7', // 用户的 SimpleAccount
    nonce: '0x0',
    initCode: '0x',
    callData: '0xa9059cbb000000000000000000000000d8dA6BF26964aF9D7eEd9e03E53415D37aA960450000000000000000000000000000000000000000000000000000000000000001', // ERC20 transfer
    callGasLimit: '0x7530', // 30,000
    verificationGasLimit: '0x17318', // 95,000 (优化的值)
    preVerificationGas: '0xB61C', // 46,620
    maxFeePerGas: '0x3b9aca00', // 1 gwei
    maxPriorityFeePerGas: '0x3b9aca00', // 1 gwei
    paymasterAndData: '0x', // 将被 paymaster 填充
    signature: '0x' // 将被签名
  };

  console.log('1️⃣ 基础 UserOperation:');
  console.log(`   发送者: ${baseUserOp.sender}`);
  console.log(`   CallData: ERC20 transfer to vitalik.eth (1 wei)`);
  console.log('');

  // 2. 请求 paymaster 赞助
  const sponsoredUserOp = await sponsorUserOperation(baseUserOp);
  console.log('');

  // 3. 签名 UserOperation (使用用户的私钥)
  console.log('3️⃣ 签名 UserOperation...');
  // 注意: 在实际应用中，这应该在客户端完成
  // 这里只是演示流程

  console.log('✅ UserOperation 已准备好提交');
  console.log('');

  // 4. 提交到 Bundler (伪代码)
  console.log('4️⃣ 提交到 Bundler (示例):');
  console.log(`   Bundler URL: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`);
  console.log(`   Method: eth_sendUserOperation`);
  console.log(`   Params: [${JSON.stringify(sponsoredUserOp, null, 2)}, "${ENTRYPOINT_ADDRESS}"]`);
  console.log('');

  console.log('🎉 集成完成!');
  console.log('============');
  console.log('你的应用现在支持无 gas 交易了！');
  console.log('');
  console.log('📋 下一步:');
  console.log('1. 集成到你的前端应用');
  console.log('2. 设置用户钱包连接');
  console.log('3. 实现交易签名流程');
  console.log('4. 测试端到端用户体验');
}

// 运行示例
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  completeExample().catch(console.error);
}

export { sponsorUserOperation };
