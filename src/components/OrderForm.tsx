'use client';

import { useState, useEffect } from 'react';
import { useQuote, useOrder } from '@omni-network/react';
import { parseEther } from 'viem';
import { Chain, mainnet, baseSepolia } from 'wagmi/chains';
import { Asset } from '@/config/assets';
import { useNetwork as useNetworkContext } from '@/context/NetworkContext';
import { getSupportedAssets } from '@/config/assets';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { isAddress } from 'viem';

interface ContractFunction {
  name: string;
  inputs: {
    name: string;
    type: string;
    internalType: string;
  }[];
  stateMutability: string;
}

interface OrderFormProps {
  sourceChain: Chain;
  destinationChain: Chain;
  sourceAsset: Asset | null;
  destinationAsset: Asset | null;
}

export function OrderForm({ sourceChain, destinationChain, sourceAsset, destinationAsset }: OrderFormProps) {
  const { network } = useNetworkContext();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const supportedAssets = getSupportedAssets(network);
  const [amount, setAmount] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [contractABI, setContractABI] = useState<any[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<ContractFunction | null>(null);
  const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});
  const [isLoadingABI, setIsLoadingABI] = useState(false);
  const [abiError, setAbiError] = useState<string | null>(null);
  const [showOrderConfig, setShowOrderConfig] = useState(false);

  // Clear amount when network changes
  useEffect(() => {
    setAmount('');
  }, [network]);

  // Fetch ABI when contract address changes
  useEffect(() => {
    const fetchABI = async () => {
      if (!contractAddress || !isAddress(contractAddress)) {
        setContractABI([]);
        setSelectedFunction(null);
        setFunctionInputs({});
        return;
      }

      setIsLoadingABI(true);
      setAbiError(null);

      try {
        const response = await fetch(`/api/abi?address=${contractAddress}&chainId=${destinationChain.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch ABI');
        }

        if (data.status === '1' && data.result) {
          try {
            const abi = JSON.parse(data.result);
            setContractABI(abi);
          } catch (parseError) {
            throw new Error('Failed to parse ABI JSON');
          }
        } else {
          throw new Error(data.message || data.error || 'Failed to fetch ABI');
        }
      } catch (error) {
        console.error('ABI fetch error:', error);
        setAbiError(error instanceof Error ? error.message : 'Failed to fetch ABI');
        setContractABI([]);
        setSelectedFunction(null);
        setFunctionInputs({});
      } finally {
        setIsLoadingABI(false);
      }
    };

    fetchABI();
  }, [contractAddress, destinationChain.id]);

  // Get write functions from ABI
  const writeFunctions = contractABI.filter(
    (item: any) => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure'
  );

  // Handle function selection
  const handleFunctionSelect = (func: ContractFunction) => {
    setSelectedFunction(func);
    // Initialize empty inputs
    const inputs: Record<string, string> = {};
    func.inputs.forEach(input => {
      inputs[input.name] = '';
    });
    setFunctionInputs(inputs);
  };

  // Handle input change
  const handleInputChange = (name: string, value: string) => {
    setFunctionInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate function inputs
  const areInputsValid = () => {
    if (!selectedFunction) return false;
    return selectedFunction.inputs.every(input => {
      const value = functionInputs[input.name];
      if (!value) return false;
      // Add more validation based on input type if needed
      return true;
    });
  };

  const quote = useQuote({
    srcChainId: sourceChain.id,
    destChainId: destinationChain.id,
    deposit: sourceAsset?.isNative ? {
      isNative: true,
      amount: parseEther(amount || '0'),
    } : {
      isNative: false,
      token: sourceAsset?.address as `0x${string}`,
      amount: parseEther(amount || '0'),
    },
    expense: destinationAsset?.isNative ? {
      isNative: true,
    } : {
      isNative: false,
      token: destinationAsset?.address as `0x${string}`,
      amount: parseEther(amount || '0'),
    },
    mode: 'expense',
    enabled: Boolean(amount && parseFloat(amount) > 0),
  });

  const depositAmt = quote.isSuccess ? quote.deposit.amount : BigInt(0);
  const expenseAmt = quote.isSuccess ? quote.expense.amount : BigInt(0);

  const order = useOrder({
    srcChainId: sourceChain.id,
    destChainId: destinationChain.id,
    deposit: {
      amount: depositAmt,
      ...(sourceAsset?.isNative ? {} : { 
        token: sourceAsset?.address && isAddress(sourceAsset.address) ? sourceAsset.address as `0x${string}` : undefined 
      }),
    },
    expense: {
      amount: expenseAmt,
      ...(destinationAsset?.isNative ? {} : {
        token: destinationAsset?.address && isAddress(destinationAsset.address) ? destinationAsset.address as `0x${string}` : undefined,
        ...(selectedFunction && contractAddress && isAddress(contractAddress) ? { 
          spender: contractAddress as `0x${string}` 
        } : {})
      })
    },
    calls: [{
      target: destinationAsset?.isNative && address ? address as `0x${string}` : '0x0000000000000000000000000000000000000000' as `0x${string}`,
      value: destinationAsset?.isNative && address ? expenseAmt : BigInt(0)
    }],
    validateEnabled: quote.isSuccess,
  });

  const handleExecute = () => {
    if (!quote.isSuccess || !order.isReady || order.validation?.status !== 'accepted') return;
    
    // Check if we need to switch chains based on network toggle
    if (network === 'mainnet' && chainId === baseSepolia.id) {
      switchChain?.({ chainId: mainnet.id });
      return;
    }
    if (network === 'testnet' && chainId === mainnet.id) {
      switchChain?.({ chainId: baseSepolia.id });
      return;
    }

    // Check if we're on the correct chain for the transaction
    if (chainId !== sourceChain.id) {
      switchChain?.({ chainId: sourceChain.id });
      return;
    }

    order.open();
  };

  const isWrongChain = chainId !== sourceChain.id;

  const needsMainnetSwitch = address && network === 'mainnet' && chainId === baseSepolia.id;
  const needsTestnetSwitch = address && network === 'testnet' && chainId === mainnet.id;

  return (
    <div className="space-y-4">
      {!address && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Wallet Not Connected</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please connect your wallet to execute orders.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {needsMainnetSwitch && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Switch to Ethereum Mainnet</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please switch to Ethereum Mainnet to continue.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {needsTestnetSwitch && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Switch to Base Sepolia</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please switch to Base Sepolia to continue.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Inputs */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Amount to Deposit</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter amount"
              min={sourceAsset?.minAmount}
              max={sourceAsset?.maxAmount}
              step="0.001"
            />
            <span className="mt-1 text-sm text-gray-500">{sourceAsset?.symbol}</span>
          </div>
        </div>

        {/* Contract Call Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Contract Call</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Contract Address</label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0x..."
            />
            {contractAddress && !isAddress(contractAddress) && (
              <p className="mt-1 text-sm text-red-600">Invalid address format</p>
            )}
          </div>

          {isLoadingABI && (
            <div className="text-sm text-gray-500">Loading contract ABI...</div>
          )}

          {abiError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Failed to Load Contract</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>Unable to fetch contract ABI. This could be because:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li>The contract is not verified on the block explorer</li>
                      <li>The contract address is incorrect</li>
                      <li>The contract is not deployed on this network</li>
                      <li>API key is missing or invalid</li>
                    </ul>
                    <p className="mt-2">Error details: {abiError}</p>
                    <p className="mt-1">Chain: {destinationChain.name} ({destinationChain.id})</p>
                    <p className="mt-1">Contract: {contractAddress}</p>
                    <p className="mt-2">Please verify the contract address and try again.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {writeFunctions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Function</label>
              <select
                value={selectedFunction?.name || ''}
                onChange={(e) => {
                  const func = writeFunctions.find(f => f.name === e.target.value);
                  if (func) handleFunctionSelect(func);
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select a function</option>
                {writeFunctions.map((func: ContractFunction) => (
                  <option key={func.name} value={func.name}>
                    {func.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedFunction && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Function Parameters</label>
              {selectedFunction.inputs.map((input) => (
                <div key={input.name}>
                  <label className="block text-sm text-gray-600">
                    {input.name} ({input.type})
                  </label>
                  <input
                    type="text"
                    value={functionInputs[input.name] || ''}
                    onChange={(e) => handleInputChange(input.name, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Execute Order Button */}
        <div className="flex gap-4">
          {isWrongChain ? (
            <button
              onClick={() => switchChain?.({ chainId: sourceChain.id })}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-600 disabled:opacity-70"
            >
              Switch to {sourceChain.name}
            </button>
          ) : (
            <button
              onClick={handleExecute}
              disabled={!address || !quote.isSuccess || !order.isReady || order.validation?.status !== 'accepted'}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Execute Order
            </button>
          )}
        </div>

        {/* Quote Details */}
        {quote.isSuccess && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Quote Details</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Deposit Amount: {quote.deposit.amount.toString()} {sourceAsset?.symbol}</p>
                  <p>Expense Amount: {quote.expense.amount.toString()} {destinationAsset?.symbol}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {quote.isError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Failed to get quote. Please try again.</p>
                  {quote.error && (
                    <p className="mt-1">Error details: {quote.error.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {order.validation?.status === 'rejected' && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Order Rejected</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Reason: {order.validation.rejectReason}</p>
                  <p>Description: {order.validation.rejectDescription}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {order.status === 'filled' && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Order Filled</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your order has been successfully filled!</p>
                  {order.txHash && (
                    <p className="mt-1">
                      Source Transaction: {sourceChain.blockExplorers?.default?.url ? (
                        <a 
                          href={`${sourceChain.blockExplorers.default.url}/tx/${order.txHash}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          View on Explorer →
                        </a>
                      ) : (
                        <span className="font-mono text-sm">{order.txHash}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Order Configuration */}
      <div className="mt-8 border-t pt-6">
        <button
          onClick={() => setShowOrderConfig(!showOrderConfig)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-medium text-gray-900">Order Configuration</h3>
          <span className="text-gray-500">
            {showOrderConfig ? '▼' : '▶'}
          </span>
        </button>
        
        {showOrderConfig && (
          <div className="mt-4 rounded-md bg-gray-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <div className="mt-2 text-sm text-gray-700">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify({
                      srcChainId: sourceChain.id,
                      destChainId: destinationChain.id,
                      deposit: {
                        amount: depositAmt.toString(),
                        ...(sourceAsset?.isNative ? {} : { 
                          token: sourceAsset?.address && isAddress(sourceAsset.address) ? sourceAsset.address : undefined 
                        }),
                      },
                      expense: {
                        amount: expenseAmt.toString(),
                        ...(destinationAsset?.isNative ? {} : { 
                          token: destinationAsset?.address && isAddress(destinationAsset.address) ? destinationAsset.address : undefined,
                          ...(selectedFunction && contractAddress && isAddress(contractAddress) ? { 
                            spender: contractAddress 
                          } : {})
                        }),
                      },
                      calls: [
                        ...(destinationAsset?.isNative && address ? [{
                          target: address,
                          value: expenseAmt.toString()
                        }] : []),
                        ...(selectedFunction && contractAddress && isAddress(contractAddress) ? [{
                          target: contractAddress,
                          abi: contractABI,
                          functionName: selectedFunction.name,
                          args: selectedFunction.inputs.map(input => {
                            const value = functionInputs[input.name];
                            if (!value) {
                              if (input.type.startsWith('uint') || input.type.startsWith('int')) {
                                return '0';
                              } else if (input.type === 'bool') {
                                return false;
                              } else if (input.type === 'address') {
                                return '0x0000000000000000000000000000000000000000';
                              }
                              return '';
                            }
                            
                            if (input.type.startsWith('uint') || input.type.startsWith('int')) {
                              return BigInt(value).toString();
                            } else if (input.type === 'bool') {
                              return value === 'true';
                            } else if (input.type === 'address') {
                              return value && isAddress(value) ? value : '0x0000000000000000000000000000000000000000';
                            }
                            return value;
                          }),
                        }] : []),
                      ],
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}