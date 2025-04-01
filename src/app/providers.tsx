'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { OmniProvider } from '@omni-network/react';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { baseSepolia, holesky, base, optimism, arbitrum, mainnet, Chain } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { NetworkProvider, useNetwork } from '@/context/NetworkContext';
import { getSupportedChains } from '@/config/assets';

function NetworkToggle() {
  const { network, setNetwork } = useNetwork();

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {network === 'mainnet' ? 'Switch to Testnet' : 'Switch to Mainnet'}
      </button>
    </div>
  );
}

function ProvidersContent({ children }: { children: React.ReactNode }) {
  const { network } = useNetwork();
  const chains = getSupportedChains(network) as [Chain, ...Chain[]];

  const config = getDefaultConfig({
    appName: 'SolverNet UI',
    projectId: 'YOUR_PROJECT_ID', // You'll need to replace this with your WalletConnect project ID
    chains,
  });

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <OmniProvider env={network}>
            <NetworkToggle />
            {children}
          </OmniProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NetworkProvider>
      <ProvidersContent>{children}</ProvidersContent>
    </NetworkProvider>
  );
} 