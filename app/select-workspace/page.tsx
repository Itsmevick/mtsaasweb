'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/workspace-context';
import { api, APIError } from '@/lib/api-client';
import { setActiveWorkspaceId, setSelectedWorkspaceData } from '@/lib/cookies';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
}

export default function SelectWorkspacePage() {
  const { setSelectedWorkspace } = useWorkspace();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch workspaces without requiring workspace context
        const data = await api.get<Workspace[]>('/api/v1/workspaces', {
          requireWorkspace: false,
        });
        // Ensure data is always an array
        setWorkspaces(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err instanceof APIError) {
          // If 401 Unauthorized, redirect to login
          if (err.status === 401) {
            router.push('/login');
            return;
          }
          setError(err.message);
        } else {
          setError('Failed to load workspaces. Please try again.');
        }
        console.error('Error fetching workspaces:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
  }, [router]);

  const handleSelectWorkspace = (workspace: Workspace) => {
    // Set workspace in both cookie and localStorage
    setActiveWorkspaceId(workspace.id);
    setSelectedWorkspaceData(workspace);
    
    // Update context
    setSelectedWorkspace(workspace);
    
    // Small delay to ensure cookie is set before redirect
    // Use setTimeout to allow cookie to be written
    setTimeout(() => {
      window.location.href = '/dashboard/summary';
    }, 50);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    
    if (!workspaceName.trim()) {
      setCreateError('Workspace name is required');
      return;
    }

    setIsCreating(true);

    try {
      // Use unified API client - automatically includes credentials: 'include'
      const createdWorkspace = await api.post<Workspace>('/api/v1/workspaces', {
        name: workspaceName.trim(),
      }, {
        requireWorkspace: false, // Creating workspace doesn't need existing workspace
      });
      
      // Set workspace in both cookie and localStorage
      setActiveWorkspaceId(createdWorkspace.id);
      setSelectedWorkspaceData(createdWorkspace);
      
      // Update context
      setSelectedWorkspace(createdWorkspace);
      
      // Small delay to ensure cookie is set before redirect
      setTimeout(() => {
        window.location.href = '/dashboard/summary';
      }, 50);
    } catch (err) {
      if (err instanceof APIError) {
        setCreateError(err.message);
      } else {
        setCreateError('Network error. Please try again.');
      }
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-2">Create your first workspace</h1>
            <p className="text-gray-600 mb-6">
              Get started by creating a workspace for your team.
            </p>

            {createError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Workspace Name
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Workspace"
                  disabled={isCreating}
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Workspace'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Select a Workspace</h1>
          <p className="text-gray-600 mb-6">
            Please select a workspace to continue. A workspace is required to access the application.
          </p>
          
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => handleSelectWorkspace(workspace)}
                className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-semibold text-lg">{workspace.name}</div>
                {workspace.slug && (
                  <div className="text-sm text-gray-500">{workspace.slug}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

