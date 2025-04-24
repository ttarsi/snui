'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { OmniProvider } from '@omni-network/react';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { Chain } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { getSupportedChains } from '@/config/assets';

function ProvidersContent({ children }: { children: React.ReactNode }) {
  const chains = getSupportedChains();
  if (!chains.length) throw new Error('No supported chains found for mainnet');
  const config = getDefaultConfig({
    appName: 'SolverNet UI',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: chains as unknown as [Chain, ...Chain[]],
  });

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <OmniProvider env={'mainnet'}>
            {children}
          </OmniProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProvidersContent>{children}</ProvidersContent>
  );
} 