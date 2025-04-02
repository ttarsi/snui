import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chainId = searchParams.get('chainId');

  console.log('ABI request:', { address, chainId });

  if (!address || !chainId) {
    return NextResponse.json({ error: 'Missing address or chainId' }, { status: 400 });
  }

  try {
    // Map chain IDs to block explorer URLs and API keys
    const explorerConfigs: Record<string, { url: string; apiKey?: string }> = {
      '8453': { 
        url: 'https://api.basescan.org',
        apiKey: process.env.BASESCAN_API_KEY
      }, // Base
      '84531': { 
        url: 'https://api-sepolia.basescan.org',
        apiKey: process.env.BASESCAN_API_KEY
      }, // Base Sepolia
      '1': { 
        url: 'https://api.etherscan.io',
        apiKey: process.env.ETHERSCAN_API_KEY
      }, // Ethereum Mainnet
      '11155111': { 
        url: 'https://api-sepolia.etherscan.io',
        apiKey: process.env.ETHERSCAN_API_KEY
      }, // Sepolia
      '10': { 
        url: 'https://api-optimistic.etherscan.io',
        apiKey: process.env.OPTIMISM_API_KEY
      }, // Optimism
      '42161': { 
        url: 'https://api.arbiscan.io',
        apiKey: process.env.ARBISCAN_API_KEY
      }, // Arbitrum
    };

    const config = explorerConfigs[chainId];
    if (!config) {
      console.error('Unsupported chain:', chainId);
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
    }

    // For testing, let's use a known working API key for Base Sepolia
    const apiKey = config.apiKey || 'YourApiKeyToken';
    const apiUrl = `${config.url}/api?module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
    
    console.log('Making request to:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      console.error('Block explorer API error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        data
      });
      throw new Error(`Block explorer API error: ${response.status} ${response.statusText}`);
    }
    
    if (data.status === '0' || data.message === 'NOTOK') {
      console.error('Block explorer returned error:', data);
      return NextResponse.json({ 
        error: 'Failed to fetch ABI',
        details: data.result || 'Contract not verified or API key required',
        raw: data
      }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching ABI:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch ABI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 