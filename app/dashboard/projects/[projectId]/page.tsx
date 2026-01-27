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

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();
  const { isOwnerOrAdmin, workspaceRole } = useMe();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(selectedWorkspace);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<'todo' | 'doing' | 'done'>('todo');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

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
      if (!currentWorkspace || !projectId) {
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

        // Try to fetch project by ID first
        let projectData: Project | null = null;
        try {
          projectData = await api.get<Project>(`/api/v1/projects/${projectId}`);
        } catch (err) {
          if (err instanceof APIError && err.status === 404) {
            // If project not found, try fetching all projects and finding the one
            const allProjects = await api.get<Project[]>('/api/v1/projects');
            projectData = allProjects.find((p) => p.id === projectId) || null;
          } else {
            throw err;
          }
        }

        if (!projectData) {
          setError('Project not found');
          setIsLoading(false);
          return;
        }

        setProject(projectData);

        // Fetch tasks filtered by project
        const tasksData = await api.get<Task[]>(`/api/v1/tasks?projectId=${projectId}`);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
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
            setError('Project not found');
          } else {
            setError(err.message || 'Failed to load project');
          }
        } else {
          setError('Failed to load project');
          console.error('Error fetching project:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [workspace, selectedWorkspace, router, projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskTitle.trim()) {
      setCreateError('Title is required');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      const payload: any = {
        title: taskTitle.trim(),
        status: taskStatus,
        projectId: projectId, // Pre-fill project ID
      };

      if (taskDescription.trim()) {
        payload.description = taskDescription.trim();
      }

      const newTask = await api.post<Task>('/api/v1/tasks', payload);

      // Add the new task to the list
      setTasks((prev) => [newTask, ...prev]);

      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setTaskStatus('todo');
      setShowCreateModal(false);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 400) {
          router.push('/select-workspace');
          return;
        } else if (err.status === 401) {
          router.push('/login');
          return;
        } else if (err.status === 403) {
          setCreateError('No access to this workspace');
        } else {
          setCreateError(err.message);
        }
      } else {
        setCreateError('Failed to create task');
      }
      console.error('Error creating task:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: 'todo' | 'doing' | 'done') => {
    try {
      setUpdatingStatus(taskId);

      const updatedTask = await api.patch<Task>(`/api/v1/tasks/${taskId}`, {
        status: newStatus,
      });

      // Update the task in the list
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updatedTask : task))
      );
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
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to update task status');
      }
      console.error('Error updating task status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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

  // Compute stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    doing: tasks.filter((t) => t.status === 'doing').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const currentWorkspace = workspace || selectedWorkspace;

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Please select a workspace to view project details.</p>
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
          <h1 className="text-3xl font-bold mb-6">Project Details</h1>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <Link
            href="/dashboard/projects"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold mb-6">Project Details</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <Link
            href="/dashboard/projects"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold mb-6">Project Details</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700">Project not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Link */}
        <Link
          href="/dashboard/projects"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Projects
        </Link>

        {/* Project Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Created: {formatDate(project.created_at)}
            </p>
            {workspaceRole === 'member' && (
              <p className="text-sm text-amber-600 mt-1">Read-only access</p>
            )}
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Task
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600">Total Tasks</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600">Todo</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.todo}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600">Doing</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.doing}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600">Done</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.done}</p>
          </div>
        </div>

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No tasks yet. Create your first task for this project.</p>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Task
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOwnerOrAdmin ? (
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleStatusUpdate(task.id, e.target.value as 'todo' | 'doing' | 'done')
                          }
                          disabled={updatingStatus === task.id}
                          className={`text-sm font-medium px-3 py-1 rounded-full border-0 ${getStatusColor(
                            task.status
                          )} ${updatingStatus === task.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <option value="todo">Todo</option>
                          <option value="doing">Doing</option>
                          <option value="done">Done</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(task.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Create New Task</h2>

                {createError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{createError}</p>
                  </div>
                )}

                <form onSubmit={handleCreateTask}>
                  <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="Enter task title"
                    />
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter task description (optional)"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                      Project
                    </label>
                    <input
                      type="text"
                      id="project"
                      value={project.name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Project is locked to this project</p>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value as 'todo' | 'doing' | 'done')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todo">Todo</option>
                      <option value="doing">Doing</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? 'Creating...' : 'Create Task'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateError(null);
                        setTaskTitle('');
                        setTaskDescription('');
                        setTaskStatus('todo');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

