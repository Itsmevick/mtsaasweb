/**
 * Billing API utilities
 */

import { api } from './api-client';

export interface BillingInfo {
  plan: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export interface SubscriptionInfo {
  stripe_subscription_id?: string;
  plan: string;
  stripe_customer_id?: string;
}

export interface FeatureCheck {
  feature: string;
  has_access: boolean;
}

/**
 * Get billing information for the current workspace
 */
export async function getBilling(): Promise<BillingInfo> {
  return api.get<BillingInfo>('/api/v1/billing');
}

/**
 * Get subscription information for the current workspace
 */
export async function getSubscription(): Promise<SubscriptionInfo> {
  return api.get<SubscriptionInfo>('/api/v1/billing/subscription');
}

/**
 * Create Stripe customer for the current workspace
 */
export async function createCustomer(email: string): Promise<{ stripe_customer_id?: string; message: string }> {
  return api.post<{ stripe_customer_id?: string; message: string }>('/api/v1/billing/create-customer', { email });
}

/**
 * Create Stripe subscription for the current workspace
 */
export async function createSubscription(priceId: string): Promise<{ stripe_subscription_id?: string; plan: string; message: string }> {
  return api.post<{ stripe_subscription_id?: string; plan: string; message: string }>('/api/v1/billing/create-subscription', { price_id: priceId });
}

/**
 * Check if workspace has access to a feature
 */
export async function checkFeature(feature: string): Promise<FeatureCheck> {
  return api.get<FeatureCheck>(`/api/v1/billing/features/${feature}`);
}

/**
 * Check if a feature is available (returns boolean)
 */
export async function hasFeature(feature: string): Promise<boolean> {
  try {
    const result = await checkFeature(feature);
    return result.has_access;
  } catch (error) {
    console.error('Error checking feature:', error);
    return false;
  }
}

