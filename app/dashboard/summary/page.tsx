'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/workspace-context';
import { api, APIError } from '@/lib/api-client';
import { getActiveWorkspaceId, getSelectedWorkspaceData } from '@/lib/cookies';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
}

interface DashboardSummary {
  projectsCount: number;
  tasksCount: number;
  membersCount: number;
  tasksByStatus: {
    todo: number;
    doing: number;
    done: number;
  };
}

interface Task {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  created_at: string;
  updated_at: string;
}

export default function SummaryPage() {
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(selectedWorkspace);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    async function fetchSummary() {
      const currentWorkspace = workspace || selectedWorkspace;
      if (!currentWorkspace) {
        setIsLoading(false);
        return;
      }

      const workspaceId = getActiveWorkspaceId();
      if (!workspaceId || !workspaceId.trim()) {
        if (!window.location.pathname.startsWith('/select-workspace')) {
          router.push('/select-workspace');
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch summary data
        const data = await api.get<DashboardSummary>('/api/v1/dashboard/summary');
        // Ensure tasksByStatus exists and has all required fields
        if (!data.tasksByStatus) {
          data.tasksByStatus = { todo: 0, doing: 0, done: 0 };
        } else {
          data.tasksByStatus = {
            todo: data.tasksByStatus.todo ?? 0,
            doing: data.tasksByStatus.doing ?? 0,
            done: data.tasksByStatus.done ?? 0,
          };
        }
        setSummary(data);

        // Fetch recent tasks (already sorted by created_at DESC)
        try {
          const tasks = await api.get<Task[]>('/api/v1/tasks');
          // Take latest 10 tasks
          const recent = Array.isArray(tasks) ? tasks.slice(0, 10) : [];
          setRecentTasks(recent);
        } catch (taskErr) {
          // If tasks fetch fails, don't block summary display
          console.warn('Failed to fetch recent tasks:', taskErr);
          setRecentTasks([]);
        }
      } catch (err) {
        if (err instanceof APIError) {
          if (err.status === 400) {
            const errorMsg = err.message.toLowerCase();
            if (errorMsg.includes('workspace') || errorMsg.includes('workspace id')) {
              if (!window.location.pathname.startsWith('/select-workspace')) {
                router.push('/select-workspace');
              }
              return;
            }
            setError(err.message || 'Bad request');
          } else if (err.status === 401) {
            router.push('/login');
            return;
          } else if (err.status === 403) {
            setError('No access to this workspace');
          } else {
            setError(err.message || 'Failed to load dashboard data');
          }
        } else {
          setError('Failed to load dashboard data');
        }
        console.error('Error fetching dashboard summary:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSummary();
  }, [workspace, selectedWorkspace, router]);

  // Use workspace from state (which may come from localStorage) or from context
  const currentWorkspace = workspace || selectedWorkspace;

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Please select a workspace to view the dashboard.</p>
          <Link
            href="/select-workspace"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Workspace
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Summary</h1>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Summary</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Summary</h1>
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Summary</h1>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Projects Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projects</p>
                <p className="text-3xl font-bold mt-2">{summary.projectsCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tasks Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks</p>
                <p className="text-3xl font-bold mt-2">{summary.tasksCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Members Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Members</p>
                <p className="text-3xl font-bold mt-2">{summary.membersCount}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tasks by Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks by Status</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    <span className="text-sm">Todo: {summary.tasksByStatus?.todo ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                    <span className="text-sm">Doing: {summary.tasksByStatus?.doing ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                    <span className="text-sm">Done: {summary.tasksByStatus?.done ?? 0}</span>
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          {recentTasks.length === 0 ? (
            <p className="text-gray-600">No recent tasks</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(task.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span
                      className={`ml-4 px-3 py-1 text-xs font-medium rounded-full ${
                        task.status === 'todo'
                          ? 'bg-yellow-100 text-yellow-800'
                          : task.status === 'doing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

