/**
 * Dashboard API utilities
 */

import { api } from './api-client';

export interface DashboardSummary {
  total_projects: number;
  total_tasks: number;
  tasks_by_status: {
    todo?: number;
    in_progress?: number;
    done?: number;
  };
  active_members: number;
}

export interface TasksTimeseriesPoint {
  date: string;
  count: number;
}

/**
 * Get dashboard summary for the current workspace
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return api.get<DashboardSummary>('/api/v1/dashboard/summary');
}

/**
 * Get tasks timeseries data for the current workspace
 */
export async function getTasksTimeseries(days: number = 30): Promise<TasksTimeseriesPoint[]> {
  return api.get<TasksTimeseriesPoint[]>(`/api/v1/dashboard/tasks-timeseries?days=${days}`);
}

