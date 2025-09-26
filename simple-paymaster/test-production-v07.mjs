#!/usr/bin/env node

/**
 * 生产环境测试脚本 - 测试 EntryPoint v0.7 版本
 * 使用生产环境服务器测试 paymaster 功能
 */

const PRODUCTION_BASE_URL = 'https://anode-simple-paymaster-prod.jhfnetboy.workers.dev'

async function testV07PaymasterProduction() {
  console.log('🔄 测试生产环境 v0.7 Paymaster 功能...')

  // PackedUserOperation v0.7 格式
  const packedUserOpV07 = {
    sender: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
    nonce: '0x0',
    initCode: '0x',
    callData: '0xa9059cbb00000000000000000000000027243FAc2c0bEf46F143a705708dC4A7eD47685400000000000000000000000000000000000000000000000000000000000003e8',
    // v0.7: accountGasLimits = callGasLimit + verificationGasLimit (packed)
    accountGasLimits: '0x000000000000000000000000000052080000000000000000000000000000186a0',
    preVerificationGas: '0x5208',
    // v0.7: gasFees = maxFeePerGas + maxPriorityFeePerGas (packed)
    gasFees: '0x000000000000000000000000003b9aca000000000000000000000000003b9aca00',
    paymasterAndData: '0x',
    signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }

  try {
    const response = await fetch(`${PRODUCTION_BASE_URL}/api/v1/paymaster/process/v07`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userOperation: packedUserOpV07
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      console.log('✅ 生产环境 v0.7 Paymaster 处理成功')
      console.log('📊 支付方法:', data.paymentMethod)
      console.log('⏱️ 处理时间:', data.processing.totalDuration)
      console.log('💰 PaymasterAndData 长度:', data.userOperation.paymasterAndData.length)
      console.log('🔗 PaymasterAndData:', data.userOperation.paymasterAndData.substring(0, 66) + '...')
      return { success: true, data }
    } else {
      console.log('❌ 生产环境 v0.7 Paymaster 处理失败:', data.error)
      return { success: false, error: data.error }
    }
  } catch (error) {
    console.log('❌ 生产环境 v0.7 Paymaster 请求错误:', error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 生产环境测试 aNode Simple Paymaster v0.7')
  console.log('===========================================')
  console.log('🌐 生产环境 URL:', PRODUCTION_BASE_URL)

  // 测试生产环境 v0.7 URL 路径版本
  const result = await testV07PaymasterProduction()

  console.log('===========================================')
  if (result.success) {
    console.log('🎉 生产环境 v0.7 测试通过！')
    console.log('📈 API 端点工作正常，可用于生产环境')

    // 记录详细数据
    console.log('\n📋 详细测试数据:')
    console.log('='.repeat(50))
    console.log('请求 URL:', `${PRODUCTION_BASE_URL}/api/v1/paymaster/process/v07`)
    console.log('UserOperation 格式: PackedUserOperation (v0.7)')
    console.log('accountGasLimits:', '0x000000000000000000000000000052080000000000000000000000000000186a0')
    console.log('gasFees:', '0x000000000000000000000000003b9aca000000000000000000000000003b9aca00')
    console.log('响应状态:', 'success')
    console.log('支付方法:', result.data.paymentMethod)
    console.log('处理时间:', result.data.processing.totalDuration)
    console.log('PaymasterAndData 长度:', result.data.userOperation.paymasterAndData.length)
    console.log('PaymasterAndData 前缀:', result.data.userOperation.paymasterAndData.substring(0, 66))
  } else {
    console.log('❌ 生产环境 v0.7 测试失败')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('💥 测试脚本执行失败:', error)
  process.exit(1)
})
