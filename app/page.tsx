'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, APIError } from '@/lib/api-client';
import { getActiveWorkspaceId } from '@/lib/cookies';

interface User {
  id: string;
  email: string;
  name?: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWorkspace, setHasWorkspace] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        setIsLoading(true);
        
        // Check if user is logged in (using endpoint that doesn't require workspace)
        const userData = await api.get<User>('/api/v1/auth/me', {
          requireWorkspace: false,
        });
        setUser(userData);

        // Check if workspace is selected
        const workspaceId = getActiveWorkspaceId();
        setHasWorkspace(!!workspaceId && workspaceId.trim() !== '');
      } catch (err) {
        // If 401, user is not logged in - that's fine
        if (err instanceof APIError && err.status === 401) {
          setUser(null);
        } else {
          // Other errors - log but don't break the page
          console.error('[Home] Error checking auth:', err);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const handleContinueToDashboard = () => {
    if (hasWorkspace) {
      router.push('/dashboard/summary');
    } else {
      router.push('/select-workspace');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Multi-Tenant SaaS Starter</h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8">
          Production-grade Multi-Tenant SaaS application with row-level security
        </p>
        </div>

        {/* User Status (if logged in) */}
        {!isLoading && user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-center">
            <p className="text-sm text-gray-700 mb-2">
              Signed in as: <span className="font-semibold">{user.email}</span>
            </p>
            {hasWorkspace ? (
              <p className="text-xs text-green-700">✓ Active workspace selected</p>
            ) : (
              <Link
                href="/select-workspace"
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Select a workspace to continue
              </Link>
            )}
          </div>
        )}

        {/* CTAs */}
        {!isLoading && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {user ? (
              <button
                onClick={handleContinueToDashboard}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Continue to Dashboard
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg text-center"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-lg text-center"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 border border-gray-200 rounded-lg bg-white">
            <h2 className="font-bold mb-3 text-lg">Features</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>Multi-tenancy with row-level security</li>
              <li>Email/password + GitHub OAuth</li>
              <li>RBAC (Owner, Admin, Member)</li>
              <li>Workspaces & Projects</li>
              <li>Activity Logging</li>
              <li>Stripe Billing</li>
            </ul>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg bg-white">
            <h2 className="font-bold mb-3 text-lg">Tech Stack</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>Next.js 14 (App Router)</li>
              <li>Go REST API (Chi)</li>
              <li>PostgreSQL + Redis</li>
              <li>Docker Compose</li>
              <li>TypeScript</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
