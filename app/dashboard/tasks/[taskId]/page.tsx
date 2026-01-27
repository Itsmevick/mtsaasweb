'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/workspace-context';
import { api, APIError } from '@/lib/api-client';
import { getActiveWorkspaceId, getSelectedWorkspaceData } from '@/lib/cookies';
import { useMe } from '@/hooks/useMe';

interface Workspace {
  id: string;
  name: string;
  slug?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
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

export default function TaskDetailsPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();
  const { isOwnerOrAdmin, workspaceRole } = useMe();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(selectedWorkspace);
  const [task, setTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    // Check cookie/localStorage for activeWorkspaceId
    if (typeof window !== 'undefined') {
      const activeWorkspaceId = getActiveWorkspaceId();
      if (activeWorkspaceId) {
        const workspaceData = getSelectedWorkspaceData();
        if (workspaceData) {
          setWorkspace(workspaceData);
          if (!selectedWorkspace) {
            setSelectedWorkspace(workspaceData);
          }
        } else {
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
    async function fetchData() {
      const currentWorkspace = workspace || selectedWorkspace;
      if (!currentWorkspace || !taskId) {
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

        // Fetch task by ID
        const taskData = await api.get<Task>(`/api/v1/tasks/${taskId}`);

        // If task has a project, fetch project details
        if (taskData.project_id) {
          try {
            const projectData = await api.get<Project>(`/api/v1/projects/${taskData.project_id}`);
            setProject(projectData);
          } catch (err) {
            // Project fetch failed, but don't block task display
            console.warn('[TaskDetails] Failed to fetch project:', err);
          }
        }

        setTask(taskData);
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
          } else if (err.status === 404) {
            setError('Task not found in this workspace');
          } else {
            setError(err.message || 'Failed to load task');
          }
        } else {
          setError('Failed to load task');
          console.error('Error fetching task:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [workspace, selectedWorkspace, router, taskId]);

  const handleStatusUpdate = async (newStatus: 'todo' | 'doing' | 'done') => {
    if (!task) return;

    try {
      setUpdatingStatus(true);

      const updatedTask = await api.patch<Task>(`/api/v1/tasks/${task.id}`, {
        status: newStatus,
      });

      setTask(updatedTask);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 400) {
          router.push('/select-workspace');
          return;
        } else if (err.status === 401) {
          router.push('/login');
          return;
        } else if (err.status === 403) {
          setError('No access to this workspace');
        } else if (err.status === 404) {
          setError('Task not found in this workspace');
        } else {
          setError(err.message || 'Failed to update task status');
        }
      } else {
        setError('Failed to update task status');
      }
      console.error('Error updating task status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'todo':
        return 'bg-yellow-100 text-yellow-800';
      case 'doing':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const currentWorkspace = workspace || selectedWorkspace;

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Please select a workspace to view task details.</p>
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
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Task Details</h1>
          <p className="text-gray-600">Loading task...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            href="/dashboard/tasks"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Tasks
          </Link>
          <h1 className="text-3xl font-bold mb-6">Task Details</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            href="/dashboard/tasks"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Tasks
          </Link>
          <h1 className="text-3xl font-bold mb-6">Task Details</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700">Task not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Link */}
        <Link
          href="/dashboard/tasks"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Tasks
        </Link>

        {/* Task Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
              {workspaceRole === 'member' && (
                <p className="text-sm text-amber-600">Read-only access</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isOwnerOrAdmin ? (
                <select
                  value={task.status}
                  onChange={(e) =>
                    handleStatusUpdate(e.target.value as 'todo' | 'doing' | 'done')
                  }
                  disabled={updatingStatus}
                  className={`text-sm font-medium px-4 py-2 rounded-lg border-0 ${getStatusColor(
                    task.status
                  )} ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <option value="todo">Todo</option>
                  <option value="doing">Doing</option>
                  <option value="done">Done</option>
                </select>
              ) : (
                <span
                  className={`inline-flex px-4 py-2 text-sm font-medium rounded-lg ${getStatusColor(
                    task.status
                  )}`}
                >
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Task Description */}
          {task.description && (
            <div className="mb-4">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Description</h2>
              <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Task Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700">Project</p>
              {project ? (
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-1 inline-block"
                >
                  {project.name} →
                </Link>
              ) : task.project_id ? (
                <Link
                  href={`/dashboard/projects/${task.project_id}`}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-1 inline-block"
                >
                  View Project →
                </Link>
              ) : (
                <p className="text-sm text-gray-500 mt-1">No project</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Created</p>
              <p className="text-sm text-gray-900 mt-1">{formatDate(task.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Last Updated</p>
              <p className="text-sm text-gray-900 mt-1">{formatDate(task.updated_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Workspace</p>
              <p className="text-sm text-gray-900 mt-1">
                {currentWorkspace.name || currentWorkspace.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

