/**
 * Environment variable validator for server-side use.
 * 
 * This module validates that all required environment variables are set.
 * Import this in server-only modules (e.g., API routes, server components, middleware).
 * 
 * Usage:
 *   import { validateEnv } from '@/lib/env';
 *   validateEnv(); // Throws if any required env vars are missing
 */

/**
 * Validates that all required environment variables are set.
 * Throws an error with a clear message if any are missing.
 */
export function validateEnv(): void {
  const required: string[] = [];
  const missing: string[] = [];

  // Required environment variables (only those actually used in the codebase)
  const envVars = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  };

  // Check each required variable
  for (const [key, value] of Object.entries(envVars)) {
    required.push(key);
    if (!value || value.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please set these in your .env file. See .env.example for reference.`;
    throw new Error(message);
  }

  // Validate NODE_ENV if set
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    throw new Error(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be "production" or "development".`);
  }
}

/**
 * Get validated environment variables.
 * Throws if any required vars are missing.
 */
export function getEnv() {
  validateEnv();
  
  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

