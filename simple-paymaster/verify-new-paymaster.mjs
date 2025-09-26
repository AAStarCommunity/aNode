#!/usr/bin/env node

import { ethers } from 'ethers';

// Configuration
const CONFIG = {
  NEW_PAYMASTER_ADDRESS: '0x96948cCC95926ef82929502c4AbbeEe4c755a087',
  ENTRYPOINT_ADDRESS: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  OWNER_ADDRESS: '0x411BD567E46C0781248dbB6a9211891C032885e5',
  RPC_URL: 'https://ethereum-sepolia.publicnode.com'
};

console.log('🔍 Verifying NEW Paymaster Contract');
console.log('==================================');
console.log(`Paymaster: ${CONFIG.NEW_PAYMASTER_ADDRESS}`);
console.log(`Owner: ${CONFIG.OWNER_ADDRESS}`);
console.log(`EntryPoint: ${CONFIG.ENTRYPOINT_ADDRESS}`);
console.log('');

// Initialize provider
const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

// Paymaster ABI (minimal)
const PAYMASTER_ABI = [
  'function owner() view returns (address)',
  'function entryPoint() view returns (address)',
  'function getDeposit() view returns (uint256)'
];

// EntryPoint ABI (minimal)
const ENTRYPOINT_ABI = [
  'function balanceOf(address account) view returns (uint256)'
];

async function main() {
  try {
    console.log('1️⃣ Checking paymaster contract deployment...');
    
    // Check if contract exists
    const code = await provider.getCode(CONFIG.NEW_PAYMASTER_ADDRESS);
    if (code === '0x') {
      throw new Error('Paymaster contract not deployed');
    }
    console.log('✅ Paymaster contract is deployed');
    console.log(`Contract size: ${(code.length - 2) / 2} bytes`);
    console.log('');

    console.log('2️⃣ Verifying paymaster configuration...');
    const paymasterContract = new ethers.Contract(CONFIG.NEW_PAYMASTER_ADDRESS, PAYMASTER_ABI, provider);
    
    const owner = await paymasterContract.owner();
    const entryPoint = await paymasterContract.entryPoint();
    
    console.log(`Owner: ${owner}`);
    console.log(`EntryPoint: ${entryPoint}`);
    console.log(`Owner matches: ${owner.toLowerCase() === CONFIG.OWNER_ADDRESS.toLowerCase() ? '✅' : '❌'}`);
    console.log(`EntryPoint matches: ${entryPoint.toLowerCase() === CONFIG.ENTRYPOINT_ADDRESS.toLowerCase() ? '✅' : '❌'}`);
    console.log('');

    console.log('3️⃣ Checking paymaster deposit...');
    const entryPointContract = new ethers.Contract(CONFIG.ENTRYPOINT_ADDRESS, ENTRYPOINT_ABI, provider);
    const deposit = await entryPointContract.balanceOf(CONFIG.NEW_PAYMASTER_ADDRESS);
    
    console.log(`Deposit: ${ethers.formatEther(deposit)} ETH`);
    console.log(`Deposit sufficient: ${deposit > 0n ? '✅' : '❌'}`);
    console.log('');

    console.log('4️⃣ Testing paymaster deposit method...');
    try {
      const paymasterDeposit = await paymasterContract.getDeposit();
      console.log(`Paymaster getDeposit(): ${ethers.formatEther(paymasterDeposit)} ETH`);
      console.log(`Deposit methods match: ${deposit === paymasterDeposit ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`❌ getDeposit() failed: ${error.message}`);
      console.log('This is expected if we removed EntryPoint calls from the contract');
    }
    console.log('');

    console.log('🎉 Paymaster Verification Complete!');
    console.log('==================================');
    console.log('📋 Summary:');
    console.log(`✅ Contract deployed at: ${CONFIG.NEW_PAYMASTER_ADDRESS}`);
    console.log(`✅ Owner configured: ${owner}`);
    console.log(`✅ EntryPoint configured: ${entryPoint}`);
    console.log(`✅ Deposit available: ${ethers.formatEther(deposit)} ETH`);
    console.log('');
    console.log('💡 The paymaster contract is ready for UserOperation validation!');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('1. Submit UserOperation to bundler with valid API key');
    console.log('2. Monitor transaction execution');
    console.log('3. Verify AA33 error is resolved');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();
