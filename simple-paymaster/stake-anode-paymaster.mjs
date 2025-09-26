import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N');
const signer = new ethers.Wallet('0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81', provider);

// aNodePaymaster address
const anodePaymasterAddress = '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51';
const entryPointAddress = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const paymasterAbi = [
  'function addStake(uint32 unstakeDelaySec) external payable',
  'function unlockStake() external',
  'function withdrawStake(address payable withdrawAddress) external',
  'function getDeposit() public view returns (uint256)',
  'function deposit() public payable',
  'function owner() public view returns (address)',
  'function entryPoint() public view returns (address)'
];

const entryPointAbi = [
  'function getDepositInfo(address account) view returns (tuple(uint256 stake, uint112 unstakeDelaySec, uint48 withdrawTime))'
];

const paymaster = new ethers.Contract(anodePaymasterAddress, paymasterAbi, signer);
const entryPoint = new ethers.Contract(entryPointAddress, entryPointAbi, provider);

async function checkStakeInfo() {
  const depositInfo = await entryPoint.getDepositInfo(anodePaymasterAddress);
  console.log('=== 当前Stake状态 ===');
  console.log('Stake:', ethers.formatEther(depositInfo[0]), 'ETH');
  console.log('UnstakeDelay:', Number(depositInfo[1]), '秒');
  console.log('WithdrawTime:', Number(depositInfo[2]));
  console.log('满足Alchemy要求 (>=86400):', Number(depositInfo[1]) >= 86400);
  return depositInfo;
}

async function depositToPaymaster() {
  try {
    console.log('=== 给aNodePaymaster充值 (通过EntryPoint deposit) ===');

    // 检查当前状态
    console.log('充值前状态:');
    await checkStakeInfo();

    // 通过deposit函数给EntryPoint充值
    const depositAmount = ethers.parseEther('0.01'); // 0.01 ETH

    console.log(`\n正在调用deposit() with ${ethers.formatEther(depositAmount)} ETH...`);
    const tx = await paymaster.deposit({ value: depositAmount });
    console.log('交易已发送:', tx.hash);

    const receipt = await tx.wait();
    console.log('交易已确认，block:', receipt.blockNumber);

    // 检查最终状态
    console.log('\n充值后状态:');
    await checkStakeInfo();

    console.log('\n✅ Paymaster充值成功！');

  } catch (error) {
    console.error('❌ 充值失败:', error.message);
    if (error.data) {
      console.error('错误数据:', error.data);
    }
  }
}

async function depositToEntryPoint() {
  try {
    console.log('=== 直接给EntryPoint deposit (给paymaster账户充值) ===');

    console.log('deposit前状态:');
    await checkStakeInfo();

    // 直接调用EntryPoint的depositTo函数，给paymaster账户充值
    const depositAmount = ethers.parseEther('0.01');

    console.log(`\n正在调用entryPoint.depositTo(paymaster) with ${ethers.formatEther(depositAmount)} ETH...`);

    // 直接调用EntryPoint的depositTo函数
    const entryPointContract = new ethers.Contract(entryPointAddress, [
      'function depositTo(address account) external payable'
    ], signer);

    const tx = await entryPointContract.depositTo(anodePaymasterAddress, { value: depositAmount });
    console.log('交易已发送:', tx.hash);

    const receipt = await tx.wait();
    console.log('交易已确认，block:', receipt.blockNumber);

    console.log('\ndeposit后状态:');
    await checkStakeInfo();

    console.log('\n✅ EntryPoint deposit成功！');

  } catch (error) {
    console.error('❌ EntryPoint deposit失败:', error.message);
  }
}

async function main() {
  await depositToEntryPoint();
}

main();
