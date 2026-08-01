interface Props {
  theme: string;
  onToggleTheme: () => void;
  hasMessages: boolean;
  quizDisabled: boolean;
  onGenerateQuiz: () => void;
  signedIn: boolean;
  onSignOut: () => void;
  onSignInClick: () => void;
  onToggleSidebar: () => void;
  onToggleNotebook: () => void;
}

export default function Header({
  theme,
  onToggleTheme,
  hasMessages,
  quizDisabled,
  onGenerateQuiz,
  signedIn,
  onSignOut,
  onSignInClick,
  onToggleSidebar,
  onToggleNotebook,
}: Props) {
  return (
    <header className="header">
      {signedIn && (
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title="Your chats"
          aria-label="Toggle chat history sidebar"
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 4v12" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
      )}

      <div className="header-brand">
        <div className="header-logo">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
            <circle cx="18" cy="18" r="4" fill="white"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none" transform="rotate(60 18 18)"/>
            <ellipse cx="18" cy="18" rx="16" ry="6.5" stroke="white" strokeWidth="2.2" fill="none" transform="rotate(120 18 18)"/>
          </svg>
        </div>
        <div className="header-info">
          <div className="header-title">STEMbud</div>
          <div className="header-subtitle">Your AI STEM study partner</div>
        </div>
      </div>

      {hasMessages && (
        <button
          className="header-quiz-btn"
          onClick={onGenerateQuiz}
          disabled={quizDisabled}
          title="Generate a quiz on the topics you've been struggling with"
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
            <path d="M4 3.5A1.5 1.5 0 0 1 5.5 2h6.17a1.5 1.5 0 0 1 1.06.44l2.83 2.83a1.5 1.5 0 0 1 .44 1.06V16.5A1.5 1.5 0 0 1 14.5 18h-9A1.5 1.5 0 0 1 4 16.5v-13Z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 10.5h6M7 13.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="8" cy="7.5" r="1" fill="currentColor"/>
          </svg>
          Generate Quiz
        </button>
      )}

      <button
        className="notebook-toggle-btn"
        onClick={onToggleNotebook}
        title="Your notebook"
        aria-label="Toggle notebook"
      >
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <path d="M5 3.5h9A1.5 1.5 0 0 1 15.5 5v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V5A1.5 1.5 0 0 1 5 3.5Z" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="header-badge">
        <span className="online-dot" />
        Active
      </div>

      <button
        className="theme-btn"
        onClick={onToggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <path d="M10 2v2M10 16v2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M2 10h2M16 10h2M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <path d="M17 11.3A7 7 0 0 1 8.7 3a7 7 0 1 0 8.3 8.3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {signedIn ? (
        <button
          className="header-signout-btn"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <path d="M8 17H5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 5 3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 13.5 17 10l-4-3.5M17 10H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : (
        <button className="header-signin-btn" onClick={onSignInClick}>
          Sign in
        </button>
      )}
    </header>
  );
}
