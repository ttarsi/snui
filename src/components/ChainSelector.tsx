'use client';

import { Chain } from 'wagmi/chains';
import { useNetwork } from '@/context/NetworkContext';
import { getSupportedChains } from '@/config/assets';

interface ChainSelectorProps {
  onSelect: (chain: Chain) => void;
  value?: Chain;
  label: string;
  placeholder?: string;
}

export function ChainSelector({ onSelect, value, label, placeholder = "Select chain" }: ChainSelectorProps) {
  const { network } = useNetwork();
  const supportedChains = getSupportedChains(network);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value?.id || ''}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        onChange={(e) => {
          const chain = supportedChains.find((c: Chain) => c.id === Number(e.target.value));
          if (chain) onSelect(chain);
        }}
      >
        <option value="">{placeholder}</option>
        {supportedChains.map((chain: Chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
    </div>
  );
} 