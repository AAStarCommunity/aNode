import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N');
const signer = new ethers.Wallet('0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81', provider);

// Pimlico paymaster address (EntryPoint v0.7)
const pimlicoPaymasterAddress = '0x44A2F474b395cf946950620c4A4df1406fA9383d';
const entryPointAddress = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

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
    console.log('=== 测试Pimlico Paymaster (EntryPoint v0.7) addStake ===');

    // 检查初始状态
    console.log('初始状态:');
    await checkStakeInfo();

    // 测试不同的unstakeDelay值
    const testDelays = [30, 300, 3600, 86400, 604800]; // 30秒, 5分钟, 1小时, 1天, 1周

    for (const delay of testDelays) {
      console.log(`\n正在调用addStake(${delay}) with 0.01 ETH...`);
      try {
        const tx = await paymaster.addStake(delay, { value: ethers.parseEther('0.01') });
        console.log('交易已发送:', tx.hash);
        const receipt = await tx.wait();
        console.log('交易已确认，block:', receipt.blockNumber);

        console.log(`addStake(${delay})后的状态:`);
        await checkStakeInfo();
      } catch (error) {
        console.error(`addStake(${delay})失败:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.data) {
      console.error('错误数据:', error.data);
    }
  }
}

testAddStake();
