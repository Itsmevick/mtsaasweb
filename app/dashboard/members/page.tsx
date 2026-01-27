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

interface Member {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export default function MembersPage() {
  const { selectedWorkspace, setSelectedWorkspace } = useWorkspace();
  const { isOwnerOrAdmin, isMember, error: meError } = useMe();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(selectedWorkspace);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'member' | 'admin'>('member');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showSignupLink, setShowSignupLink] = useState(false);

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
    async function fetchMembers() {
      const currentWorkspace = workspace || selectedWorkspace;
      if (!currentWorkspace) {
        setIsLoading(false);
        return;
      }

      // Double-check that we have a valid workspace ID
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

        const data = await api.get<Member[]>('/api/v1/members');
        setMembers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err instanceof APIError) {
          if (err.status === 400) {
            if (!window.location.pathname.startsWith('/select-workspace')) {
              router.push('/select-workspace');
            }
            return;
          } else if (err.status === 401) {
            router.push('/login');
            return;
          } else if (err.status === 403) {
            setError('No access to this workspace');
          } else if (err.status === 404) {
            // 404 means endpoint doesn't exist - log for debugging
            console.error('[Members] 404 - Endpoint not found:', err);
            setError('Members endpoint not found. Please check API configuration.');
          } else {
            setError(err.message || 'Failed to load members');
          }
        } else {
          setError('Failed to load members');
        }
        console.error('Error fetching members:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMembers();
  }, [workspace, selectedWorkspace, router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addEmail.trim()) {
      setAddError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addEmail.trim())) {
      setAddError('Please enter a valid email address');
      return;
    }

    try {
      setIsAdding(true);
      setAddError(null);
      setShowSignupLink(false);

      await api.post('/api/v1/members', {
        email: addEmail.trim(),
        role: addRole,
      });

      // Refresh members list
      const data = await api.get<Member[]>('/api/v1/members');
      setMembers(Array.isArray(data) ? data : []);

      // Reset form and close modal
      setAddEmail('');
      setAddRole('member');
      setShowAddModal(false);
      setShowSignupLink(false);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 400) {
          if (err.message.includes('workspace')) {
            if (!window.location.pathname.startsWith('/select-workspace')) {
              router.push('/select-workspace');
            }
            return;
          }
          // Check if it's the "user not found" error
          if (err.message.toLowerCase().includes('user not found') || 
              err.message.toLowerCase().includes('sign up')) {
            setShowSignupLink(true);
            setAddError('That user hasn\'t signed up yet.');
          } else {
            setAddError(err.message || 'Failed to add member');
          }
        } else if (err.status === 401) {
          router.push('/login');
          return;
        } else if (err.status === 403) {
          setAddError('Only admins and owners can add members');
        } else if (err.status === 404) {
          setAddError('Add member endpoint not found. Please check API configuration.');
        } else if (err.status === 409) {
          setAddError('User already a member of this workspace');
        } else {
          // Check for user not found error message
          const errorMsg = err.message?.toLowerCase() || '';
          if (errorMsg.includes('user not found') || errorMsg.includes('sign up')) {
            setAddError('User must sign up first.');
            setShowSignupLink(true);
          } else {
            setAddError(err.message || 'Failed to add member');
          }
        }
      } else {
        setAddError('Failed to add member');
      }
      console.error('Error adding member:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const copySignupLink = () => {
    const signupLink = `${window.location.origin}/register`;
    navigator.clipboard.writeText(signupLink).then(() => {
      // Show temporary success message
      const originalError = addError;
      setAddError('Signup link copied to clipboard!');
      setTimeout(() => {
        setAddError(originalError);
      }, 2000);
    }).catch(() => {
      setAddError('Failed to copy link. Share this URL: ' + signupLink);
    });
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

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Use workspace from state (which may come from localStorage) or from context
  const currentWorkspace = workspace || selectedWorkspace;

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Please select a workspace to view members.</p>
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
          <h1 className="text-3xl font-bold mb-6">Members</h1>
          <p className="text-gray-600">Loading members...</p>
        </div>
      </div>
    );
  }

  if (error || meError) {
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Members</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error || meError}</p>
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
            <h1 className="text-3xl font-bold">Members</h1>
            <p className="text-gray-600 mt-1">
              Workspace: {currentWorkspace.name || currentWorkspace.id}
            </p>
            {isMember && (
              <p className="text-sm text-amber-600 mt-1">Read-only access</p>
            )}
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Member
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No members yet. Add someone to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.name || 'No name'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                          member.role
                        )}`}
                      >
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.joinedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Add Member</h2>

                {addError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 mb-2">{addError}</p>
                    {showSignupLink && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-2">
                          Share the signup link: <span className="font-mono text-xs">{window.location.origin}/register</span>
                        </p>
                        <button
                          type="button"
                          onClick={copySignupLink}
                          className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Copy Signup Link
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleAdd}>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="mb-6">
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      id="role"
                      value={addRole}
                      onChange={(e) => setAddRole(e.target.value as 'member' | 'admin')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Members can view and contribute. Admins can manage members and settings.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isAdding}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAdding ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setAddError(null);
                        setAddEmail('');
                        setAddRole('member');
                        setShowSignupLink(false);
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
