import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';
import { createAlchemyPublicRpcClient, alchemy, sepolia, optimism, optimismSepolia } from '@account-kit/infra';
import { createModularAccountV2Client } from '@account-kit/smart-contracts';
import { LocalAccountSigner } from '@aa-sdk/core';
import { entryPoint07Address } from 'viem/account-abstraction';
import type { Hash, Chain, Transport } from 'viem';

export interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export interface UserOperationGasEstimate {
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface UserOperationReceipt {
  userOpHash: string;
  entryPoint: string;
  sender: string;
  nonce: string;
  paymaster?: string;
  actualGasCost: string;
  actualGasUsed: string;
  success: boolean;
  reason?: string;
  receipt: {
    transactionHash: string;
    blockNumber: number;
    blockHash: string;
    logs: any[];
  };
}

export class AlchemyBundlerService {
  private alchemy: Alchemy;
  private entryPointVersion: string;
  private entryPointAddress: string;
  private apiKey: string;
  private network: Network;
  private chain: Chain;
  private transport: Transport;

  // EntryPoint addresses for different versions
  private static readonly ENTRY_POINTS = {
    '0.6': '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    '0.7': '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
  };

  constructor(
    apiKey: string,
    network: Network = Network.ETH_SEPOLIA,
    entryPointVersion: '0.6' | '0.7' = '0.6'
  ) {
    const settings: AlchemySettings = {
      apiKey,
      network,
    };

    this.alchemy = new Alchemy(settings);
    this.apiKey = apiKey;
    this.network = network;
    this.entryPointVersion = entryPointVersion;
    this.entryPointAddress = AlchemyBundlerService.ENTRY_POINTS[entryPointVersion];

    // Initialize Account Kit chain and transport
    this.chain = this.getChainFromNetwork(network);

    // Use alchemy transport with API key only (no direct URL to avoid exposure)
    this.transport = alchemy({
      apiKey: apiKey
    });

    console.log(`✅ Alchemy Bundler 初始化完成:`, {
      network: network,
      entryPointVersion: entryPointVersion,
      entryPointAddress: this.entryPointAddress,
      apiKey: apiKey.substring(0, 8) + '...',
      transport: 'Account Kit Alchemy Transport'
    });
  }

  /**
   * 获取 Alchemy 网络字符串
   */
  private getAlchemyNetworkString(network: Network): string {
    switch (network) {
      case Network.ETH_SEPOLIA:
        return 'eth-sepolia';
      case Network.OPT_SEPOLIA:
        return 'opt-sepolia';
      case Network.OPT_MAINNET:
        return 'opt-mainnet';
      default:
        return 'eth-sepolia';
    }
  }

  /**
   * 将 Alchemy Network 转换为 Account Kit Chain
   */
  private getChainFromNetwork(network: Network): Chain {
    switch (network) {
      case Network.ETH_SEPOLIA:
        return sepolia;
      case Network.OPT_SEPOLIA:
        return optimismSepolia;
      case Network.OPT_MAINNET:
        return optimism;
      default:
        return sepolia;
    }
  }

  /**
   * 获取支持的 EntryPoint 地址列表
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    // Alchemy 不支持 eth_supportedEntryPoints API，直接返回配置的 EntryPoints
    console.log('📋 Alchemy 支持的 EntryPoints (配置值):', [this.entryPointAddress]);
    return [this.entryPointAddress];
  }

  /**
   * 估算 UserOperation 的 Gas 费用
   */
  async estimateUserOperationGas(
    userOp: Partial<UserOperation>,
    entryPoint?: string
  ): Promise<UserOperationGasEstimate> {
    try {
      const entryPointAddr = entryPoint || this.entryPointAddress;

      console.log('⛽ 估算 UserOperation Gas:', {
        userOp: userOp,
        entryPoint: entryPointAddr,
        version: this.entryPointVersion
      });

      const response = await this.alchemy.core.send(
        'eth_estimateUserOperationGas',
        [userOp, entryPointAddr]
      );

      console.log('✅ Gas 估算结果:', response);
      return response;
    } catch (error) {
      console.error('❌ Gas 估算失败:', error);
      throw error;
    }
  }

  /**
   * 发送 UserOperation 到 Bundler
   */
  async sendUserOperation(
    userOp: UserOperation,
    entryPoint?: string
  ): Promise<string> {
    try {
      const entryPointAddr = entryPoint || this.entryPointAddress;

      console.log('🚀 发送 UserOperation:', {
        userOp: userOp,
        entryPoint: entryPointAddr,
        version: this.entryPointVersion
      });

      const userOpHash = await this.alchemy.core.send(
        'eth_sendUserOperation',
        [userOp, entryPointAddr]
      );

      console.log('✅ UserOperation 已发送，Hash:', userOpHash);
      return userOpHash;
    } catch (error) {
      console.error('❌ 发送 UserOperation 失败:', error);
      throw error;
    }
  }

  /**
   * 根据 hash 获取 UserOperation
   */
  async getUserOperationByHash(userOpHash: string): Promise<any> {
    try {
      console.log('🔍 查询 UserOperation:', userOpHash);

      const response = await this.alchemy.core.send(
        'eth_getUserOperationByHash',
        [userOpHash]
      );

      console.log('✅ UserOperation 详情:', response);
      return response;
    } catch (error) {
      console.error('❌ 查询 UserOperation 失败:', error);
      throw error;
    }
  }

  /**
   * 获取 UserOperation 回执
   */
  async getUserOperationReceipt(userOpHash: string): Promise<UserOperationReceipt | null> {
    try {
      console.log('📄 获取 UserOperation 回执:', userOpHash);

      const response = await this.alchemy.core.send(
        'eth_getUserOperationReceipt',
        [userOpHash]
      );

      console.log('✅ UserOperation 回执:', response);
      return response;
    } catch (error) {
      console.error('❌ 获取回执失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐的优先费用
   */
  async getMaxPriorityFeePerGas(): Promise<string> {
    try {
      console.log('💰 获取推荐优先费用');

      const response = await this.alchemy.core.send(
        'rundler_maxPriorityFeePerGas',
        []
      );

      console.log('✅ 推荐优先费用:', response);
      return response;
    } catch (error) {
      console.error('❌ 获取优先费用失败:', error);
      // 返回默认值 1 gwei
      return '0x3b9aca00';
    }
  }

  /**
   * 检查 Bundler 状态
   */
  async checkBundlerStatus(): Promise<{
    isHealthy: boolean;
    supportedEntryPoints: string[];
    network: string;
    version: string;
  }> {
    try {
      console.log('🔧 检查 Alchemy Bundler 状态');

      // 测试基本连通性，使用标准的 eth_chainId 调用
      await this.alchemy.core.send('eth_chainId', []);

      return {
        isHealthy: true,
        supportedEntryPoints: [this.entryPointAddress],
        network: this.alchemy.config.network || 'unknown',
        version: this.entryPointVersion
      };
    } catch (error) {
      console.error('❌ Bundler 状态检查失败:', error);
      return {
        isHealthy: false,
        supportedEntryPoints: [],
        network: 'unknown',
        version: this.entryPointVersion
      };
    }
  }

  /**
   * 获取当前 EntryPoint 地址
   */
  getEntryPointAddress(): string {
    return this.entryPointAddress;
  }

  /**
   * 获取当前 EntryPoint 版本
   */
  getEntryPointVersion(): string {
    return this.entryPointVersion;
  }

  /**
   * 切换 EntryPoint 版本
   */
  setEntryPointVersion(version: '0.6' | '0.7') {
    this.entryPointVersion = version;
    this.entryPointAddress = AlchemyBundlerService.ENTRY_POINTS[version];
    console.log(`🔄 EntryPoint 版本已切换到 v${version}:`, this.entryPointAddress);
  }

  /**
   * 获取网络信息
   */
  getNetworkInfo() {
    return {
      network: this.alchemy.config.network,
      apiKey: this.alchemy.config.apiKey ? '***' : undefined
    };
  }

  /**
   * 使用 Account Kit 执行代币转账 (正确的 ModularAccount 实现)
   */
  async executeTokenTransferWithAccountKit(
    privateKey: string,
    toAddress: string,
    tokenAddress: string,
    amount: string,
    policyId?: string  // 可选的 Gas 赞助 policy
  ): Promise<{ hash: string; receipt: any }> {
    console.log('🚀 使用 Account Kit 执行转账 (ModularAccount):', {
      toAddress,
      tokenAddress,
      amount,
      entryPointVersion: this.entryPointVersion,
      policyId: policyId || 'none'
    });

    try {
      // 创建 ModularAccountV2 客户端 - 按照示例的正确方式
      const clientConfig: any = {
        signer: LocalAccountSigner.privateKeyToAccountSigner(privateKey as `0x${string}`),
        chain: this.chain,
        transport: this.transport,
      };

      // 如果有 policyId，添加 Gas 赞助支持
      if (policyId) {
        clientConfig.policyId = policyId;
        console.log('💰 启用 Gas 赞助，Policy ID:', policyId);
      }

      const client = await createModularAccountV2Client(clientConfig);

      console.log('✅ ModularAccount 客户端创建成功');
      console.log('📍 ModularAccount 地址:', client.account.address);

      // 构建转账 UserOperation - 使用 Account Kit 的标准方式
      const { hash } = await client.sendUserOperation({
        uo: {
          target: tokenAddress as `0x${string}`,
          data: `0xa9059cbb${toAddress.slice(2).padStart(64, '0')}${BigInt(amount).toString(16).padStart(64, '0')}`,
          value: 0n,
        },
      });

      console.log('✅ UserOperation 已发送，Hash:', hash);

      // 等待交易确认
      console.log('⏳ 等待交易确认...');
      const txHash = await client.waitForUserOperationTransaction({
        hash: hash,
        retries: {
          intervalMs: 1000,
          maxRetries: 60,
          multiplier: 1.1,
        },
      });

      console.log('✅ 交易确认，Tx Hash:', txHash);

      // 获取收据
      const receipt = await client.getUserOperationReceipt(hash);
      console.log('📄 UserOperation 收据:', receipt);

      return {
        hash: hash,
        receipt: receipt
      };

    } catch (error) {
      console.error('❌ Account Kit 转账失败:', error);
      throw error;
    }
  }

  /**
   * 获取 ModularAccount 地址 (不创建实际账户)
   */
  async getModularAccountAddress(privateKey: string): Promise<string> {
    try {
      const client = await createModularAccountV2Client({
        signer: LocalAccountSigner.privateKeyToAccountSigner(privateKey as `0x${string}`),
        chain: this.chain,
        transport: this.transport,
      });

      console.log('📍 ModularAccount 地址:', client.account.address);
      return client.account.address;
    } catch (error) {
      console.error('❌ 获取 ModularAccount 地址失败:', error);
      throw error;
    }
  }

  /**
   * 模拟 UserOperation 资产变化 (使用 Alchemy 特有的 API)
   */
  async simulateUserOperationAssetChanges(
    userOp: any,
    entryPoint?: string,
    blockTag?: string
  ): Promise<any> {
    try {
      const entryPointAddr = entryPoint || this.entryPointAddress;
      const blockTagValue = blockTag || 'latest';

      console.log('🔮 模拟 UserOperation 资产变化...');

      const response = await this.alchemy.core.send(
        'alchemy_simulateUserOperationAssetChanges',
        [userOp, entryPointAddr, blockTagValue]
      );

      console.log('✅ 资产变化模拟结果:', response);
      return response;
    } catch (error) {
      console.error('❌ 资产变化模拟失败:', error);
      throw error;
    }
  }

  /**
   * 检查 ModularAccount 是否已部署
   */
  async isModularAccountDeployed(accountAddress: string): Promise<boolean> {
    try {
      const code = await this.alchemy.core.getCode(accountAddress);
      const isDeployed = code !== '0x';
      console.log(`🔍 ModularAccount ${accountAddress} 部署状态:`, isDeployed);
      return isDeployed;
    } catch (error) {
      console.error('❌ 检查账户部署状态失败:', error);
      return false;
    }
  }

  /**
   * 使用 Account Kit Public RPC 客户端获取 UserOperation
   */
  async getUserOperationByHashWithAccountKit(uoHash: Hash): Promise<any> {
    try {
      const client = createAlchemyPublicRpcClient({
        chain: this.chain,
        transport: this.transport,
      });

      const userOp = await client.getUserOperationByHash(uoHash);
      console.log('Account Kit - User Operation:', userOp);
      return userOp;
    } catch (error) {
      console.error('Account Kit - 获取 UserOperation 失败:', error);
      throw error;
    }
  }

}