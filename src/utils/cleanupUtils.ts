import type { RoleTask, TaskCleanupUnit } from '../types';

export function getThresholdTimestamp(amount: number, unit: TaskCleanupUnit): number {
  const safeAmount = Math.max(1, amount);
  const now = Date.now();
  switch (unit) {
    case 'hours':
      return now - safeAmount * 60 * 60 * 1000;
    case 'days':
      return now - safeAmount * 24 * 60 * 60 * 1000;
    case 'weeks':
      return now - safeAmount * 7 * 24 * 60 * 60 * 1000;
    default:
      return now - safeAmount * 24 * 60 * 60 * 1000;
  }
}

export function formatThresholdDate(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getTaskCompletionDate(task: RoleTask): number {
  return task.completedAt || task.createdAt;
}

export function isTaskOlderThanThreshold(task: RoleTask, thresholdTimestamp: number): boolean {
  if (!task.completed) return false;
  const taskDate = getTaskCompletionDate(task);
  return taskDate <= thresholdTimestamp;
}
