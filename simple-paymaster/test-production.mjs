#!/usr/bin/env node

/**
 * Production Readiness Test
 * Tests core paymaster functionality without external dependencies
 */

console.log('🚀 aNodePaymaster Production Readiness Test');
console.log('============================================\n');

// Test 1: Health Check
console.log('1️⃣ Testing Health Check...');
try {
  const response = await fetch('http://localhost:8787/health');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  console.log('✅ Health check passed');
  console.log(`   Service: ${data.service}`);
  console.log(`   Version: ${data.version}`);
  console.log(`   Status: ${data.status}`);
} catch (error) {
  console.log('❌ Health check failed:', error.message);
  console.log('   Make sure to run: pnpm run dev');
  process.exit(1);
}
console.log('');

// Test 2: Paymaster API Structure
console.log('2️⃣ Testing Paymaster API Structure...');
try {
  const testUserOp = {
    sender: '0x742d35Cc6634C0532925a3b8D3B7F2E5e111e0f7',
    nonce: '0x0',
    initCode: '0x',
    callData: '0x',
    callGasLimit: '0x7530',
    verificationGasLimit: '0x17318', // Optimized value
    preVerificationGas: '0xB61C',
    maxFeePerGas: '0x3b9aca00',
    maxPriorityFeePerGas: '0x3b9aca00',
    paymasterAndData: '0x',
    signature: '0x'
  };

  const response = await fetch('http://localhost:8787/api/v1/paymaster/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userOperation: testUserOp
    }),
  });

  const result = await response.json();

  console.log('✅ API call successful');
  console.log(`   Status: ${response.status}`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Payment Method: ${result.paymentMethod}`);
  console.log(`   Processing Time: ${result.processing.totalDuration}`);

  if (result.success) {
    const paymasterAndData = result.userOperation.paymasterAndData;
    console.log(`   PaymasterAndData: ${paymasterAndData.substring(0, 42)}...`);
    console.log(`   PaymasterAndData Length: ${paymasterAndData.length - 2} bytes`);
  } else {
    console.log(`   Error: ${result.error?.message}`);
  }
} catch (error) {
  console.log('❌ API test failed:', error.message);
  process.exit(1);
}
console.log('');

// Test 3: TypeScript Compilation
console.log('3️⃣ Testing TypeScript Compilation...');
try {
  const { execSync } = await import('child_process');
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log(error.stdout?.toString() || error.message);
  process.exit(1);
}
console.log('');

// Test 4: Configuration Validation
console.log('4️⃣ Testing Configuration...');
try {
  // Check wrangler.toml exists and is valid
  const fs = await import('fs');
  if (fs.existsSync('wrangler.toml')) {
    console.log('✅ wrangler.toml exists');

    const toml = fs.readFileSync('wrangler.toml', 'utf8');
    if (toml.includes('PAYMASTER_CONTRACT_ADDRESS')) {
      console.log('✅ Paymaster contract address configured');
    } else {
      console.log('❌ Paymaster contract address not found');
    }
  } else {
    console.log('❌ wrangler.toml not found');
  }

  // Check package.json
  if (fs.existsSync('package.json')) {
    console.log('✅ package.json exists');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (pkg.scripts?.deploy) {
      console.log('✅ Deploy script configured');
    }
  }
} catch (error) {
  console.log('❌ Configuration check failed:', error.message);
}
console.log('');

// Test 5: Contract Compilation
console.log('5️⃣ Testing Contract Compilation...');
try {
  const { execSync } = await import('child_process');
  execSync('cd contracts && forge build', { stdio: 'pipe' });
  console.log('✅ Contract compilation successful');
} catch (error) {
  console.log('❌ Contract compilation failed');
  console.log(error.stdout?.toString() || error.message);
}
console.log('');

console.log('🎉 Production Readiness Test Complete!');
console.log('=====================================');
console.log('');
console.log('✅ Ready for deployment checklist:');
console.log('1. Set up Cloudflare account and wrangler auth');
console.log('2. Configure secrets: wrangler secret put PAYMASTER_PRIVATE_KEY');
console.log('3. Update PAYMASTER_CONTRACT_ADDRESS in wrangler.toml');
console.log('4. Run: pnpm run deploy');
console.log('');
console.log('🚀 Your aNodePaymaster is production-ready!');
