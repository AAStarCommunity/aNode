'use client'

import { useState, useRef } from 'react'
import { createSmartAccountClient } from 'permissionless'
import { toSafeSmartAccount } from 'permissionless/accounts'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import { createPublicClient, http, parseEther, formatEther, Hex, Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { entryPoint07Address } from 'viem/account-abstraction'
import { Send, Settings, Play, CheckCircle, XCircle, Clock } from 'lucide-react'

// Configuration interface
interface Config {
  privateKey: string
  paymasterRpcUrl: string
  bundlerRpcUrl: string
  paymasterContractAddress: string
  recipientAddress: string
  transferAmount: string
  paymentMode: 'sponsorship' | 'erc20'
  tokenAddress?: string
  sponsorshipPolicyId?: string
}

// Log entry interface
interface LogEntry {
  timestamp: Date
  level: 'info' | 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export default function Home() {
  // Configuration state
  const [config, setConfig] = useState<Config>({
    privateKey: '',
    paymasterRpcUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_API_KEY',
    bundlerRpcUrl: 'https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_API_KEY',
    paymasterContractAddress: '0x0000000000000039cd5e8ae05257ce51c473ddd1',
    recipientAddress: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    transferAmount: '0.001',
    paymentMode: 'sponsorship',
    sponsorshipPolicyId: 'free_test_policy'
  })

  // Application state
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Logging function
  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      details
    }
    setLogs(prev => [...prev, logEntry])
  }

  // Auto-scroll to bottom of logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Execute the UserOperation flow
  const executeUserOperation = async () => {
    if (!config.privateKey) {
      addLog('error', 'Private key is required')
      return
    }

    setIsRunning(true)
    addLog('info', '🚀 Starting UserOperation execution...')

    try {
      // Step 1: Setup clients
      addLog('info', 'Setting up blockchain clients...')

      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http("https://rpc.ankr.com/eth_sepolia")
      })

      const paymasterClient = createPimlicoClient({
        transport: http(config.paymasterRpcUrl),
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7"
        }
      })

      const bundlerClient = createPimlicoClient({
        transport: http(config.bundlerRpcUrl),
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7"
        }
      })

      // Step 2: Create smart account
      addLog('info', 'Creating smart account...')
      const owner = privateKeyToAccount(config.privateKey as Hex)

      const smartAccount = await toSafeSmartAccount({
        client: publicClient,
        owner: owner,
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7"
        },
        version: "1.4.1"
      })

      addLog('success', `Smart account created: ${smartAccount.address}`)

      // Step 3: Create smart account client
      addLog('info', 'Setting up smart account client with aPaymaster...')

      const smartAccountClient = createSmartAccountClient({
        account: smartAccount,
        chain: sepolia,
        bundlerTransport: http(config.bundlerRpcUrl),
        paymaster: paymasterClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            const gasPrice = await bundlerClient.getUserOperationGasPrice()
            addLog('info', `Gas prices - Fast: ${formatEther(gasPrice.fast.maxFeePerGas)} ETH, ${gasPrice.fast.maxPriorityFeePerGas} wei`)
            return gasPrice.fast
          }
        }
      })

      // Step 4: Prepare UserOperation
      addLog('info', 'Preparing UserOperation...')

      const transferAmount = parseEther(config.transferAmount)
      addLog('info', `Transfer amount: ${config.transferAmount} ETH (${transferAmount} wei)`)

      const userOpParams: any = {
        calls: [{
          to: config.recipientAddress as Address,
          value: transferAmount,
          data: "0x" as Hex
        }]
      }

      // Add payment context for ERC-20 mode
      if (config.paymentMode === 'erc20' && config.tokenAddress) {
        userOpParams.paymasterContext = {
          token: config.tokenAddress
        }
        addLog('info', `Using ERC-20 payment mode with token: ${config.tokenAddress}`)
      } else {
        addLog('info', 'Using sponsorship payment mode')
      }

      // Step 5: Send transaction (this triggers the full flow)
      addLog('info', 'Submitting UserOperation to aPaymaster...')

      const txHash = await smartAccountClient.sendTransaction(userOpParams)

      addLog('success', `✅ UserOperation submitted successfully!`)
      addLog('success', `Transaction hash: ${txHash}`)

      // Step 6: Wait for confirmation
      addLog('info', 'Waiting for transaction confirmation...')

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash
      })

      addLog('success', `🎉 Transaction confirmed!`)
      addLog('info', `Block number: ${receipt.blockNumber}`)
      addLog('info', `Gas used: ${receipt.gasUsed}`)

    } catch (error: any) {
      addLog('error', `❌ Execution failed: ${error.message}`)
      console.error('Detailed error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  // Update configuration
  const updateConfig = (key: keyof Config, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">aPaymaster Demo</h1>
              <span className="ml-2 text-sm text-gray-500">ERC-4337 UserOperation Testing</span>
            </div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Configuration Panel */}
          {showConfig && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Configuration</h2>

              <div className="space-y-4">
                {/* Private Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Private Key (hex)
                  </label>
                  <input
                    type="password"
                    value={config.privateKey}
                    onChange={(e) => updateConfig('privateKey', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0x..."
                  />
                </div>

                {/* RPC URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paymaster RPC URL
                  </label>
                  <input
                    type="text"
                    value={config.paymasterRpcUrl}
                    onChange={(e) => updateConfig('paymasterRpcUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bundler RPC URL
                  </label>
                  <input
                    type="text"
                    value={config.bundlerRpcUrl}
                    onChange={(e) => updateConfig('bundlerRpcUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Contract Addresses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paymaster Contract Address
                  </label>
                  <input
                    type="text"
                    value={config.paymasterContractAddress}
                    onChange={(e) => updateConfig('paymasterContractAddress', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Transaction Parameters */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={config.recipientAddress}
                    onChange={(e) => updateConfig('recipientAddress', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer Amount (ETH)
                  </label>
                  <input
                    type="text"
                    value={config.transferAmount}
                    onChange={(e) => updateConfig('transferAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="sponsorship"
                        checked={config.paymentMode === 'sponsorship'}
                        onChange={(e) => updateConfig('paymentMode', e.target.value)}
                        className="mr-2"
                      />
                      Sponsorship
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="erc20"
                        checked={config.paymentMode === 'erc20'}
                        onChange={(e) => updateConfig('paymentMode', e.target.value)}
                        className="mr-2"
                      />
                      ERC-20
                    </label>
                  </div>
                </div>

                {/* ERC-20 Token Address */}
                {config.paymentMode === 'erc20' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token Address
                    </label>
                    <input
                      type="text"
                      value={config.tokenAddress || ''}
                      onChange={(e) => updateConfig('tokenAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0x..."
                    />
                  </div>
                )}

                {/* Sponsorship Policy */}
                {config.paymentMode === 'sponsorship' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sponsorship Policy ID
                    </label>
                    <input
                      type="text"
                      value={config.sponsorshipPolicyId || ''}
                      onChange={(e) => updateConfig('sponsorshipPolicyId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Control Panel</h2>

            <div className="space-y-4">
              <button
                onClick={executeUserOperation}
                disabled={isRunning || !config.privateKey}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                {isRunning ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Execute UserOperation
                  </>
                )}
              </button>

              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Current Configuration:</strong></p>
                <p>Payment Mode: {config.paymentMode}</p>
                <p>Amount: {config.transferAmount} ETH</p>
                <p>Recipient: {config.recipientAddress.slice(0, 10)}...</p>
              </div>
            </div>
          </div>

          {/* Logs Panel - Full Width */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Execution Logs</h2>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-2">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No logs yet. Configure and execute a UserOperation to see the flow.
                </p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
                    log.level === 'success' ? 'bg-green-50 border border-green-200' :
                    log.level === 'error' ? 'bg-red-50 border border-red-200' :
                    log.level === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    {log.level === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
                    {log.level === 'error' && <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
                    {log.level === 'warning' && <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />}
                    {log.level === 'info' && <div className="w-5 h-5 bg-blue-600 rounded-full mt-0.5 flex-shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          log.level === 'success' ? 'bg-green-100 text-green-800' :
                          log.level === 'error' ? 'bg-red-100 text-red-800' :
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{log.message}</p>
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                            Show Details
                          </summary>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
