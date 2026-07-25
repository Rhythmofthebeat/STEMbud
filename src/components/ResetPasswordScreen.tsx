import { useState, type FormEvent } from 'react';

interface Props {
  onUpdatePassword: (newPassword: string) => Promise<void>;
}

export default function ResetPasswordScreen({ onUpdatePassword }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await onUpdatePassword(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-orb welcome-orb-1" />
      <div className="welcome-orb welcome-orb-2" />
      <div className="welcome-card">
        <div className="welcome-avatar">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <circle cx="18" cy="18" r="4" fill="white"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none" transform="rotate(60 18 18)"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none" transform="rotate(120 18 18)"/>
          </svg>
        </div>
        <div className="welcome-tagline">Your AI STEM Tutor</div>
        <h1 className="welcome-name">Set a new password</h1>
        <p className="welcome-msg">Choose a new password for your account.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
