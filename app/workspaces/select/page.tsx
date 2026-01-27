'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/workspace-context';
import { api, WorkspaceRequiredError, APIError } from '@/lib/api-client';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
}

export default function WorkspaceSelectPage() {
  const { setSelectedWorkspace } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch workspaces without requiring workspace context
        const data = await api.get<Workspace[]>('/api/v1/workspaces', {
          requireWorkspace: false,
        });
        setWorkspaces(data);
      } catch (err) {
        if (err instanceof APIError) {
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
  }, []);

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    // Redirect to home or dashboard
    window.location.href = '/';
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

  if (workspaces.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">No Workspaces</h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have access to any workspaces. Please contact your administrator.
          </p>
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

