'use client';

import { useState, useCallback } from 'react';
import { PlanRestrictedError, APIError } from '@/lib/api-client';
import { UpgradeModal } from '@/components/UpgradeModal';

interface UseFeatureGatedApiOptions {
  feature?: string;
  plan?: string;
  onError?: (error: unknown) => void;
}

/**
 * Hook for making API calls that gracefully handle plan restrictions
 * Shows upgrade modal on 402/403 errors instead of crashing
 */
export function useFeatureGatedApi<T = any>(options: UseFeatureGatedApiOptions = {}) {
  const { feature, plan, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      // Handle plan restriction errors
      if (err instanceof PlanRestrictedError) {
        setShowUpgradeModal(true);
        setError(err);
        if (onError) {
          onError(err);
        }
        throw err;
      }

      // Handle other errors
      setError(err instanceof Error ? err : new Error('Unknown error'));
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  return {
    execute,
    isLoading,
    error,
    data,
    showUpgradeModal,
    setShowUpgradeModal,
    UpgradeModalComponent: (
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={feature}
        plan={plan}
      />
    ),
  };
}

