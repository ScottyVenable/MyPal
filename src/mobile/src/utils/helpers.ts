import { v4 as uuidv4 } from 'uuid';
import { regionColors } from '@/theme';

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;

  if (isToday) {
    return time;
  }
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}/${day} ${time}`;
}

export function generateId(): string {
  return uuidv4();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function getRegionColor(regionId: string): string {
  return regionColors[regionId] ?? '#A0A0B8';
}

export function getSentimentLabel(score: number): string {
  if (score >= 0.5) return 'Very Positive';
  if (score >= 0.15) return 'Positive';
  if (score > -0.15) return 'Neutral';
  if (score > -0.5) return 'Negative';
  return 'Very Negative';
}

export function formatXP(xp: number): string {
  if (xp >= 10000) return `${(xp / 1000).toFixed(0)}k`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
