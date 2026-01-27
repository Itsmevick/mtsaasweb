'use client';

import { useEffect, useState } from 'react';
import { getBilling, getSubscription, createCustomer, createSubscription, type BillingInfo, type SubscriptionInfo } from '@/lib/billing';
import { useWorkspace } from '@/contexts/workspace-context';
import { APIError } from '@/lib/api-client';

export default function BillingPage() {
  const { selectedWorkspace } = useWorkspace();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [email, setEmail] = useState('');
  const [priceId, setPriceId] = useState('');

  useEffect(() => {
    async function loadBilling() {
      try {
        setIsLoading(true);
        setError(null);
        const [billingData, subscriptionData] = await Promise.all([
          getBilling(),
          getSubscription(),
        ]);
        setBilling(billingData);
        setSubscription(subscriptionData);
      } catch (err) {
        if (err instanceof APIError) {
          if (err.status === 403) {
            setError('You do not have permission to access billing. Only workspace owners and admins can manage billing.');
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to load billing information');
        }
        console.error('Error loading billing:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (selectedWorkspace) {
      loadBilling();
    }
  }, [selectedWorkspace]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      setIsCreatingCustomer(true);
      setError(null);
      await createCustomer(email);
      // Reload billing info
      const billingData = await getBilling();
      setBilling(billingData);
      setEmail('');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to create customer');
      }
      console.error('Error creating customer:', err);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceId) {
      setError('Price ID is required');
      return;
    }

    try {
      setIsCreatingSubscription(true);
      setError(null);
      await createSubscription(priceId);
      // Reload billing info
      const [billingData, subscriptionData] = await Promise.all([
        getBilling(),
        getSubscription(),
      ]);
      setBilling(billingData);
      setSubscription(subscriptionData);
      setPriceId('');
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to create subscription');
      }
      console.error('Error creating subscription:', err);
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  if (!selectedWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Please select a workspace to view billing.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (error && !billing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Billing & Subscription</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Plan:</span>{' '}
              <span className="capitalize">{billing?.plan || 'free'}</span>
            </div>
            {billing?.stripe_customer_id && (
              <div>
                <span className="font-medium">Customer ID:</span>{' '}
                <span className="font-mono text-sm">{billing.stripe_customer_id}</span>
              </div>
            )}
            {billing?.stripe_subscription_id && (
              <div>
                <span className="font-medium">Subscription ID:</span>{' '}
                <span className="font-mono text-sm">{billing.stripe_subscription_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Create Customer */}
        {!billing?.stripe_customer_id && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create Stripe Customer</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="customer@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingCustomer ? 'Creating...' : 'Create Customer'}
              </button>
            </form>
          </div>
        )}

        {/* Create Subscription */}
        {billing?.stripe_customer_id && !billing?.stripe_subscription_id && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create Subscription</h2>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label htmlFor="priceId" className="block text-sm font-medium mb-2">
                  Stripe Price ID
                </label>
                <input
                  type="text"
                  id="priceId"
                  value={priceId}
                  onChange={(e) => setPriceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="price_1234567890"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter the Stripe Price ID for the plan you want to subscribe to.
                </p>
              </div>
              <button
                type="submit"
                disabled={isCreatingSubscription}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSubscription ? 'Creating...' : 'Create Subscription'}
              </button>
            </form>
          </div>
        )}

        {/* Subscription Info */}
        {subscription?.stripe_subscription_id && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Plan:</span>{' '}
                <span className="capitalize">{subscription.plan}</span>
              </div>
              <div>
                <span className="font-medium">Subscription ID:</span>{' '}
                <span className="font-mono text-sm">{subscription.stripe_subscription_id}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

