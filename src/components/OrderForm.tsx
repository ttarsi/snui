'use client';

import { useState } from 'react';
import { useQuote, useOrder } from '@omni-network/react';
import { parseEther } from 'viem';
import { Chain } from 'wagmi/chains';
import { Asset } from '@/config/assets';
import { useNetwork } from '@/context/NetworkContext';
import { getSupportedAssets } from '@/config/assets';

interface OrderFormProps {
  sourceChain: Chain;
  destinationChain: Chain;
  sourceAsset: Asset;
  destinationAsset: Asset;
}

export function OrderForm({ sourceChain, destinationChain, sourceAsset, destinationAsset }: OrderFormProps) {
  const { network } = useNetwork();
  const supportedAssets = getSupportedAssets(network);
  const [amount, setAmount] = useState<string>('');

  const quote = useQuote({
    srcChainId: sourceChain.id,
    destChainId: destinationChain.id,
    expense: {
      isNative: false,
      token: destinationAsset.address as `0x${string}`,
      amount: parseEther(amount || '0'),
    },
    deposit: { 
      isNative: false,
      token: sourceAsset.address as `0x${string}`,
    },
    mode: 'deposit',
    enabled: Boolean(amount && parseFloat(amount) > 0),
  });

  const depositAmt = quote.isSuccess ? quote.deposit.amount : BigInt(0);
  const expenseAmt = quote.isSuccess ? quote.expense.amount : BigInt(0);

  const order = useOrder({
    srcChainId: sourceChain.id,
    destChainId: destinationChain.id,
    deposit: {
      amount: depositAmt,
      token: sourceAsset.address as `0x${string}`,
    },
    expense: {
      amount: expenseAmt,
      token: destinationAsset.address as `0x${string}`,
    },
    calls: [], // Empty array since we're just transferring tokens
    validateEnabled: quote.isSuccess,
  });

  const handleQuote = () => {
    if (!amount || parseFloat(amount) <= 0) return;
  };

  const handleExecute = () => {
    if (!quote.isSuccess || !order.isReady || order.validation?.status !== 'accepted') return;
    order.open();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Amount</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter amount"
            min={sourceAsset.minAmount}
            max={sourceAsset.maxAmount}
            step="0.001"
          />
          <span className="mt-1 text-sm text-gray-500">{sourceAsset.symbol}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleQuote}
          disabled={!amount || parseFloat(amount) <= 0}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Get Quote
        </button>

        <button
          onClick={handleExecute}
          disabled={!quote.isSuccess || !order.isReady || order.validation?.status !== 'accepted'}
          className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Execute Order
        </button>
      </div>

      {quote.isSuccess && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Quote Details</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Deposit Amount: {quote.deposit.amount.toString()} {sourceAsset.symbol}</p>
                <p>Expense Amount: {quote.expense.amount.toString()} {destinationAsset.symbol}</p>
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