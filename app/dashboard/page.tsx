'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/workspace-context';
import { getActiveWorkspaceId, getSelectedWorkspaceData } from '@/lib/cookies';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
}

export default function DashboardPage() {
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(selectedWorkspace);

  useEffect(() => {
    // Check cookie/localStorage for activeWorkspaceId
    if (typeof window !== 'undefined') {
      const activeWorkspaceId = getActiveWorkspaceId();
      if (activeWorkspaceId) {
        // Try to load workspace data from localStorage
        const workspaceData = getSelectedWorkspaceData();
        if (workspaceData) {
          setWorkspace(workspaceData);
          // Update context if it's not already set
          if (!selectedWorkspace) {
            setSelectedWorkspace(workspaceData);
          }
        } else {
          // If we have ID but no data, create a minimal workspace object
          const minimalWorkspace: Workspace = {
            id: activeWorkspaceId,
            name: activeWorkspaceId,
          };
          setWorkspace(minimalWorkspace);
          if (!selectedWorkspace) {
            setSelectedWorkspace(minimalWorkspace);
          }
        }
      } else {
        setWorkspace(null);
      }
    }
  }, [selectedWorkspace, setSelectedWorkspace]);

  // Use workspace from state (which may come from localStorage) or from context
  const currentWorkspace = workspace || selectedWorkspace;

  useEffect(() => {
    if (currentWorkspace) {
      router.replace('/dashboard/summary');
    }
  }, [currentWorkspace, router]);

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Please select a workspace to view the dashboard.</p>
          <a
            href="/select-workspace"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Workspace
          </a>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  return null;
}

