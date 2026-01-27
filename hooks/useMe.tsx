import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, APIError } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface MeResponse {
  user: User;
  workspaceRole: 'owner' | 'admin' | 'member';
}

export function useMe() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await api.get<MeResponse>('/api/v1/me');
        setUser(data.user);
        setWorkspaceRole(data.workspaceRole);
      } catch (err) {
        if (err instanceof APIError) {
          if (err.status === 400) {
            // Workspace missing - redirect to select workspace
            router.push('/select-workspace');
            return;
          } else if (err.status === 401) {
            // Unauthorized - redirect to login
            router.push('/login');
            return;
          } else if (err.status === 403) {
            setError('No access to this workspace');
          } else if (err.status === 404) {
            // 404 means endpoint doesn't exist or workspace not found
            // Don't show error, just log it
            console.error('[useMe] 404 - Endpoint or workspace not found:', err);
            setError(null); // Don't block UI
          } else {
            setError(err.message || 'Failed to load user info');
          }
        } else {
          setError('Failed to load user info');
        }
        console.error('[useMe] Error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMe();
  }, [router]);

  // If role is null (not loaded or error), default to allowing actions
  // Backend will enforce permissions - this prevents UI from blocking legitimate users
  const isOwnerOrAdmin = workspaceRole === 'owner' || workspaceRole === 'admin' || workspaceRole === null;
  const isOwner = workspaceRole === 'owner';
  const isAdmin = workspaceRole === 'admin';
  const isMember = workspaceRole === 'member';

  return {
    user,
    workspaceRole,
    isLoading,
    error,
    isOwnerOrAdmin,
    isOwner,
    isAdmin,
    isMember,
  };
}

