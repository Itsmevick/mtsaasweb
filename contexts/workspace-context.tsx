'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
}

interface WorkspaceContextType {
  selectedWorkspace: Workspace | null;
  setSelectedWorkspace: (workspace: Workspace | null) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = 'activeWorkspaceId';
const WORKSPACE_DATA_KEY = 'selectedWorkspaceData';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load workspace from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const workspaceData = localStorage.getItem(WORKSPACE_DATA_KEY);
      if (workspaceData) {
        const workspace = JSON.parse(workspaceData);
        setSelectedWorkspaceState(workspace);
      }
    } catch (error) {
      console.error('Failed to load workspace from storage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update localStorage when workspace changes
  const setSelectedWorkspace = useCallback((workspace: Workspace | null) => {
    setSelectedWorkspaceState(workspace);
    
    if (typeof window === 'undefined') {
      return;
    }

    if (workspace) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace.id);
      localStorage.setItem(WORKSPACE_DATA_KEY, JSON.stringify(workspace));
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      localStorage.removeItem(WORKSPACE_DATA_KEY);
    }
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        selectedWorkspace,
        setSelectedWorkspace,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

