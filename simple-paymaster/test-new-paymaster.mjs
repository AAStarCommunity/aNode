#!/usr/bin/env node

import { ethers } from 'ethers';

// Configuration
const CONFIG = {
  OWNER_ADDRESS: '0x411BD567E46C0781248dbB6a9211891C032885e5',
  OWNER_PRIVATE_KEY: '0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81',
  SIMPLE_ACCOUNT_A: '0x7D7a0D3239285faE78F9c364D81bb1E3bc555BC6',
  SIMPLE_ACCOUNT_B: '0x27243FAc2c0bEf46F143a705708dC4A7eD476854',
  PNT_TOKEN_ADDRESS: '0x3e7B771d4541eC85c8137e950598Ac97553a337a',
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  NEW_PAYMASTER_ADDRESS: '0x96948cCC95926ef82929502c4AbbeEe4c755a087',
  PAYMASTER_URL: 'http://localhost:8787',
  RPC_URL: 'https://ethereum-sepolia.publicnode.com'
};

console.log('🚀 Testing New Paymaster Contract');
console.log('===================================');
console.log(`New Paymaster: ${CONFIG.NEW_PAYMASTER_ADDRESS}`);
console.log(`SimpleAccount A: ${CONFIG.SIMPLE_ACCOUNT_A}`);
console.log(`SimpleAccount B: ${CONFIG.SIMPLE_ACCOUNT_B}`);
console.log('');

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.OWNER_PRIVATE_KEY, provider);

// ERC20 ABI (minimal)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// SimpleAccount ABI (minimal)
const SIMPLE_ACCOUNT_ABI = [
  'function execute(address dest, uint256 value, bytes calldata func)',
  'function getNonce() view returns (uint256)'
];

async function main() {
  try {
    console.log('1️⃣ Getting token information...');
    const tokenContract = new ethers.Contract(CONFIG.PNT_TOKEN_ADDRESS, ERC20_ABI, provider);
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Token Decimals: ${decimals}`);
    console.log('');

    console.log('2️⃣ Checking account balances...');
    const balanceA = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_A);
    const balanceB = await tokenContract.balanceOf(CONFIG.SIMPLE_ACCOUNT_B);
    console.log(`Account A Balance: ${ethers.formatUnits(balanceA, decimals)} ${symbol}`);
    console.log(`Account B Balance: ${ethers.formatUnits(balanceB, decimals)} ${symbol}`);
    console.log('');

    console.log('3️⃣ Getting SimpleAccount nonce...');
    const accountContract = new ethers.Contract(CONFIG.SIMPLE_ACCOUNT_A, SIMPLE_ACCOUNT_ABI, provider);
    const nonce = await accountContract.getNonce();
    console.log(`Current nonce: ${nonce}`);
    console.log('');

    console.log('4️⃣ Generating UserOperation...');
    const transferAmount = ethers.parseUnits('0.001', decimals);
    console.log(`Transfer amount: 0.001 ${symbol}`);

    // Generate transfer calldata
    const transferCalldata = tokenContract.interface.encodeFunctionData('transfer', [
      CONFIG.SIMPLE_ACCOUNT_B,
      transferAmount
    ]);

    // Generate execute calldata for SimpleAccount
    const executeCalldata = accountContract.interface.encodeFunctionData('execute', [
      CONFIG.PNT_TOKEN_ADDRESS,
      0,
      transferCalldata
    ]);

    // Create UserOperation
    const userOp = {
      sender: CONFIG.SIMPLE_ACCOUNT_A,
      nonce: `0x${nonce.toString(16)}`,
      initCode: '0x',
      callData: executeCalldata,
      callGasLimit: '0x5208',
      verificationGasLimit: '0x186a0',
      preVerificationGas: '0xB61C', // 46620 - sufficient for bundler
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      paymasterAndData: '0x',
      signature: '0x'
    };

    console.log('✅ UserOperation generated');
    console.log(`Sender: ${userOp.sender}`);
    console.log(`Nonce: ${userOp.nonce}`);
    console.log(`CallData length: ${userOp.callData.length - 2}`);
    console.log('');

    console.log('5️⃣ Processing through NEW aNodePaymaster...');
    const startTime = Date.now();
    
    const response = await fetch(`${CONFIG.PAYMASTER_URL}/api/v1/paymaster/process`, {
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

    const paymasterResult = await response.json();
    const processingTime = Date.now() - startTime;

    console.log('✅ NEW Paymaster processing successful!');
    console.log(`Payment method: ${paymasterResult.paymentMethod}`);
    console.log(`PaymasterAndData length: ${paymasterResult.userOperation.paymasterAndData.length - 2}`);
    console.log(`Processing time: ${processingTime}ms`);
    console.log('');

    // Update userOp with paymaster data
    userOp.paymasterAndData = paymasterResult.userOperation.paymasterAndData;

    console.log('6️⃣ Signing UserOperation...');
    
    // Calculate UserOpHash using EntryPoint
    const entryPointInterface = new ethers.Interface([
      'function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)'
    ]);

    // Convert userOp to tuple format for EntryPoint
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
    ], provider);

    const userOpHash = await entryPointContract.getUserOpHash(userOpTuple);
    console.log(`UserOpHash: ${userOpHash}`);

    // Sign the hash using signMessage (for v0.6 SimpleAccount compatibility)
    const signature = await wallet.signMessage(ethers.getBytes(userOpHash));
    userOp.signature = signature;

    console.log('✅ UserOperation signed');
    console.log(`Signature length: ${signature.length - 2}`);
    console.log('');

    console.log('7️⃣ Final UserOperation with NEW Paymaster:');
    console.log('========================');
    console.log(JSON.stringify(userOp, null, 2));
    console.log('');

    console.log('🎉 NEW Paymaster Test Completed Successfully!');
    console.log('==========================================');
    console.log('📋 Test Summary:');
    console.log('✅ Token information retrieved');
    console.log('✅ Account balances checked');
    console.log('✅ Nonce obtained from SimpleAccount');
    console.log('✅ UserOperation generated for ERC20 transfer');
    console.log('✅ NEW Paymaster processing successful');
    console.log('✅ UserOperation signed');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('1. The UserOperation above uses the NEW paymaster contract');
    console.log('2. Submit via Alchemy Bundler to test AA33 fix');
    console.log('3. Monitor transaction execution on Sepolia');
    console.log('');
    console.log(`🚀 NEW Paymaster (${CONFIG.NEW_PAYMASTER_ADDRESS}) is ready for testing!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
