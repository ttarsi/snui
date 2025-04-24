import { Asset } from '@/config/assets';
import { useQuery } from '@tanstack/react-query';
import { fetchSupportedTokens } from '@/api/tokens'; // Import the fetcher

export const useSupportedTokens = () => {
  const { data: tokens = [], isLoading, error } = useQuery<Asset[], Error>({
      queryKey: ['supportedTokens'],
      queryFn: fetchSupportedTokens, // Use the imported fetcher
      staleTime: Infinity, // Data never becomes stale
      retry: 3, // Retry failed requests 3 times
      // It's generally recommended to handle errors in the component using the hook
      // or via a global error handler, rather than logging here.
  });

  return {
    tokens,
    isLoading,
    error: error ? error.message : null, // Provide the error message
  };
}; 