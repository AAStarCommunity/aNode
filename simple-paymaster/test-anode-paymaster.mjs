import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/Bx4QRW1-vnwJUePSAAD7N');
const signer = new ethers.Wallet('0x2717524c39f8b8ab74c902dc712e590fee36993774119c1e06d31daa4b0fbc81', provider);

// aNodePaymaster address (新部署的)
const anodePaymasterAddress = '0x321eb27ca443ed279503b121e1e0c8d87a4f4b51';
const entryPointAddress = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

const paymasterAbi = [
  'function validatePaymasterUserOp((address,uint256,bytes,bytes,address,uint256,uint256,uint256,uint256,bytes,bytes) userOp, bytes32 userOpHash, uint256 maxCost) returns (bytes, uint256)',
  'function postOp(uint8 mode, bytes context, uint256 actualGasCost)',
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

async function testPaymaster() {
  try {
    console.log('=== 测试aNodePaymaster ===');
    console.log('地址:', anodePaymasterAddress);

    // 检查基本信息
    const owner = await paymaster.owner();
    const entryPointAddr = await paymaster.entryPoint();
    const deposit = await paymaster.getDeposit();

    console.log('Owner:', owner);
    console.log('EntryPoint:', entryPointAddr);
    console.log('Deposit:', ethers.formatEther(deposit), 'ETH');

    // 检查EntryPoint中的存款信息
    const depositInfo = await entryPoint.getDepositInfo(anodePaymasterAddress);
    console.log('EntryPoint存款信息:');
    console.log('- Stake:', ethers.formatEther(depositInfo[0]), 'ETH');
    console.log('- UnstakeDelay:', Number(depositInfo[1]), '秒');
    console.log('- WithdrawTime:', Number(depositInfo[2]));

    // 如果存款为0，添加一些存款
    if (deposit === 0n) {
      console.log('\n正在添加0.01 ETH存款...');
      const tx = await paymaster.deposit({ value: ethers.parseEther('0.01') });
      await tx.wait();
      console.log('存款添加成功');

      const newDeposit = await paymaster.getDeposit();
      console.log('新存款余额:', ethers.formatEther(newDeposit), 'ETH');
    }

    console.log('\n✅ aNodePaymaster测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.data) {
      console.error('错误数据:', error.data);
    }
  }
}

testPaymaster();
