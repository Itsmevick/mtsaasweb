'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/workspace-context';
import { api, APIError } from '@/lib/api-client';
import { getActiveWorkspaceId, getSelectedWorkspaceData } from '@/lib/cookies';
import { useMe } from '@/hooks/useMe';

// Kanban View Component
interface KanbanViewProps {
  tasks: Task[];
  projects: Project[];
  isOwnerOrAdmin: boolean;
  updatingStatus: string | null;
  onStatusUpdate: (taskId: string, newStatus: 'todo' | 'doing' | 'done') => void;
  getProjectName: (projectId: string | null) => string;
}

function KanbanView({
  tasks,
  projects,
  isOwnerOrAdmin,
  updatingStatus,
  onStatusUpdate,
  getProjectName,
}: KanbanViewProps) {
  const columns = [
    { id: 'todo', title: 'Todo', color: 'bg-yellow-50 border-yellow-200' },
    { id: 'doing', title: 'Doing', color: 'bg-blue-50 border-blue-200' },
    { id: 'done', title: 'Done', color: 'bg-green-50 border-green-200' },
  ] as const;

  const getTasksForColumn = (status: 'todo' | 'doing' | 'done') => {
    return tasks.filter((task) => task.status === status);
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

  const getNextStatus = (currentStatus: 'todo' | 'doing' | 'done'): 'todo' | 'doing' | 'done' | null => {
    switch (currentStatus) {
      case 'todo':
        return 'doing';
      case 'doing':
        return 'done';
      case 'done':
        return null;
      default:
        return null;
    }
  };

  const getPrevStatus = (currentStatus: 'todo' | 'doing' | 'done'): 'todo' | 'doing' | 'done' | null => {
    switch (currentStatus) {
      case 'done':
        return 'doing';
      case 'doing':
        return 'todo';
      case 'todo':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => {
        const columnTasks = getTasksForColumn(column.id);
        return (
          <div key={column.id} className={`rounded-lg border-2 ${column.color} p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {column.title}
                <span className="ml-2 text-sm font-normal text-gray-600">({columnTasks.length})</span>
              </h3>
            </div>
            <div className="space-y-3 min-h-[200px]">
              {columnTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <Link
                      href={`/dashboard/tasks/${task.id}`}
                      className="block mb-2"
                    >
                      <h4 className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {task.title}
                      </h4>
                    </Link>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {getProjectName(task.project_id)}
                      </span>
                      {isOwnerOrAdmin && (
                        <div className="flex items-center gap-1">
                          {getPrevStatus(task.status) && (
                            <button
                              onClick={() => onStatusUpdate(task.id, getPrevStatus(task.status)!)}
                              disabled={updatingStatus === task.id}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              title="Move left"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                          )}
                          {getNextStatus(task.status) && (
                            <button
                              onClick={() => onStatusUpdate(task.id, getNextStatus(task.status)!)}
                              disabled={updatingStatus === task.id}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              title="Move right"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                          {!getPrevStatus(task.status) && !getNextStatus(task.status) && (
                            <select
                              value={task.status}
                              onChange={(e) =>
                                onStatusUpdate(task.id, e.target.value as 'todo' | 'doing' | 'done')
                              }
                              disabled={updatingStatus === task.id}
                              className={`text-xs font-medium px-2 py-1 rounded border-0 ${getStatusColor(
                                task.status
                              )} ${updatingStatus === task.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <option value="todo">Todo</option>
                              <option value="doing">Doing</option>
                              <option value="done">Done</option>
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

export default function TasksPage() {
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();
  const { isOwnerOrAdmin, workspaceRole } = useMe();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(selectedWorkspace);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProjectId, setTaskProjectId] = useState<string>('');
  const [taskStatus, setTaskStatus] = useState<'todo' | 'doing' | 'done'>('todo');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

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
    async function fetchData() {
      // Wait a tick to ensure workspace state is set
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const currentWorkspace = workspace || selectedWorkspace;
      if (!currentWorkspace) {
        setIsLoading(false);
        return;
      }

      // Double-check that we have a valid workspace ID from cookie
      const workspaceId = getActiveWorkspaceId();
      if (!workspaceId || !workspaceId.trim()) {
        console.warn('[Tasks] No workspace ID available in cookie, redirecting to select workspace');
        if (!window.location.pathname.startsWith('/select-workspace')) {
          router.push('/select-workspace');
        }
        return;
      }

      // Verify the workspace ID matches
      if (currentWorkspace.id !== workspaceId.trim()) {
        console.warn('[Tasks] Workspace ID mismatch:', { 
          workspaceId: currentWorkspace.id, 
          cookieId: workspaceId.trim() 
        });
      }

      // Build query params for tasks
      const taskParams = new URLSearchParams();
      if (filterProjectId) {
        taskParams.append('projectId', filterProjectId);
      }
      if (filterStatus) {
        taskParams.append('status', filterStatus);
      }
      const tasksUrl = taskParams.toString() 
        ? `/api/v1/tasks?${taskParams.toString()}`
        : '/api/v1/tasks';

      try {
        setIsLoading(true);
        setError(null);

        console.log('[Tasks] Fetching data for workspace:', workspaceId.trim());

        // Fetch projects and tasks in parallel
        const [projectsData, tasksData] = await Promise.all([
          api.get<Project[]>('/api/v1/projects'),
          api.get<Task[]>(tasksUrl),
        ]);

        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
      } catch (err) {
        if (err instanceof APIError) {
          console.error('[Tasks] API Error:', {
            status: err.status,
            message: err.message,
            response: err.response,
          });
          
          if (err.status === 400) {
            // Check if error message indicates workspace issue
            const errorMsg = err.message.toLowerCase();
            if (errorMsg.includes('workspace') || errorMsg.includes('workspace id')) {
              console.error('[Tasks] Workspace-related 400 error, redirecting to select workspace');
              if (!window.location.pathname.startsWith('/select-workspace')) {
                router.push('/select-workspace');
              }
            } else if (errorMsg.includes('project_id') || errorMsg.includes('projectid')) {
              // Backend might be running old code - show helpful error
              console.error('[Tasks] Backend error about project_id - server may need restart');
              setError('Backend configuration error. Please contact support or restart the server.');
            } else {
              // Other 400 errors - show error message
              setError(err.message || 'Bad request. Please try again.');
            }
            return;
          } else if (err.status === 401) {
            router.push('/login');
            return;
          } else if (err.status === 403) {
            setError('No access to this workspace');
          } else if (err.status === 404) {
            // 404 means endpoint doesn't exist - log for debugging
            console.error('[Tasks] 404 - Endpoint mismatch:', {
              url: tasksUrl,
              endpoint: '/api/v1/tasks',
            });
            if (process.env.NODE_ENV === 'development') {
              setError('Endpoint mismatch (dev). Check console for requested URL.');
            } else {
              setError('Tasks endpoint not found. Please check API configuration.');
            }
          } else {
            setError(err.message || 'Failed to load tasks');
          }
        } else {
          setError('Failed to load tasks');
          console.error('[Tasks] Unknown error:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [workspace, selectedWorkspace, router, filterProjectId, filterStatus]);

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
      };

      if (taskDescription.trim()) {
        payload.description = taskDescription.trim();
      }

      if (taskProjectId) {
        payload.projectId = taskProjectId;
      }

      const newTask = await api.post<Task>('/api/v1/tasks', payload);

      // Add the new task to the list
      setTasks((prev) => [newTask, ...prev]);

      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setTaskProjectId('');
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
        } else if (err.status === 404) {
          console.error('[Tasks] 404 - Create task endpoint mismatch:', {
            url: '/api/v1/tasks',
            method: 'POST',
          });
          if (process.env.NODE_ENV === 'development') {
            setCreateError('Endpoint mismatch (dev). Check console for requested URL.');
          } else {
            setCreateError('Create task endpoint not found.');
          }
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
    // Find the task to get its current status for rollback
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    setStatusUpdateError(null);

    try {
      setUpdatingStatus(taskId);

      const updatedTask = await api.patch<Task>(`/api/v1/tasks/${taskId}`, {
        status: newStatus,
      });

      // Update with server response
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
    } catch (err) {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t))
      );

      if (err instanceof APIError) {
        if (err.status === 400) {
          router.push('/select-workspace');
          return;
        } else if (err.status === 401) {
          router.push('/login');
          return;
        } else if (err.status === 403) {
          setStatusUpdateError('No access to update task status');
        } else if (err.status === 404) {
          console.error('[Tasks] 404 - Update task endpoint mismatch:', {
            url: `/api/v1/tasks/${taskId}`,
            method: 'PATCH',
          });
          setStatusUpdateError('Task not found');
        } else {
          setStatusUpdateError(err.message || 'Failed to update task status');
        }
      } else {
        setStatusUpdateError('Failed to update task status');
      }
      console.error('Error updating task status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getProjectName = (projectId: string | null): string => {
    if (!projectId) return 'No Project';
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : 'Unknown Project';
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

  // Filter tasks for Kanban (exclude status filter when in Kanban mode)
  const filteredTasksForKanban = filterProjectId
    ? tasks.filter((task) => task.project_id === filterProjectId)
    : tasks;

  // Use workspace from state (which may come from localStorage) or from context
  const currentWorkspace = workspace || selectedWorkspace;

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Please select a workspace to view tasks.</p>
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
          <h1 className="text-3xl font-bold mb-6">Tasks</h1>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Tasks</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-gray-600 mt-1">
              Workspace: {currentWorkspace.name || currentWorkspace.id}
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

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              List
            </button>
            <button
              onClick={() => {
                setViewMode('kanban');
                // Clear status filter when switching to Kanban (since Kanban shows all statuses)
                if (filterStatus) {
                  setFilterStatus('');
                }
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Kanban
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filter-project" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Project
              </label>
              <select
                id="filter-project"
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                disabled={viewMode === 'kanban'}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  viewMode === 'kanban' ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="">All Statuses</option>
                <option value="todo">Todo</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
              {viewMode === 'kanban' && (
                <p className="text-xs text-gray-500 mt-1">Status filter disabled in Kanban view</p>
              )}
            </div>
            {(filterProjectId || filterStatus) && (
              <button
                onClick={() => {
                  setFilterProjectId('');
                  setFilterStatus('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Status Update Error Toast */}
        {statusUpdateError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{statusUpdateError}</p>
            <button
              onClick={() => setStatusUpdateError(null)}
              className="text-red-700 hover:text-red-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No tasks yet. Create your first task to get started.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
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
                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {task.title}
                      </Link>
                      {task.description && (
                        <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getProjectName(task.project_id)}</div>
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
        ) : (
          <KanbanView
            tasks={filteredTasksForKanban}
            projects={projects}
            isOwnerOrAdmin={isOwnerOrAdmin}
            updatingStatus={updatingStatus}
            onStatusUpdate={handleStatusUpdate}
            getProjectName={getProjectName}
          />
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
                    <select
                      id="project"
                      value={taskProjectId}
                      onChange={(e) => setTaskProjectId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
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
                        setTaskProjectId('');
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
