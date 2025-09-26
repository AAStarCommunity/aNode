#!/usr/bin/env node

/**
 * 本地测试脚本 - 测试 EntryPoint v0.6 版本
 * 使用本地开发服务器测试 paymaster 功能
 */

// Node.js 18+ has built-in fetch, no need to import

const LOCAL_BASE_URL = 'http://localhost:8787'

async function testHealth() {
  console.log('🩺 测试健康检查...')
  try {
    const response = await fetch(`${LOCAL_BASE_URL}/health`)
    const data = await response.json()

    if (response.ok && data.status === 'ok') {
      console.log('✅ 健康检查通过')
      return true
    } else {
      console.log('❌ 健康检查失败:', data)
      return false
    }
  } catch (error) {
    console.log('❌ 健康检查错误:', error.message)
    return false
  }
}

async function testV06Paymaster() {
  console.log('🔄 测试 v0.6 Paymaster 功能...')

  const userOpV06 = {
    sender: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
    nonce: '0x0',
    initCode: '0x',
    callData: '0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8',
    callGasLimit: '0x5208',
    verificationGasLimit: '0x186a0',
    preVerificationGas: '0x5208',
    maxFeePerGas: '0x3b9aca00',
    maxPriorityFeePerGas: '0x3b9aca00',
    paymasterAndData: '0x',
    signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }

  try {
    const response = await fetch(`${LOCAL_BASE_URL}/api/v1/paymaster/process/v06`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userOperation: userOpV06
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      console.log('✅ v0.6 Paymaster 处理成功')
      console.log('📊 支付方法:', data.paymentMethod)
      console.log('⏱️ 处理时间:', data.processing.totalDuration)
      console.log('💰 PaymasterAndData 长度:', data.userOperation.paymasterAndData.length)
      return true
    } else {
      console.log('❌ v0.6 Paymaster 处理失败:', data.error)
      return false
    }
  } catch (error) {
    console.log('❌ v0.6 Paymaster 请求错误:', error.message)
    return false
  }
}

async function testV06WithBodyVersion() {
  console.log('🔄 测试 v0.6 (请求体版本参数)...')

  const userOpV06 = {
    sender: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
    nonce: '0x0',
    initCode: '0x',
    callData: '0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8',
    callGasLimit: '0x5208',
    verificationGasLimit: '0x186a0',
    preVerificationGas: '0x5208',
    maxFeePerGas: '0x3b9aca00',
    maxPriorityFeePerGas: '0x3b9aca00',
    paymasterAndData: '0x',
    signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }

  try {
    const response = await fetch(`${LOCAL_BASE_URL}/api/v1/paymaster/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userOperation: userOpV06,
        entryPointVersion: '0.6'
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      console.log('✅ v0.6 (请求体版本) 处理成功')
      console.log('📊 支付方法:', data.paymentMethod)
      console.log('⏱️ 处理时间:', data.processing.totalDuration)
      return true
    } else {
      console.log('❌ v0.6 (请求体版本) 处理失败:', data.error)
      return false
    }
  } catch (error) {
    console.log('❌ v0.6 (请求体版本) 请求错误:', error.message)
    return false
  }
}

async function main() {
  console.log('🏠 本地测试 aNode Simple Paymaster v0.6')
  console.log('========================================')

  // 等待服务器启动
  console.log('⏳ 等待服务器启动...')
  await new Promise(resolve => setTimeout(resolve, 2000))

  let allTestsPassed = true

  // 测试健康检查
  const healthOk = await testHealth()
  allTestsPassed = allTestsPassed && healthOk

  if (healthOk) {
    // 测试 v0.6 URL 路径版本
    const v06UrlOk = await testV06Paymaster()
    allTestsPassed = allTestsPassed && v06UrlOk

    // 测试 v0.6 请求体版本
    const v06BodyOk = await testV06WithBodyVersion()
    allTestsPassed = allTestsPassed && v06BodyOk
  }

  console.log('========================================')
  if (allTestsPassed) {
    console.log('🎉 本地 v0.6 测试全部通过！')
  } else {
    console.log('❌ 部分本地 v0.6 测试失败')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('💥 测试脚本执行失败:', error)
  process.exit(1)
})
