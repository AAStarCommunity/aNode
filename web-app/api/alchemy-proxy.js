/**
 * Alchemy API Proxy
 * 为了避免在前端暴露 API key，通过后端代理转发请求
 */

import { createAlchemyPublicRpcClient, alchemy } from '@account-kit/infra';
import { sepolia } from '@account-kit/infra';

// 从环境变量获取 API key（服务端环境变量，不会暴露到前端）
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { method, params } = req.body;

    // 创建 Alchemy transport
    const transport = alchemy({
      apiKey: ALCHEMY_API_KEY
    });

    // 创建 RPC 客户端
    const client = createAlchemyPublicRpcClient({
      chain: sepolia,
      transport: transport,
    });

    // 转发请求到 Alchemy
    const result = await client.request({
      method: method,
      params: params
    });

    res.status(200).json({ result });
  } catch (error) {
    console.error('Alchemy Proxy Error:', error);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message
    });
  }
}