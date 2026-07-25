import { useState, type FormEvent } from 'react';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, displayName: string) => Promise<void>;
}

export default function AuthScreen({ onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      } else {
        await onSignIn(email, password);
      }
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
        <h1 className="welcome-name">STEMMY</h1>
        <p className="welcome-msg">
          {mode === 'signin'
            ? 'Sign in to pick up right where you left off.'
            : 'Create an account to save your progress across devices.'}
        </p>

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

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
