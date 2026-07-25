import { useState, useEffect, useCallback, useRef } from 'react';
import type { Achievement } from '../types';
import { supabase } from '../lib/supabase';

const BADGE_DEFS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  { id: 'newcomer',      emoji: '🌱', name: 'Newcomer',       description: 'Sent your first message!',      minutesRequired: 0 },
  { id: 'quick-learner', emoji: '⚡', name: 'Quick Learner',  description: '30 minutes of learning!',       minutesRequired: 30 },
  { id: 'explorer',      emoji: '🔬', name: 'STEM Explorer',  description: '1.5 hours of exploration!',     minutesRequired: 90 },
  { id: 'deep-thinker',  emoji: '🧠', name: 'Deep Thinker',   description: '3 hours of deep thinking!',     minutesRequired: 180 },
  { id: 'champion',      emoji: '🚀', name: 'STEM Champion',  description: '6 hours of excellence!',        minutesRequired: 360 },
  { id: 'master',        emoji: '💎', name: 'STEM Master',    description: '12 hours of mastery!',          minutesRequired: 720 },
];

const MINUTES_KEY = 'stembud_minutes';
const LOCAL_UNLOCKED_KEY = 'stembud_unlocked';

function loadMinutes(): number {
  return parseInt(localStorage.getItem(MINUTES_KEY) ?? '0', 10) || 0;
}

function loadLocalUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_UNLOCKED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

export function useAchievements(userId: string | null, messageCount: number) {
  const [minutesUsed, setMinutesUsed] = useState(loadMinutes);
  const [unlocked, setUnlocked] = useState<Set<string>>(userId ? new Set() : loadLocalUnlocked);
  const [newBadge, setNewBadge] = useState<Achievement | null>(null);
  // Guards against re-showing the "unlocked" toast on every reload: for signed-in users the
  // existing badges load asynchronously, so without this the "first message" unlock check
  // below could run before we know 'newcomer' was already unlocked in a prior session.
  const [loaded, setLoaded] = useState(false);
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;

  // Signed in: load this user's unlocked badges from Supabase.
  // Anonymous: fall back to whatever's saved in this browser.
  useEffect(() => {
    setLoaded(false);
    if (!userId) {
      setUnlocked(loadLocalUnlocked());
      setLoaded(true);
      return;
    }
    supabase
      .from('achievements')
      .select('badge_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        setUnlocked(new Set((data ?? []).map((r) => r.badge_id)));
        setLoaded(true);
      });
  }, [userId]);

  // Tick every minute once user has sent at least one message
  useEffect(() => {
    if (messageCount === 0) return;
    const interval = setInterval(() => {
      setMinutesUsed((m) => {
        const next = m + 1;
        localStorage.setItem(MINUTES_KEY, String(next));
        return next;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [messageCount]);

  const unlock = useCallback((id: string) => {
    if (unlockedRef.current.has(id)) return;
    setUnlocked((prev) => new Set(prev).add(id));
    const def = BADGE_DEFS.find((d) => d.id === id);
    if (!def) return;
    setNewBadge({ ...def, unlocked: true, unlockedAt: Date.now() });
    if (userId) {
      // Note: supabase-js query builders are lazy thenables — they only actually send the
      // request once awaited or .then()'d. A bare `void builder` (no await/.then) silently
      // never fires the request at all, which is why this never used to persist.
      supabase
        .from('achievements')
        .insert({ user_id: userId, badge_id: id })
        .then(({ error }) => {
          if (error) console.error('Failed to save achievement:', error.message);
        });
    } else {
      const next = new Set(unlockedRef.current).add(id);
      localStorage.setItem(LOCAL_UNLOCKED_KEY, JSON.stringify([...next]));
    }
  }, [userId]);

  // Unlock newcomer badge on first message
  useEffect(() => {
    if (!loaded || messageCount === 0) return;
    unlock('newcomer');
  }, [messageCount, loaded]); // eslint-disable-line

  // Check time-based badges
  useEffect(() => {
    if (!loaded) return;
    for (const def of BADGE_DEFS) {
      if (def.minutesRequired > 0 && minutesUsed >= def.minutesRequired && !unlockedRef.current.has(def.id)) {
        unlock(def.id);
        break; // show one toast at a time
      }
    }
  }, [minutesUsed, unlock, loaded]);

  const clearNewBadge = useCallback(() => setNewBadge(null), []);

  const achievements: Achievement[] = BADGE_DEFS.map((def) => ({
    ...def,
    unlocked: unlocked.has(def.id),
    unlockedAt: unlocked.has(def.id) ? Date.now() : undefined,
  }));

  const nextBadge = BADGE_DEFS.find((d) => d.minutesRequired > 0 && !unlocked.has(d.id));
  const progress = nextBadge
    ? {
        badge: nextBadge,
        minutesUsed: Math.min(minutesUsed, nextBadge.minutesRequired),
        minutesRequired: nextBadge.minutesRequired,
        percent: Math.min(100, Math.round((minutesUsed / nextBadge.minutesRequired) * 100)),
      }
    : null; // all badges unlocked

  return { achievements, newBadge, clearNewBadge, progress };
}
