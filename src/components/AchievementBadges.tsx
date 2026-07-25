import { useEffect } from 'react';
import type { Achievement } from '../types';

interface Props {
  achievements: Achievement[];
  newBadge: Achievement | null;
  onDismissToast: () => void;
}

export default function AchievementBadges({ achievements, newBadge, onDismissToast }: Props) {
  useEffect(() => {
    if (!newBadge) return;
    const t = setTimeout(onDismissToast, 4000);
    return () => clearTimeout(t);
  }, [newBadge, onDismissToast]);

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <>
      <div className="achievements">
        <span className="achievements-label">🏅 Achievements</span>
        <div className="badges-row">
          {unlocked.map(a => (
            <div key={a.id} className="badge unlocked" title={a.description}>
              <span className="badge-emoji">{a.emoji}</span>
              <span className="badge-name">{a.name}</span>
            </div>
          ))}
          {locked.map(a => (
            <div key={a.id} className="badge locked" title={`Unlock at ${a.minutesRequired} minutes`}>
              <span className="badge-emoji">{a.emoji}</span>
            </div>
          ))}
        </div>
        <span className="achievements-progress">{unlocked.length}/{achievements.length}</span>
      </div>

      {newBadge && (
        <div className="badge-toast" onClick={onDismissToast}>
          <span className="toast-emoji">{newBadge.emoji}</span>
          <div className="toast-body">
            <div className="toast-title">Badge Unlocked!</div>
            <div className="toast-desc">{newBadge.name} — {newBadge.description}</div>
          </div>
          <button className="toast-close">×</button>
        </div>
      )}
    </>
  );
}
