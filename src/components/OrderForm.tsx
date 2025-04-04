'use client';

import { useState, useEffect } from 'react';
import { useQuote, useOrder } from '@omni-network/react';
import { parseEther, parseUnits, formatUnits, AbiStateMutability } from 'viem';
import { Chain, mainnet, baseSepolia } from 'wagmi/chains';
import { Asset } from '@/config/assets';
import { useNetwork as useNetworkContext } from '@/context/NetworkContext';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { isAddress } from 'viem';
import { OrderStatus } from './OrderStatus';
import { ContractCallSection, ContractFunction } from './ContractCallSection';
import { OrderConfigDisplay } from './OrderConfigDisplay';

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
  const [amount, setAmount] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [contractABI, setContractABI] = useState<ContractFunction[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<ContractFunction | null>(null);
  const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});
  const [isLoadingABI, setIsLoadingABI] = useState(false);
  const [abiError, setAbiError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

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
          } catch {
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

  const quote = useQuote({
    srcChainId: sourceChain.id,
    destChainId: destinationChain.id,
    deposit: sourceAsset?.isNative ? {
      isNative: true,
      amount: parseEther(amount || '0'),
    } : {
      isNative: false,
      token: sourceAsset?.address as `0x${string}`,
      amount: parseUnits(amount || '0', sourceAsset?.decimals || 18),
    },
    expense: destinationAsset?.isNative ? {
      isNative: true,
    } : {
      isNative: false,
      token: destinationAsset?.address as `0x${string}`,
      amount: parseUnits(amount || '0', destinationAsset?.decimals || 18),
    },
    mode: 'expense',
    enabled: Boolean(amount && parseFloat(amount) > 0 && sourceAsset && destinationAsset)
  });

  const depositAmt = quote.isSuccess ? quote.deposit.amount : BigInt(0);
  const expenseAmt = quote.isSuccess ? quote.expense.amount : BigInt(0);

  const getOrderConfig = () => {
    const deposit = {
      amount: quote.isSuccess ? quote.deposit.amount : (sourceAsset?.isNative ? parseEther(amount || '0') : parseUnits(amount || '0', sourceAsset?.decimals || 18)),
      ...(sourceAsset?.isNative ? {} : { 
        token: sourceAsset?.address && isAddress(sourceAsset.address) ? sourceAsset.address as `0x${string}` : undefined 
      }),
    };

    const expense = {
      amount: quote.isSuccess ? quote.expense.amount : (destinationAsset?.isNative ? parseEther(amount || '0') : parseUnits(amount || '0', destinationAsset?.decimals || 18)),
      ...(destinationAsset?.isNative ? {} : {
        token: destinationAsset?.address && isAddress(destinationAsset.address) ? destinationAsset.address as `0x${string}` : undefined,
        ...(selectedFunction && contractAddress && isAddress(contractAddress) ? { 
          spender: contractAddress as `0x${string}` 
        } : {})
      })
    };

    const calls = [
      ...(destinationAsset?.isNative && address ? [{
        target: address,
        value: expense.amount
      }] : []),
      ...(selectedFunction && contractAddress && isAddress(contractAddress) ? [{
        target: contractAddress,
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
        abi: [{
          type: 'function' as const,
          name: selectedFunction.name,
          inputs: selectedFunction.inputs,
          outputs: selectedFunction.outputs,
          stateMutability: selectedFunction.stateMutability as AbiStateMutability
        }],
        value: BigInt(0)
      }] : []),
    ];

    return {
      srcChainId: sourceChain.id,
      destChainId: destinationChain.id,
      deposit,
      expense: {
        ...expense,
        amount: destinationAsset?.isNative && !address ? BigInt(0) : expense.amount
      },
      calls,
      validateEnabled: Boolean(address && amount && parseFloat(amount) > 0 && quote.isSuccess)
    };
  };

  const order = useOrder(getOrderConfig());

  const handleExecute = async () => {
    if (!quote.isSuccess || !order.isReady || order.validation?.status !== 'accepted') return;
    if (!address || !switchChain) return; // Ensure wallet is connected and switchChain is available
    
    setExecutionError(null); // Clear any previous errors
    
    try {
      // Check if we need to switch chains based on network toggle
      if (network === 'mainnet' && chainId === baseSepolia.id) {
        await switchChain({ chainId: mainnet.id });
        return;
      }
      if (network === 'testnet' && chainId === mainnet.id) {
        await switchChain({ chainId: baseSepolia.id });
        return;
      }

      // Check if we're on the correct chain for the transaction
      if (chainId !== sourceChain.id) {
        await switchChain({ chainId: sourceChain.id });
        return;
      }

      await order.open();
    } catch (error) {
      console.error('Error executing order:', error);
      if (error instanceof Error) {
        if (error.message.includes('User rejected the request')) {
          setExecutionError('Transaction was rejected in your wallet.');
        } else {
          setExecutionError(`Failed to execute order: ${error.message}`);
        }
      } else {
        setExecutionError('An unknown error occurred while executing the order.');
      }
    }
  };

  const isWrongChain = chainId !== sourceChain.id;
  const needsMainnetSwitch = address && network === 'mainnet' && chainId === baseSepolia.id;
  const needsTestnetSwitch = address && network === 'testnet' && chainId === mainnet.id;

  return (
    <div className="space-y-4">
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
        <ContractCallSection
          contractAddress={contractAddress}
          setContractAddress={setContractAddress}
          contractABI={contractABI}
          selectedFunction={selectedFunction}
          setSelectedFunction={setSelectedFunction}
          functionInputs={functionInputs}
          setFunctionInputs={setFunctionInputs}
          isLoadingABI={isLoadingABI}
          abiError={abiError}
          destinationChain={destinationChain}
        />

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

        {/* Order Status */}
        <OrderStatus 
          status={order.status}
          txHash={order.txHash}
          sourceChain={sourceChain}
          validation={order.validation}
        />

        {quote.isPending && amount && parseFloat(amount) > 0 && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Getting Quote...</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Please wait while we calculate the quote for your order.</p>
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

        {quote.isSuccess && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Quote Details</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Deposit Amount: {formatUnits(quote.deposit.amount, sourceAsset?.decimals || 18)} {sourceAsset?.symbol}</p>
                  <p>Expense Amount: {formatUnits(quote.expense.amount, destinationAsset?.decimals || 18)} {destinationAsset?.symbol}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {executionError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Transaction Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{executionError}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Configuration Display */}
      <OrderConfigDisplay
        sourceChain={sourceChain}
        destinationChain={destinationChain}
        sourceAsset={sourceAsset}
        destinationAsset={destinationAsset}
        depositAmt={depositAmt}
        expenseAmt={expenseAmt}
        selectedFunction={selectedFunction}
        contractAddress={contractAddress}
        functionInputs={functionInputs}
        address={address}
      />
    </div>
  );
}