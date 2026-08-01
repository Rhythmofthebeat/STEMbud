import { useState, type FormEvent } from 'react';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, displayName: string) => Promise<void>;
  onRequestPasswordReset: (email: string) => Promise<void>;
  onClose?: () => void;
  initialMessage?: string;
}

type Mode = 'signin' | 'signup' | 'reset';

export default function AuthScreen({ onSignIn, onSignUp, onRequestPasswordReset, onClose, initialMessage }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(initialMessage ?? '');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await onSignUp(email, password, displayName);
        setInfo('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      } else if (mode === 'reset') {
        await onRequestPasswordReset(email);
        setInfo("If that email has an account, we've sent a reset link.");
      } else {
        await onSignIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const heading =
    mode === 'signin'
      ? 'Sign in to pick up right where you left off.'
      : mode === 'signup'
      ? 'Create an account to save your progress across devices.'
      : "Enter your email and we'll send you a reset link.";

  return (
    <div className="welcome">
      <div className="welcome-orb welcome-orb-1" />
      <div className="welcome-orb welcome-orb-2" />
      <div className="welcome-card">
        {onClose && (
          <button className="auth-modal-close" onClick={onClose} aria-label="Close">×</button>
        )}
        <div className="welcome-avatar">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <circle cx="18" cy="18" r="4" fill="white"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none" transform="rotate(60 18 18)"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2" fill="none" transform="rotate(120 18 18)"/>
          </svg>
        </div>
        <div className="welcome-tagline">Your AI STEM Tutor</div>
        <h1 className="welcome-name">STEMbud</h1>
        <p className="welcome-msg">{heading}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              className="auth-input"
              type="text"
              placeholder="Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          {mode !== 'reset' && (
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          )}

          {mode === 'signin' && (
            <button type="button" className="auth-forgot" onClick={() => switchMode('reset')}>
              Forgot password?
            </button>
          )}

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? 'Please wait…'
              : mode === 'signin'
              ? 'Sign in'
              : mode === 'signup'
              ? 'Sign up'
              : 'Send reset link'}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : mode === 'signup'
            ? 'Already have an account? Sign in'
            : 'Back to sign in'}
        </button>
      </div>
    </div>
  );
}
