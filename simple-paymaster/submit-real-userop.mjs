#!/usr/bin/env node

/**
 * 真实 UserOperation 提交脚本
 * 使用生产 Paymaster API 获取 paymasterAndData，然后提交到 Alchemy Bundler
 */

import { ethers } from 'ethers'

// Alchemy Provider for Sepolia
const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N')

const PRODUCTION_PAYMASTER_URL = 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev'
const ALCHEMY_BUNDLER_URL = 'https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N'

// 测试账户信息
const ACCOUNT_A = '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6' // SimpleAccount A
const ACCOUNT_B = '0x27243FAc2c0bEf46F143a705708dC4A7eD476854' // SimpleAccount B
const PNT_TOKEN = '0x3e7B771d4541eC85c8137e950598Ac97553a337a'  // PNT ERC20 代币

// SimpleAccount A 的私钥 (从之前调试中获得)
const ACCOUNT_A_PRIVATE_KEY = '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81'

// EntryPoint v0.6 地址
const ENTRY_POINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'

// ERC20 transfer 函数签名: transfer(address,uint256)
const TRANSFER_FUNCTION = '0xa9059cbb'

// 转账金额: 1000 wei PNT
const TRANSFER_AMOUNT = '0x3e8'

async function getAccountNonce() {
  console.log('🔢 查询账户 nonce...')

  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getUserOperationNonce',
    params: [ACCOUNT_A, '0x0', ENTRY_POINT_ADDRESS] // sequenceKey = 0x0
  }

  const response = await fetch(ALCHEMY_BUNDLER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`获取 nonce 失败: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.error) {
    throw new Error(`Nonce 查询错误: ${result.error.message}`)
  }

  console.log('✅ 账户 nonce:', result.result)
  return result.result
}

async function getPaymasterAndData(userOp, entryPointVersion = '0.6') {
  console.log('🔄 获取 PaymasterAndData...')

  const response = await fetch(`${PRODUCTION_PAYMASTER_URL}/api/v1/paymaster/process/v06`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userOperation: userOp,
      entryPointVersion
    })
  })

  if (!response.ok) {
    throw new Error(`Paymaster API 错误: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(`Paymaster 处理失败: ${result.error?.message || '未知错误'}`)
  }

  console.log('✅ PaymasterAndData 获取成功')
  console.log('💰 PaymasterAndData 长度:', result.userOperation.paymasterAndData.length)

  return result.userOperation.paymasterAndData
}

async function submitToAlchemyBundler(userOp) {
  console.log('🚀 提交 UserOperation 到 Alchemy Bundler...')

  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_sendUserOperation',
    params: [userOp, '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'] // EntryPoint v0.6
  }

  console.log('📋 提交请求:')
  console.log('  - 方法: eth_sendUserOperation')
  console.log('  - EntryPoint: 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789')
  console.log('  - Sender:', userOp.sender)

  const response = await fetch(ALCHEMY_BUNDLER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    throw new Error(`Alchemy Bundler API 错误: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.error) {
    throw new Error(`Bundler 错误: ${result.error.message}`)
  }

  console.log('✅ UserOperation 提交成功!')
  console.log('🔗 UserOperation Hash:', result.result)

  return result.result
}

async function waitForUserOpReceipt(userOpHash, maxWaitTime = 60000) {
  console.log('⏳ 等待 UserOperation 确认...')

  const startTime = Date.now()
  const checkInterval = 2000 // 2秒检查一次

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getUserOperationReceipt',
        params: [userOpHash]
      }

      const response = await fetch(ALCHEMY_BUNDLER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      const result = await response.json()

      if (result.result && result.result.receipt) {
        console.log('✅ UserOperation 已确认!')
        console.log('📄 交易哈希:', result.result.receipt.transactionHash)
        console.log('🔢 区块号:', parseInt(result.result.receipt.blockNumber, 16))
        console.log('💰 Gas Used:', parseInt(result.result.receipt.gasUsed, 16))
        return result.result
      }
    } catch (error) {
      console.log('查询失败，重试中...', error.message)
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  throw new Error('等待 UserOperation 确认超时')
}

async function calculateUserOpHash(userOp, entryPointAddress) {
  // 使用 EntryPoint 合约计算 UserOpHash - 这是正确的方式
  const entryPointContract = new ethers.Contract(entryPointAddress, [
    'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
  ], provider)

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
  ]

  const userOpHash = await entryPointContract.getUserOpHash(userOpTuple)
  return userOpHash
}

async function signUserOperation(userOp, entryPointAddress, privateKey) {
  const userOpHash = await calculateUserOpHash(userOp, entryPointAddress)

  // SimpleAccount 使用 signMessage 直接对 userOpHash 签名
  const wallet = new ethers.Wallet(privateKey)
  const signature = await wallet.signMessage(ethers.getBytes(userOpHash))

  return signature
}

async function createERC20TransferUserOp(nonce = '0x0') {
  console.log('📝 构建 ERC20 转账 UserOperation...')

  // 构建 transfer 函数调用数据
  const transferData = TRANSFER_FUNCTION +
    ACCOUNT_B.slice(2).padStart(64, '0') + // to 地址 (32字节)
    TRANSFER_AMOUNT.slice(2).padStart(64, '0') // amount (32字节)

  console.log('📋 转账详情:')
  console.log('  - 从:', ACCOUNT_A)
  console.log('  - 到:', ACCOUNT_B)
  console.log('  - 代币:', PNT_TOKEN)
  console.log('  - 金额:', parseInt(TRANSFER_AMOUNT, 16), 'wei PNT')
  console.log('  - Nonce:', nonce)
  console.log('  - CallData:', transferData)

  const userOp = {
    sender: ACCOUNT_A,
    nonce: nonce,
    initCode: '0x', // 账户已部署
    callData: transferData,
    callGasLimit: '0x7530', // 30k gas (与成功案例一致)
    verificationGasLimit: '0x17318', // 95k gas (与成功案例一致)
    preVerificationGas: '0xb420', // 46k gas
    maxFeePerGas: '0x3b9aca00', // 1 gwei
    maxPriorityFeePerGas: '0x3b9aca00', // 1 gwei
    paymasterAndData: '0x', // 将由 paymaster 填充
    signature: '0x' // 将在后面填充真实签名
  }

  return userOp
}

async function trySubmitWithDifferentNonces() {
  // 尝试从成功案例的下一个nonce开始
  const nonceAttempts = ['0x16', '0x17', '0x18', '0x19', '0x1a'] // 从22开始尝试

  for (const nonce of nonceAttempts) {
    console.log(`\n🔄 尝试 nonce: ${nonce}`)

    try {
      // 1. 构建 UserOperation (使用指定的 nonce)
      const userOp = await createERC20TransferUserOp(nonce)

      // 2. 获取 PaymasterAndData
      const paymasterAndData = await getPaymasterAndData(userOp, '0.6')

    // 3. 更新 UserOperation (添加 paymasterAndData)
    const userOpWithPaymaster = {
      ...userOp,
      paymasterAndData,
      signature: '0x' // 先设置为空，用于计算hash
    }

    // 4. 计算并添加签名
    const signature = await signUserOperation(userOpWithPaymaster, ENTRY_POINT_ADDRESS, ACCOUNT_A_PRIVATE_KEY)
    const completeUserOp = {
      ...userOpWithPaymaster,
      signature
    }

      console.log('📦 UserOperation 已准备')
      console.log('  - Nonce:', nonce)
      console.log('  - PaymasterAndData 长度:', paymasterAndData.length)
      console.log('  - 签名长度:', signature.length)

      // 5. 提交到 Bundler
      const userOpHash = await submitToAlchemyBundler(completeUserOp)

      // 6. 等待确认
      const receipt = await waitForUserOpReceipt(userOpHash)

      console.log('=====================================')
      console.log('🎉 交易成功完成!')
      console.log('📋 最终结果:')
      console.log('  - Nonce:', nonce)
      console.log('  - UserOp Hash:', userOpHash)
      console.log('  - 交易哈希:', receipt.receipt.transactionHash)
      console.log('  - 区块:', receipt.receipt.blockNumber)
      console.log('  - Gas 使用:', receipt.receipt.gasUsed)

      return receipt

    } catch (error) {
      if (error.message.includes('AA25 invalid account nonce')) {
        console.log(`❌ Nonce ${nonce} 无效，继续尝试下一个...`)
        continue
      } else {
        console.error(`❌ 使用 nonce ${nonce} 时出错:`, error.message)
        throw error
      }
    }
  }

  throw new Error('尝试了多个 nonce 值都失败')
}

async function main() {
  console.log('💸 A → B 真实 ERC20 转账交易')
  console.log('=====================================')

  try {
    await trySubmitWithDifferentNonces()
  } catch (error) {
    console.error('❌ 所有 nonce 尝试都失败:', error.message)
    console.error('🔍 错误详情:', error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('💥 脚本执行失败:', error)
  process.exit(1)
})
