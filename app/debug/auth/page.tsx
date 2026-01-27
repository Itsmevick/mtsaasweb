'use client';

import { useState } from 'react';
import { apiGet } from '@/lib/api-client';

interface DebugResult {
  endpoint: string;
  status: number | null;
  statusText: string;
  success: boolean;
  data: any;
  error: string | null;
  cookies: string;
}

export default function DebugAuthPage() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testEndpoint = async (endpoint: string) => {
    setIsLoading(true);
    const result: DebugResult = {
      endpoint,
      status: null,
      statusText: '',
      success: false,
      data: null,
      error: null,
      cookies: typeof document !== 'undefined' ? document.cookie || '(no cookies)' : 'N/A',
    };

    try {
      const data = await apiGet(endpoint, { requireWorkspace: false });
      result.success = true;
      result.data = data;
      result.status = 200;
      result.statusText = 'OK';
    } catch (err: any) {
      result.success = false;
      if (err instanceof Error) {
        result.error = err.message;
        if (err.name === 'APIError' && (err as any).status) {
          result.status = (err as any).status;
          result.statusText = (err as any).status === 401 ? 'Unauthorized' : 
                             (err as any).status === 404 ? 'Not Found' : 'Error';
        }
      } else {
        result.error = 'Unknown error';
      }
    }

    setResults((prev) => [...prev, result]);
    setIsLoading(false);
  };

  const testAll = async () => {
    setResults([]);
    await testEndpoint('/api/v1/auth/me');
    await testEndpoint('/api/v1/workspaces');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-4">Auth Debug Page</h1>
          <p className="text-gray-600 mb-6">
            This page helps debug cookie-based authentication. Check the browser console and Network tab for detailed information.
          </p>

          <div className="mb-6 space-y-2">
            <button
              onClick={testAll}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Testing...' : 'Test All Endpoints'}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => testEndpoint('/api/v1/auth/me')}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
              >
                Test /auth/me
              </button>
              <button
                onClick={() => testEndpoint('/api/v1/workspaces')}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
              >
                Test /workspaces
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Results</h2>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.success
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{result.endpoint}</h3>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        result.success
                          ? 'bg-green-200 text-green-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {result.status ? `${result.status} ${result.statusText}` : 'Error'}
                    </span>
                  </div>

                  {result.status === 401 && (
                    <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm">
                      <strong>401 Unauthorized:</strong> Check that cookies are being sent. Verify:
                      <ul className="list-disc list-inside mt-1">
                        <li>Login response includes Set-Cookie header</li>
                        <li>Subsequent requests include Cookie header</li>
                        <li>Backend CORS allows credentials</li>
                        <li>Cookie SameSite and Secure attributes are correct</li>
                      </ul>
                    </div>
                  )}

                  <div className="text-sm space-y-1">
                    <div>
                      <strong>Cookies:</strong> {result.cookies}
                    </div>
                    {result.data && (
                      <div>
                        <strong>Response:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto text-xs">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {result.error && (
                      <div>
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold mb-2">How to Debug in Chrome DevTools:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open DevTools (F12) and go to Network tab</li>
              <li>Click &quot;Test All Endpoints&quot; above</li>
              <li>Check the login request (if you just logged in):
                <ul className="list-disc list-inside ml-4">
                  <li>Look for Set-Cookie header in Response Headers</li>
                  <li>Verify the cookie name and value</li>
                </ul>
              </li>
              <li>Check subsequent requests (/auth/me, /workspaces):
                <ul className="list-disc list-inside ml-4">
                  <li>Look for Cookie header in Request Headers</li>
                  <li>If missing, cookies are not being sent</li>
                </ul>
              </li>
              <li>If 401 appears but cookie is sent, check backend SameSite/Secure config</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

