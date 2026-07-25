import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

const LOCAL_STREAK_KEY = 'stembud_streak';
const EMPTY: StreakState = { currentStreak: 0, longestStreak: 0, lastActiveDate: null };

function localDateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadLocalStreak(): StreakState {
  try {
    const raw = localStorage.getItem(LOCAL_STREAK_KEY);
    return raw ? (JSON.parse(raw) as StreakState) : EMPTY;
  } catch { return EMPTY; }
}

export function useStreak(userId: string | null, messageCount: number) {
  const [streak, setStreak] = useState<StreakState>(EMPTY);
  const streakRef = useRef(streak);
  streakRef.current = streak;

  // Load this user's (or this browser's) current streak
  useEffect(() => {
    if (!userId) {
      setStreak(loadLocalStreak());
      return;
    }
    supabase
      .from('profiles')
      .select('current_streak, longest_streak, last_active_date')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setStreak({
          currentStreak: data?.current_streak ?? 0,
          longestStreak: data?.longest_streak ?? 0,
          lastActiveDate: data?.last_active_date ?? null,
        });
      });
  }, [userId]);

  // Record today's activity the first time a message is sent — idempotent per day,
  // so repeat messages or reloads on the same day are safe no-ops.
  useEffect(() => {
    if (messageCount === 0) return;
    const today = localDateStr();
    const prev = streakRef.current;
    if (prev.lastActiveDate === today) return;

    const newCurrent = prev.lastActiveDate === localDateStr(-1) ? prev.currentStreak + 1 : 1;
    const next: StreakState = {
      currentStreak: newCurrent,
      longestStreak: Math.max(prev.longestStreak, newCurrent),
      lastActiveDate: today,
    };
    setStreak(next);

    if (userId) {
      void supabase
        .from('profiles')
        .update({
          current_streak: next.currentStreak,
          longest_streak: next.longestStreak,
          last_active_date: next.lastActiveDate,
        })
        .eq('id', userId);
    } else {
      localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(next));
    }
  }, [messageCount, userId]);

  return streak;
}
