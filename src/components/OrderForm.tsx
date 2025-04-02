'use client';

import { useState, useEffect } from 'react';
import { useQuote, useOrder } from '@omni-network/react';
import { parseEther } from 'viem';
import { Chain, mainnet, baseSepolia } from 'wagmi/chains';
import { Asset } from '@/config/assets';
import { useNetwork as useNetworkContext } from '@/context/NetworkContext';
import { getSupportedAssets } from '@/config/assets';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

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

  // Clear amount when network changes
  useEffect(() => {
    setAmount('');
  }, [network]);

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
      ...(sourceAsset?.isNative ? {} : { token: sourceAsset?.address as `0x${string}` }),
    },
    expense: {
      amount: expenseAmt,
    },
    calls: [{
      target: destinationAsset?.isNative && address ? address : '0x0000000000000000000000000000000000000000',
      value: destinationAsset?.isNative ? expenseAmt : BigInt(0),
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}