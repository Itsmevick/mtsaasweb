'use client';

import { ReactNode } from 'react';
import { FeatureGate } from './FeatureGate';

interface FeatureCardProps {
  feature: string;
  plan?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * FeatureCard component that shows a disabled card with lock icon
 * when the feature is not available
 */
export function FeatureCard({
  feature,
  plan,
  title,
  description,
  icon,
  children,
  className = '',
}: FeatureCardProps) {
  return (
    <FeatureGate feature={feature} plan={plan} showDisabled>
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && <div className="text-gray-400">{icon}</div>}
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>
        {children}
      </div>
    </FeatureGate>
  );
}

