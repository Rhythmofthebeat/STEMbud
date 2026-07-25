import { useState, useEffect, useCallback, useRef } from 'react';
import type { Achievement } from '../types';
import { supabase } from '../lib/supabase';

const BADGE_DEFS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'newcomer',      emoji: '🌱', name: 'Newcomer',       description: 'Sent your first message!',    minutesRequired: 0 },
  { id: 'quick-learner', emoji: '⚡', name: 'Quick Learner',  description: '5 minutes of learning!',      minutesRequired: 5 },
  { id: 'explorer',      emoji: '🔬', name: 'STEM Explorer',  description: '15 minutes of exploration!',  minutesRequired: 15 },
  { id: 'deep-thinker',  emoji: '🧠', name: 'Deep Thinker',   description: '30 minutes of deep thinking!',minutesRequired: 30 },
  { id: 'champion',      emoji: '🚀', name: 'STEM Champion',  description: '1 hour of excellence!',       minutesRequired: 60 },
  { id: 'master',        emoji: '💎', name: 'STEM Master',    description: '2 hours of mastery!',         minutesRequired: 120 },
];

const STORAGE_KEY = 'stembud_minutes';

function loadMinutes(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0;
}

export function useAchievements(userId: string | null, messageCount: number) {
  const [minutesUsed, setMinutesUsed] = useState(loadMinutes);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [newBadge, setNewBadge] = useState<Achievement | null>(null);
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;

  // Load this user's unlocked badges from Supabase
  useEffect(() => {
    if (!userId) {
      setUnlocked(new Set());
      return;
    }
    supabase
      .from('achievements')
      .select('badge_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        setUnlocked(new Set((data ?? []).map((r) => r.badge_id)));
      });
  }, [userId]);

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

  const unlock = useCallback((id: string) => {
    if (!userId || unlockedRef.current.has(id)) return;
    setUnlocked((prev) => new Set(prev).add(id));
    const def = BADGE_DEFS.find((d) => d.id === id);
    if (def) {
      setNewBadge({ ...def, unlocked: true, unlockedAt: Date.now() });
      void supabase.from('achievements').insert({ user_id: userId, badge_id: id });
    }
  }, [userId]);

  // Unlock newcomer badge on first message
  useEffect(() => {
    if (messageCount > 0 && userId) unlock('newcomer');
  }, [messageCount, userId]); // eslint-disable-line

  // Check time-based badges
  useEffect(() => {
    for (const def of BADGE_DEFS) {
      if (def.minutesRequired > 0 && minutesUsed >= def.minutesRequired && !unlockedRef.current.has(def.id)) {
        unlock(def.id);
        break; // show one toast at a time
      }
    }
  }, [minutesUsed, unlock]);

  const clearNewBadge = useCallback(() => setNewBadge(null), []);

  const achievements: Achievement[] = BADGE_DEFS.map((def) => ({
    ...def,
    unlocked: unlocked.has(def.id),
    unlockedAt: unlocked.has(def.id) ? Date.now() : undefined,
  }));

  return { achievements, newBadge, clearNewBadge };
}
