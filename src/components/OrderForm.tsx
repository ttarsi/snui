'use client';

import React, { useState, useEffect } from 'react';
import { useQuote, useOrder, useOmniContracts } from '@omni-network/react';
import { parseEther, parseUnits, formatUnits, AbiStateMutability } from 'viem';
import { Chain } from 'wagmi/chains';
import { Asset } from '@/config/assets';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { isAddress, zeroAddress } from 'viem';
import { OrderStatus } from './OrderStatus';
import { ContractCallSection, ContractFunction } from './ContractCallSection';
import { OrderConfigDisplay } from './OrderConfigDisplay';
import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';

interface OrderFormProps {
  sourceChain: Chain;
  destinationChain: Chain;
  sourceAsset: Asset;
  destinationAsset: Asset;
}

const ERC20_ABI = [
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable'
  }
] as const;

export const OrderForm: React.FC<OrderFormProps> = ({ 
  sourceChain, 
  destinationChain, 
  sourceAsset, 
  destinationAsset 
}) => {
  const { address: connectedAddress } = useAccount();
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('');
  const [contractABI, setContractABI] = useState<ContractFunction[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<ContractFunction | null>(null);
  const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});
  const [isLoadingABI, setIsLoadingABI] = useState(false);
  const [abiError, setAbiError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const contracts = useOmniContracts();
  const inboxAddress = contracts.data?.inbox ?? zeroAddress;
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Clear amount when network changes
  useEffect(() => {
    setAmount('');
  }, []);

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

  // Check allowance for ERC20 tokens
  const { data: allowance } = useReadContract({
    address: sourceAsset?.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [connectedAddress as `0x${string}`, inboxAddress],
    chainId: sourceChain.id,
    query: {
      enabled: Boolean(
        connectedAddress && 
        sourceAsset && 
        !sourceAsset.isNative && 
        amount && 
        parseFloat(amount) > 0 &&
        inboxAddress !== zeroAddress
      )
    }
  });

  const { writeContract: approve } = useWriteContract();

  useWatchContractEvent({
    address: sourceAsset?.address as `0x${string}`,
    abi: ERC20_ABI,
    eventName: 'Approval',
    onLogs: () => {
      setIsApproving(false);
      setNeedsApproval(false);
    }
  });

  // Check if approval is needed
  useEffect(() => {
    console.log('Allowance check:', {
      allowance: allowance?.toString(),
      amount,
      sourceAsset,
      isNative: sourceAsset?.isNative,
      inboxAddress
    });

    // Reset approval state when amount changes
    setIsApproving(false);

    if (sourceAsset?.isNative || !amount || !sourceAsset || !inboxAddress || inboxAddress === zeroAddress) {
      setNeedsApproval(false);
      return;
    }

    // If we don't have an allowance yet, we need approval
    if (!allowance) {
      setNeedsApproval(true);
      return;
    }

    const depositAmount = parseUnits(amount, sourceAsset.decimals);
    const needsApproval = allowance < depositAmount;
    console.log('Needs approval:', needsApproval, {
      allowance: allowance.toString(),
      depositAmount: depositAmount.toString()
    });
    setNeedsApproval(needsApproval);
  }, [allowance, amount, sourceAsset, inboxAddress]);

  const handleApprove = async () => {
    if (!sourceAsset || !amount) return;
    
    setIsApproving(true);
    try {
      await approve({
        address: sourceAsset.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [
          inboxAddress,
          parseUnits(amount, sourceAsset.decimals)
        ]
      });
    } catch (error) {
      console.error('Approval error:', error);
      setIsApproving(false);
    }
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
        token: destinationAsset?.address && isAddress(destinationAsset.address) ? destinationAsset.address as `0x${string}` : undefined
      })
    };

    const calls = [
      ...(destinationAsset?.isNative && connectedAddress ? [{
        target: connectedAddress,
        value: expense.amount
      }] : []),
      ...(destinationAsset && !destinationAsset.isNative && connectedAddress ? [{
        target: destinationAsset.address as `0x${string}`,
        functionName: 'transfer',
        args: [connectedAddress, expense.amount],
        abi: [{
          type: 'function' as const,
          name: 'transfer',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable' as const
        }],
        value: BigInt(0)
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
        amount: destinationAsset?.isNative && !connectedAddress ? BigInt(0) : expense.amount
      },
      calls,
      validateEnabled: Boolean(connectedAddress && amount && parseFloat(amount) > 0 && quote.isSuccess)
    };
  };

  const order = useOrder({
    ...getOrderConfig(),
  });

  const handleExecute = async () => {
    if (!quote.isSuccess || !order.isReady || order.validation?.status !== 'accepted') return;
    if (!connectedAddress || !switchChain) return; // Ensure wallet is connected and switchChain is available
    
    setExecutionError(null); // Clear any previous errors
    
    try {
      // Check if we're on the correct chain for the transaction
      if (currentChainId !== sourceChain.id) {
        console.log(`Switching chain from ${currentChainId} to ${sourceChain.id}`);
        await switchChain({ chainId: sourceChain.id });
        return; // Exit after initiating switch, let user retry
      }

      order.open?.();
      console.log('Attempting to open order...');
    } catch (error) {
      console.error('Execution error:', error);
      setExecutionError(error instanceof Error ? error.message : 'Failed to execute order');
    }
  };

  const isWrongChain = currentChainId !== sourceChain.id;

  return (
    <div className="space-y-4">
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
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={!connectedAddress || isApproving || !needsApproval}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isApproving ? 'Approving...' : 'Approve Token'}
            </button>
          ) : (
            <button
              onClick={handleExecute}
              disabled={!connectedAddress || !quote.isSuccess || !order.isReady || order.validation?.status !== 'accepted' || needsApproval || isWrongChain}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isWrongChain ? 'Switch Chain' : 'Execute Order'}
            </button>
          )}
        </div>

        {!connectedAddress && (
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
        address={connectedAddress}
      />
    </div>
  );
}