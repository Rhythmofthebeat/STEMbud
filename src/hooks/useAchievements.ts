import { useState, useEffect, useCallback } from 'react';
import type { Achievement } from '../types';

const BADGE_DEFS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'newcomer',      emoji: '🌱', name: 'Newcomer',       description: 'Sent your first message!',    minutesRequired: 0 },
  { id: 'quick-learner', emoji: '⚡', name: 'Quick Learner',  description: '5 minutes of learning!',      minutesRequired: 5 },
  { id: 'explorer',      emoji: '🔬', name: 'STEM Explorer',  description: '15 minutes of exploration!',  minutesRequired: 15 },
  { id: 'deep-thinker',  emoji: '🧠', name: 'Deep Thinker',   description: '30 minutes of deep thinking!',minutesRequired: 30 },
  { id: 'champion',      emoji: '🚀', name: 'STEM Champion',  description: '1 hour of excellence!',       minutesRequired: 60 },
  { id: 'master',        emoji: '💎', name: 'STEM Master',    description: '2 hours of mastery!',         minutesRequired: 120 },
];

const STORAGE_KEY = 'stembud_minutes';
const UNLOCKED_KEY = 'stembud_unlocked';

function loadMinutes(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0;
}

function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

export function useAchievements(messageCount: number) {
  const [minutesUsed, setMinutesUsed] = useState(loadMinutes);
  const [unlocked, setUnlocked] = useState<Set<string>>(loadUnlocked);
  const [newBadge, setNewBadge] = useState<Achievement | null>(null);

  // Tick every minute once user has sent at least one message
  useEffect(() => {
    if (messageCount === 0) return;
    const interval = setInterval(() => {
      setMinutesUsed((m) => {
        const next = m + 1;
        localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [messageCount]);

  // Unlock newcomer badge on first message
  useEffect(() => {
    if (messageCount > 0 && !unlocked.has('newcomer')) {
      unlock('newcomer');
    }
  }, [messageCount]); // eslint-disable-line

  // Check time-based badges
  useEffect(() => {
    for (const def of BADGE_DEFS) {
      if (def.minutesRequired > 0 && minutesUsed >= def.minutesRequired && !unlocked.has(def.id)) {
        unlock(def.id);
        break; // show one toast at a time
      }
    }
  }, [minutesUsed]); // eslint-disable-line

  const unlock = useCallback((id: string) => {
    setUnlocked((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...next]));
      return next;
    });
    const def = BADGE_DEFS.find((d) => d.id === id);
    if (def) {
      const badge: Achievement = { ...def, unlocked: true, unlockedAt: Date.now() };
      setNewBadge(badge);
    }
  }, []);

  const clearNewBadge = useCallback(() => setNewBadge(null), []);

  const achievements: Achievement[] = BADGE_DEFS.map((def) => ({
    ...def,
    unlocked: unlocked.has(def.id),
    unlockedAt: unlocked.has(def.id) ? Date.now() : undefined,
  }));

  return { achievements, newBadge, clearNewBadge };
}
