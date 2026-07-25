import type { Theme } from '../types';

interface Props {
  theme: string;
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: Props) {
  return (
    <header className="header">
      <div className="header-logo">⚛️</div>
      <div className="header-info">
        <div className="header-title">STEMMY</div>
        <div className="header-subtitle">MIS STEMbud · Your AI homework helper</div>
      </div>
      <div className="header-actions">
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
