'use client';

import { useState, useEffect } from 'react';
import { hasFeature } from '@/lib/billing';
import Link from 'next/link';
import { UpgradeModal } from './UpgradeModal';

interface UpgradeCTAProps {
  feature: string;
  plan?: string;
  className?: string;
  useModal?: boolean;
}

/**
 * UpgradeCTA component that conditionally shows an upgrade button
 * based on feature gating logic
 */
export function UpgradeCTA({ feature, plan, className = '', useModal = false }: UpgradeCTAProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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

  // Show nothing while loading
  if (isLoading || hasAccess === null) {
    return null;
  }

  // Show nothing if user has access
  if (hasAccess) {
    return null;
  }

  // Show upgrade CTA if user doesn't have access
  return (
    <>
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-yellow-800">Upgrade Required</h3>
            <p className="text-sm text-yellow-700 mt-1">
              {plan ? `This feature requires the ${plan} plan.` : 'This feature requires a paid plan.'}
            </p>
          </div>
          {useModal ? (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              Upgrade
            </button>
          ) : (
            <Link
              href="/billing"
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>
      {useModal && (
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          feature={feature}
          plan={plan}
        />
      )}
    </>
  );
}

