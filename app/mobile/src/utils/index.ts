// Utility functions for MyPal Mobile

/**
 * Format a timestamp to a readable string
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Calculate XP percentage for progress bars
 */
export function calculateXPPercentage(currentXP: number, nextLevelXP: number): number {
  return Math.min((currentXP / nextLevelXP) * 100, 100);
}

/**
 * Get developmental stage name from level
 */
export function getDevelopmentalStage(level: number): string {
  if (level <= 1) return 'Sensorimotor (Infancy)';
  if (level <= 3) return 'Sensorimotor (Toddler)';
  if (level <= 6) return 'Preoperational (Preschool)';
  return 'Concrete/Formal (Childhood)';
}

/**
 * Get stage description from level
 */
export function getStageDescription(level: number): string {
  if (level <= 1) return 'Random phonemic babbling (ba, ga, ma)';
  if (level <= 3) return 'Single-word utterances from learned vocabulary';
  if (level <= 6) return '2-3 word sentences; asks "Why?"';
  return 'Complex sentences; abstract reasoning';
}

/**
 * Validate profile name
 */
export function validateProfileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  if (name.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (name.length > 50) {
    return { valid: false, error: 'Name must be less than 50 characters' };
  }
  return { valid: true };
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format large numbers with suffixes (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
  return (num / 1000000000).toFixed(1) + 'B';
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a random ID (fallback if nanoid isn't available)
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
