'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, APIError } from '@/lib/api-client';
import { getActiveWorkspaceId, setActiveWorkspaceId, setSelectedWorkspaceData, clearWorkspaceSelection } from '@/lib/cookies';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

interface DashboardTopbarProps {
  pageTitle?: string;
}

export default function DashboardTopbar({ pageTitle }: DashboardTopbarProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch workspaces and user on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch workspaces (no workspace required)
        const workspacesData = await api.get<Workspace[]>('/api/v1/workspaces', {
          requireWorkspace: false,
        });
        setWorkspaces(Array.isArray(workspacesData) ? workspacesData : []);
        
        // Fetch current user (no workspace required)
        const userData = await api.get<User>('/api/v1/auth/me', {
          requireWorkspace: false,
        });
        setUser(userData);
      } catch (err) {
        if (err instanceof APIError) {
          if (err.status === 401) {
            router.push('/login');
            return;
          }
          console.error('[Topbar] Error fetching data:', err);
        } else {
          console.error('[Topbar] Unknown error:', err);
        }
      } finally {
        setIsLoadingWorkspaces(false);
        setIsLoadingUser(false);
      }
    }

    fetchData();
  }, [router]);

  // Determine current workspace from cookie/localStorage
  useEffect(() => {
    const workspaceId = getActiveWorkspaceId();
    if (workspaceId && workspaces.length > 0) {
      const workspace = workspaces.find((w) => w.id === workspaceId.trim());
      if (workspace) {
        setCurrentWorkspace(workspace);
      } else {
        // Workspace ID exists but not in list - might be stale
        console.warn('[Topbar] Workspace ID not found in workspaces list');
      }
    }
  }, [workspaces]);

  const handleWorkspaceChange = async (workspace: Workspace) => {
    try {
      // Update cookie and localStorage
      setActiveWorkspaceId(workspace.id);
      setSelectedWorkspaceData(workspace);
      setCurrentWorkspace(workspace);
      setShowWorkspaceDropdown(false);

      // Force refresh to refetch data with new workspace
      window.location.reload();
    } catch (err) {
      console.error('[Topbar] Error switching workspace:', err);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Call logout endpoint
      await api.post('/api/v1/auth/logout', undefined, {
        requireWorkspace: false,
      });

      // Clear workspace selection
      clearWorkspaceSelection();

      // Redirect to home
      window.location.href = '/';
    } catch (err) {
      if (err instanceof APIError) {
        console.error('[Topbar] Logout error:', err);
        // Even if API call fails, clear local state and redirect
        clearWorkspaceSelection();
        window.location.href = '/';
      } else {
        console.error('[Topbar] Unknown logout error:', err);
        clearWorkspaceSelection();
        window.location.href = '/';
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Page Title (optional) */}
          <div className="flex-1">
            {pageTitle && (
              <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
            )}
          </div>

          {/* Center/Left: Workspace Dropdown */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <button
                onClick={() => {
                  setShowWorkspaceDropdown(!showWorkspaceDropdown);
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {isLoadingWorkspaces ? (
                  <span className="text-gray-500">Loading...</span>
                ) : currentWorkspace ? (
                  <span>{currentWorkspace.name}</span>
                ) : (
                  <span className="text-gray-500">Select Workspace</span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showWorkspaceDropdown ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Workspace Dropdown Menu */}
              {showWorkspaceDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowWorkspaceDropdown(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    {workspaces.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        No workspaces available
                      </div>
                    ) : (
                      workspaces.map((workspace) => (
                        <button
                          key={workspace.id}
                          onClick={() => handleWorkspaceChange(workspace)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            currentWorkspace?.id === workspace.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{workspace.name}</span>
                            {currentWorkspace?.id === workspace.id && (
                              <svg
                                className="w-4 h-4 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: User Menu */}
          <div className="flex-1 flex justify-end">
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowWorkspaceDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                {isLoadingUser ? (
                  <span className="text-gray-500">Loading...</span>
                ) : user ? (
                  <>
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {user.name
                        ? user.name.charAt(0).toUpperCase()
                        : user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">
                      {user.name || user.email}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">User</span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    {user && (
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {user.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

