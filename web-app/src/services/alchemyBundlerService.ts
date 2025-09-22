import { Alchemy, Network, AlchemySettings } from 'alchemy-sdk';

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
    this.entryPointVersion = entryPointVersion;
    this.entryPointAddress = AlchemyBundlerService.ENTRY_POINTS[entryPointVersion];

    console.log(`✅ Alchemy Bundler 初始化完成:`, {
      network: network,
      entryPointVersion: entryPointVersion,
      entryPointAddress: this.entryPointAddress
    });
  }

  /**
   * 获取支持的 EntryPoint 地址列表
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    try {
      const response = await this.alchemy.core.send(
        'eth_supportedEntryPoints',
        []
      );
      console.log('📋 支持的 EntryPoints:', response);
      return response;
    } catch (error) {
      console.error('❌ 获取支持的 EntryPoints 失败:', error);
      // 返回默认值
      return [this.entryPointAddress];
    }
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

      const supportedEntryPoints = await this.getSupportedEntryPoints();

      return {
        isHealthy: true,
        supportedEntryPoints,
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
}