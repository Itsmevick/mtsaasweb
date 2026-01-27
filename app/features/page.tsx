'use client';

import { FeatureCard } from '@/components/FeatureCard';
import { useFeatureGatedApi } from '@/hooks/useFeatureGatedApi';
import { api } from '@/lib/api-client';
import { useState } from 'react';

/**
 * Example page demonstrating feature gating with disabled cards
 */
export default function FeaturesPage() {
  const [result, setResult] = useState<any>(null);
  const { execute, isLoading, UpgradeModalComponent } = useFeatureGatedApi({
    feature: 'advanced_analytics',
    plan: 'pro',
  });

  const handleGatedCall = async () => {
    try {
      // This would be a gated API call
      const data = await execute(() => api.get('/api/v1/some-gated-endpoint'));
      setResult(data);
    } catch (error) {
      // Error is handled by the hook - shows upgrade modal
      console.log('Feature is gated:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Features</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Free Feature - Always Available */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Basic Features</h3>
                <p className="text-sm text-gray-600">Available on all plans</p>
              </div>
            </div>
            <p className="text-gray-700">This feature is available to all users.</p>
          </div>

          {/* Pro Feature - Gated */}
          <FeatureCard
            feature="advanced_analytics"
            plan="pro"
            title="Advanced Analytics"
            description="Pro plan required"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          >
            <p className="text-gray-700">
              View detailed analytics and insights for your workspace.
            </p>
            <button
              onClick={handleGatedCall}
              disabled={isLoading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'View Analytics'}
            </button>
          </FeatureCard>

          {/* Enterprise Feature - Gated */}
          <FeatureCard
            feature="custom_integrations"
            plan="enterprise"
            title="Custom Integrations"
            description="Enterprise plan required"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
          >
            <p className="text-gray-700">
              Build custom integrations with your favorite tools.
            </p>
          </FeatureCard>
        </div>

        {UpgradeModalComponent}
      </div>
    </div>
  );
}

