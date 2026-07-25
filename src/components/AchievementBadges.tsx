import { useEffect } from 'react';
import type { Achievement } from '../types';

interface BadgeProps {
  badge: Achievement;
}

function Badge({ badge }: BadgeProps) {
  return (
    <div className={`badge ${badge.unlocked ? 'unlocked' : 'locked'}`}>
      <span className="badge-emoji">{badge.emoji}</span>
      <span>{badge.name}</span>
      <span className="badge-tooltip">
        {badge.unlocked ? badge.description : `${badge.minutesRequired}m to unlock`}
      </span>
    </div>
  );
}

interface Props {
  achievements: Achievement[];
  newBadge: Achievement | null;
  onDismissToast: () => void;
}

export default function AchievementBadges({ achievements, newBadge, onDismissToast }: Props) {
  useEffect(() => {
    if (!newBadge) return;
    const t = setTimeout(onDismissToast, 3500);
    return () => clearTimeout(t);
  }, [newBadge, onDismissToast]);

  return (
    <>
      <div className="achievements">
        <span className="achievements-label">Badges</span>
        {achievements.map((a) => (
          <Badge key={a.id} badge={a} />
        ))}
      </div>

      {newBadge && (
        <div className="badge-toast">
          <span className="badge-toast-emoji">{newBadge.emoji}</span>
          <div>
            <div>Badge unlocked!</div>
            <div style={{ fontWeight: 400, fontSize: 12 }}>{newBadge.name} — {newBadge.description}</div>
          </div>
        </div>
      )}
    </>
  );
}
