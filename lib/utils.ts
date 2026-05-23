import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export const PRIORITY_COLORS: Record<string, string> = {
  critical: '#FF3B30',
  high:     '#FF6B8A',
  medium:   '#FDCB6E',
  low:      '#00CEC9',
};

export const TYPE_ICONS: Record<string, string> = {
  task: '✅',
  event: '📅',
  reminder: '🔔',
  block: '🚫',
};
