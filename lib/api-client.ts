/**
 * Unified API Client for Multi-Tenant SaaS Frontend
 * 
 * Features:
 * - Cookie-based authentication (credentials: 'include' on all requests)
 * - Safe URL building (no double slashes, handles trailing slashes)
 * - Automatic X-Workspace-ID header attachment
 * - Development-only debugging
 * - Consistent error handling
 * 
 * Usage:
 *   import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
 *   const workspaces = await apiGet('/api/v1/workspaces');
 *   const user = await apiPost('/api/v1/auth/login', { email, password });
 */

// Get base URL from environment, strip trailing slash
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return url.replace(/\/+$/, ''); // Remove trailing slashes
}

const BASE_URL = getBaseUrl();

/**
 * Build a safe API URL by ensuring exactly one slash between base and path
 * @param path - API path (e.g., '/api/v1/auth/login' or 'api/v1/auth/login')
 * @returns Full URL with no double slashes
 */
function apiUrl(path: string): string {
  // Remove leading slashes from path
  const cleanPath = path.replace(/^\/+/, '');
  // Ensure exactly one slash between base and path
  return `${BASE_URL}/${cleanPath}`;
}

export class WorkspaceRequiredError extends Error {
  constructor(message: string = 'Workspace is required for this request') {
    super(message);
    this.name = 'WorkspaceRequiredError';
  }
}

export class PlanRestrictedError extends Error {
  constructor(
    message: string = 'This feature requires a paid plan',
    public status: number,
    public feature?: string,
    public response?: any
  ) {
    super(message);
    this.name = 'PlanRestrictedError';
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions extends RequestInit {
  requireWorkspace?: boolean;
}

/**
 * Get the currently selected workspace ID from cookie (preferred) or localStorage (fallback).
 * Reads from the "activeWorkspaceId" key.
 */
function getSelectedWorkspaceId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Try cookie first (more reliable, works across page reloads)
  const nameEQ = 'activeWorkspaceId=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = decodeURIComponent(c.substring(nameEQ.length, c.length));
      // Only return non-empty values
      if (value && value.trim()) {
        return value.trim();
      }
    }
  }
  
  // Fallback to localStorage
  const localValue = localStorage.getItem('activeWorkspaceId');
  return localValue && localValue.trim() ? localValue.trim() : null;
}

/**
 * Internal function to make API requests with automatic cookie handling
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requireWorkspace = true, ...fetchOptions } = options;

  // Get workspace ID if required
  let workspaceId: string | null = null;
  if (requireWorkspace) {
    workspaceId = getSelectedWorkspaceId();
    if (!workspaceId || !workspaceId.trim()) {
      // Throw clear error and redirect to workspace selection
      const error = new WorkspaceRequiredError(
        'No workspace selected. Please select a workspace to continue.'
      );
      
      // Redirect to workspace picker in browser (only if not already there)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/select-workspace')) {
        window.location.href = '/select-workspace';
      }
      
      throw error;
    }
    // Ensure workspace ID is trimmed
    workspaceId = workspaceId.trim();
  }

  // Build headers - always include Content-Type for JSON
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge existing headers if provided
  if (fetchOptions.headers) {
    if (fetchOptions.headers instanceof Headers) {
      fetchOptions.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(fetchOptions.headers)) {
      fetchOptions.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, fetchOptions.headers);
    }
  }

  // Always attach X-Workspace-ID header when workspace is required
  if (workspaceId) {
    headers['X-Workspace-ID'] = workspaceId;
  }

  // Build full URL
  const url = apiUrl(endpoint);

  // Development-only logging
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log(`[API Client] ${fetchOptions.method || 'GET'} ${url}`);
  }

  // Make request - ALWAYS include credentials for cookies
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // CRITICAL: Always include cookies for session auth
  });

  // Development-only: Log 401 errors with helpful hint
  if (isDev && response.status === 401) {
    console.warn('[API Client] 401 Unauthorized - check cookie presence and SameSite/Secure backend config');
    console.warn('[API Client] Request URL:', url);
    console.warn('[API Client] Request method:', fetchOptions.method || 'GET');
    // Try to check if cookies are present (browser only)
    if (typeof document !== 'undefined') {
      console.warn('[API Client] Current cookies:', document.cookie || '(no cookies)');
    }
  }

  // Handle errors
  if (!response.ok) {
    let errorMessage = `API request failed: ${response.statusText}`;
    let errorData: any = null;

    try {
      errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      // Log the actual error for debugging
      if (isDev) {
        console.error('[API Client] Error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          data: errorData,
        });
      }
    } catch {
      // If response is not JSON, use status text
      errorMessage = await response.text().catch(() => response.statusText);
      if (isDev) {
        console.error('[API Client] Non-JSON error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorMessage,
        });
      }
    }

    // Check for plan restriction errors (402 Payment Required or 403 Forbidden)
    if (response.status === 402 || response.status === 403) {
      // Check if error message indicates plan restriction
      const isPlanRestricted = 
        errorMessage.toLowerCase().includes('plan') ||
        errorMessage.toLowerCase().includes('upgrade') ||
        errorMessage.toLowerCase().includes('subscription') ||
        errorMessage.toLowerCase().includes('feature') ||
        errorData?.feature;
      
      if (isPlanRestricted) {
        throw new PlanRestrictedError(
          errorMessage,
          response.status,
          errorData?.feature,
          errorData
        );
      }
    }

    // Log 404 errors with URL for debugging
    if (response.status === 404 && isDev) {
      console.error('[API Client] 404 Not Found:', {
        url,
        endpoint,
        method: fetchOptions.method || 'GET',
      });
    }

    throw new APIError(errorMessage, response.status, errorData);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  return response.json();
}

/**
 * GET request helper
 * @param path - API path (e.g., '/api/v1/workspaces')
 * @param options - Optional request options
 */
export async function apiGet<T = any>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'GET' });
}

/**
 * POST request helper
 * @param path - API path (e.g., '/api/v1/auth/login')
 * @param body - Request body (will be JSON stringified)
 * @param options - Optional request options
 */
export async function apiPost<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 * @param path - API path
 * @param body - Request body (will be JSON stringified)
 * @param options - Optional request options
 */
export async function apiPut<T = any>(path: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 * @param path - API path
 * @param options - Optional request options
 */
export async function apiDelete<T = any>(path: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'DELETE' });
}

/**
 * Legacy API object for backward compatibility
 * @deprecated Use apiGet, apiPost, apiPut, apiDelete directly
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiGet<T>(endpoint, options),

  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiPost<T>(endpoint, data, options),

  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiPut<T>(endpoint, data, options),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiDelete<T>(endpoint, options),
};
