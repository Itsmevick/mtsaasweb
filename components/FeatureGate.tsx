'use client';

import { ReactNode, useState, useEffect } from 'react';
import { hasFeature } from '@/lib/billing';
import { PlanRestrictedError } from '@/lib/api-client';
import { UpgradeModal } from './UpgradeModal';

interface FeatureGateProps {
  feature: string;
  plan?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean;
  disabledClassName?: string;
}

/**
 * FeatureGate component that conditionally renders children based on feature access
 * Shows disabled state with lock icon if showDisabled is true
 */
export function FeatureGate({
  feature,
  plan,
  children,
  fallback,
  showDisabled = false,
  disabledClassName = '',
}: FeatureGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        setIsLoading(true);
        const access = await hasFeature(feature);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [feature]);

  const handleClick = (e: React.MouseEvent) => {
    if (!hasAccess) {
      e.preventDefault();
      e.stopPropagation();
      setShowUpgradeModal(true);
    }
  };

  // Show loading state
  if (isLoading || hasAccess === null) {
    return <div className="opacity-50">{children}</div>;
  }

  // Show children if user has access
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show disabled state with lock icon
  if (showDisabled) {
    return (
      <>
        <div
          className={`relative opacity-60 pointer-events-none ${disabledClassName}`}
          onClick={handleClick}
        >
          {children}
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded">
            <div className="text-center">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-600">
                {plan ? `${plan} plan required` : 'Upgrade required'}
              </p>
            </div>
          </div>
        </div>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature={feature}
          plan={plan}
        />
      </>
    );
  }

  // Show fallback or nothing
  return <>{fallback || null}</>;
}

/**
 * Hook to handle feature-gated API calls gracefully
 */
export function useFeatureGate(feature: string) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        setIsLoading(true);
        const access = await hasFeature(feature);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [feature]);

  const handleApiError = (error: unknown) => {
    if (error instanceof PlanRestrictedError) {
      setShowUpgradeModal(true);
      return true; // Error was handled
    }
    return false; // Error was not handled
  };

  return {
    hasAccess,
    isLoading,
    showUpgradeModal,
    setShowUpgradeModal,
    handleApiError,
  };
}

