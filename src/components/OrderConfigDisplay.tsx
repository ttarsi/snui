import { useState } from 'react';
import { Chain } from 'wagmi/chains';
import { Asset } from '@/config/assets';
import { isAddress } from 'viem';
import { ContractFunction } from './ContractCallSection';

interface OrderConfigDisplayProps {
  sourceChain: Chain;
  destinationChain: Chain;
  sourceAsset: Asset | null;
  destinationAsset: Asset | null;
  depositAmt: bigint;
  expenseAmt: bigint;
  selectedFunction: ContractFunction | null;
  contractAddress: string;
  functionInputs: Record<string, string>;
  address: string | undefined;
}

export function OrderConfigDisplay({
  sourceChain,
  destinationChain,
  sourceAsset,
  destinationAsset,
  depositAmt,
  expenseAmt,
  selectedFunction,
  contractAddress,
  functionInputs,
  address,
}: OrderConfigDisplayProps) {
  const [showOrderConfig, setShowOrderConfig] = useState(false);

  return (
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
                      ...(destinationAsset && !destinationAsset.isNative && address ? [{
                        target: destinationAsset.address,
                        functionName: 'transfer',
                        args: [address, expenseAmt.toString()],
                        abi: [{
                          type: 'function',
                          name: 'transfer',
                          inputs: [
                            { name: 'to', type: 'address' },
                            { name: 'amount', type: 'uint256' }
                          ],
                          outputs: [{ type: 'bool' }],
                          stateMutability: 'nonpayable'
                        }],
                        value: '0'
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
                        abi: [selectedFunction],
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
  );
} 