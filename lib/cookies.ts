/**
 * Cookie utilities for workspace ID storage
 * Uses cookies for server-side access and mirrors to localStorage for client-side
 */

const WORKSPACE_ID_COOKIE = 'activeWorkspaceId';
const WORKSPACE_DATA_COOKIE = 'selectedWorkspaceData';

/**
 * Set a cookie with the given name, value, and options
 */
function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

/**
 * Set the active workspace ID in both cookie and localStorage
 */
export function setActiveWorkspaceId(workspaceId: string) {
  // Set cookie (accessible server-side and client-side)
  setCookie(WORKSPACE_ID_COOKIE, workspaceId);
  
  // Mirror to localStorage (for client-side quick access)
  if (typeof window !== 'undefined') {
    localStorage.setItem(WORKSPACE_ID_COOKIE, workspaceId);
  }
}

/**
 * Set the selected workspace data in both cookie and localStorage
 */
export function setSelectedWorkspaceData(workspace: any) {
  const dataStr = JSON.stringify(workspace);
  
  // Set cookie (note: cookies have size limits, so we also use localStorage)
  setCookie(WORKSPACE_DATA_COOKIE, dataStr);
  
  // Mirror to localStorage (preferred for larger data)
  if (typeof window !== 'undefined') {
    localStorage.setItem(WORKSPACE_DATA_COOKIE, dataStr);
  }
}

/**
 * Get the active workspace ID from cookie (preferred) or localStorage (fallback)
 */
export function getActiveWorkspaceId(): string | null {
  // Try cookie first (works on both server and client)
  const cookieValue = getCookie(WORKSPACE_ID_COOKIE);
  if (cookieValue) {
    return cookieValue;
  }
  
  // Fallback to localStorage (client-side only)
  if (typeof window !== 'undefined') {
    return localStorage.getItem(WORKSPACE_ID_COOKIE);
  }
  
  return null;
}

/**
 * Get the selected workspace data from localStorage (cookie has size limits)
 */
export function getSelectedWorkspaceData(): any | null {
  if (typeof window === 'undefined') return null;
  
  const dataStr = localStorage.getItem(WORKSPACE_DATA_COOKIE);
  if (!dataStr) return null;
  
  try {
    return JSON.parse(dataStr);
  } catch {
    return null;
  }
}

/**
 * Clear workspace selection from both cookie and localStorage
 */
export function clearWorkspaceSelection() {
  deleteCookie(WORKSPACE_ID_COOKIE);
  deleteCookie(WORKSPACE_DATA_COOKIE);
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WORKSPACE_ID_COOKIE);
    localStorage.removeItem(WORKSPACE_DATA_COOKIE);
  }
}

