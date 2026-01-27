'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function ProjectsPage() {
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();
  const { isOwnerOrAdmin, workspaceRole } = useMe();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(selectedWorkspace);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    async function fetchProjects() {
      const currentWorkspace = workspace || selectedWorkspace;
      if (!currentWorkspace) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await api.get<Project[]>('/api/v1/projects');
        setProjects(Array.isArray(data) ? data : []);
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
          } else {
            setError(err.message);
          }
        } else {
          setError('Failed to load projects');
        }
        console.error('Error fetching projects:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [workspace, selectedWorkspace, router]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!projectName.trim()) {
      setCreateError('Project name is required');
      return;
    }

    setIsCreating(true);

    try {
      const createdProject = await api.post<Project>('/api/v1/projects', {
        name: projectName.trim(),
        description: projectDescription.trim() || '',
      });

      // Add to list and close modal
      setProjects([createdProject, ...projects]);
      setShowCreateModal(false);
      setProjectName('');
      setProjectDescription('');
      setCreateError(null);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 400) {
          setCreateError('Workspace missing. Please select a workspace.');
        } else if (err.status === 401) {
          router.push('/login');
          return;
        } else if (err.status === 403) {
          setCreateError('No access to create projects in this workspace');
        } else {
          setCreateError(err.message);
        }
      } else {
        setCreateError('Failed to create project');
      }
      console.error('Error creating project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

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
          <h1 className="text-3xl font-bold mb-6">Projects</h1>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Projects</h1>
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
            <h1 className="text-3xl font-bold">Projects</h1>
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
              New Project
            </button>
          )}
        </div>

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Create New Project</h2>

              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="My Project"
                    disabled={isCreating}
                  />
                </div>

                <div>
                  <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="project-description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Project description..."
                    disabled={isCreating}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setProjectName('');
                      setProjectDescription('');
                      setCreateError(null);
                    }}
                    disabled={isCreating}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Projects List */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No projects yet. Create your first project to get started.</p>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                )}
                <div className="text-xs text-gray-500">
                  Created: {formatDate(project.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

