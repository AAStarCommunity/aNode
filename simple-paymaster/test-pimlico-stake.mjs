import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N');
const signer = new ethers.Wallet('0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81', provider);

// Pimlico paymaster address
const pimlicoPaymasterAddress = '0xdaf2aBA9109BD31e945B0695d893fBDc283d68d1';
const entryPointAddress = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const paymasterAbi = [
  'function addStake(uint32 unstakeDelaySec) external payable',
  'function getDeposit() public view returns (uint256)',
  'function unlockStake() external',
  'function withdrawStake(address payable withdrawAddress) external',
  'function deposit() public payable'
];

const entryPointAbi = [
  'function getDepositInfo(address account) view returns (tuple(uint256 stake, uint112 unstakeDelaySec, uint48 withdrawTime))'
];

const paymaster = new ethers.Contract(pimlicoPaymasterAddress, paymasterAbi, signer);
const entryPoint = new ethers.Contract(entryPointAddress, entryPointAbi, provider);

async function checkStakeInfo() {
  const info = await entryPoint.getDepositInfo(pimlicoPaymasterAddress);
  console.log('=== Stake状态 ===');
  console.log('Stake:', ethers.formatEther(info[0]), 'ETH');
  console.log('UnstakeDelay:', Number(info[1]), '秒');
  console.log('WithdrawTime:', Number(info[2]));
  console.log('满足Alchemy要求 (>=86400):', Number(info[1]) >= 86400);
  return info;
}

async function testAddStake() {
  try {
    console.log('=== 测试Pimlico Paymaster addStake ===');

    // 检查初始状态
    console.log('初始状态:');
    await checkStakeInfo();

    // 尝试添加stake，设置unstakeDelay为86400秒 (1天)
    console.log('\n正在调用addStake(86400) with 0.01 ETH...');
    const tx = await paymaster.addStake(86400, { value: ethers.parseEther('0.01') });
    console.log('交易已发送:', tx.hash);

    const receipt = await tx.wait();
    console.log('交易已确认，block:', receipt.blockNumber);

    // 检查最终状态
    console.log('\n最终状态:');
    await checkStakeInfo();

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.data) {
      console.error('错误数据:', error.data);
    }
  }
}

testAddStake();
