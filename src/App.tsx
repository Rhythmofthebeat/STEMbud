import { useState, useEffect, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { useAchievements } from './hooks/useAchievements';
import { useStreak } from './hooks/useStreak';
import { useNotes } from './hooks/useNotes';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import NotebookPanel from './components/NotebookPanel';
import AuthScreen from './components/AuthScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import ChatInterface from './components/ChatInterface';
import StarterQuestions from './components/StarterQuestions';
import AchievementBadges from './components/AchievementBadges';
import InputArea from './components/InputArea';
import type { UploadedFile } from './types';

interface AppConfig {
  assistant_name: string;
  vector_store_configured: boolean;
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const {
    session,
    user,
    loading: authLoading,
    passwordRecovery,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
  } = useAuth();
  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openAuthModal = useCallback((message?: string) => {
    setAuthModalMessage(message);
    setAuthModalOpen(true);
  }, []);

  const {
    messages,
    sendMessage,
    generateQuiz,
    isLoading,
    isHistoryLoading,
    conversations,
    conversationId,
    loadConversation,
    startNewConversation,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
    shareConversation,
    unshareConversation,
    anonQuota,
  } = useChat(userId, accessToken, () =>
    openAuthModal("You've hit the limit for anonymous use. Sign in for unlimited access.")
  );
  const { achievements, newBadge, progress, clearNewBadge } = useAchievements(userId, messages.length);
  const streak = useStreak(userId, messages.length);
  const { notes, createNote, updateNote, deleteNote } = useNotes(userId);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setAppConfig)
      .catch(() => null);
  }, []);

  // Close the "sign in for unlimited access" prompt automatically once signed in
  useEffect(() => {
    if (user) setAuthModalOpen(false);
  }, [user]);

  const handleSend = (text: string) => {
    sendMessage(text, uploadedFile?.fileId, uploadedFile?.filename);
    setUploadedFile(null);
  };

  if (authLoading) {
    return <div className="app" data-theme={theme} />;
  }

  if (passwordRecovery) {
    return (
      <div className="app" data-theme={theme}>
        <ResetPasswordScreen onUpdatePassword={updatePassword} />
      </div>
    );
  }

  const hasMessages = messages.length > 0;
  // Gate on actual usable content (a completed, non-error answer) rather than a raw turn
  // count — loading an old conversation with plenty of history should enable this immediately,
  // and a single solid exchange is already enough to quiz on.
  const hasQuizzableContent = messages.some(
    (m) => m.role === 'assistant' && m.content.trim().length > 0 && !m.error && !m.isStreaming
  );
  const quizDisabled = isLoading || !hasQuizzableContent;

  return (
    <div className="app" data-theme={theme}>
      {user && (
        <Sidebar
          open={sidebarOpen}
          conversations={conversations}
          activeId={conversationId}
          onSelect={loadConversation}
          onNewChat={startNewConversation}
          onRename={renameConversation}
          onPin={pinConversation}
          onArchive={archiveConversation}
          onDelete={deleteConversation}
          onShare={shareConversation}
          onUnshare={unshareConversation}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <NotebookPanel
        open={notebookOpen}
        notes={notes}
        onCreate={createNote}
        onUpdate={updateNote}
        onDelete={deleteNote}
        onClose={() => setNotebookOpen(false)}
      />

      {authModalOpen && (
        <div className="auth-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setAuthModalOpen(false)}>
          <AuthScreen
            onSignIn={signIn}
            onSignUp={signUp}
            onRequestPasswordReset={requestPasswordReset}
            onClose={() => setAuthModalOpen(false)}
            initialMessage={authModalMessage}
          />
        </div>
      )}

      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        hasMessages={hasMessages}
        quizDisabled={quizDisabled}
        onGenerateQuiz={generateQuiz}
        signedIn={!!user}
        onSignOut={signOut}
        onSignInClick={() => openAuthModal()}
        onToggleSidebar={() => { setSidebarOpen((o) => !o); setNotebookOpen(false); }}
        onToggleNotebook={() => { setNotebookOpen((o) => !o); setSidebarOpen(false); }}
      />

      {appConfig && !appConfig.vector_store_configured && (
        <div className="config-banner">
          <svg className="config-banner-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
            <path d="M10 2 1.5 17h17L10 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M10 8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="10" cy="14.5" r=".9" fill="currentColor"/>
          </svg>
          <span>
            <strong>Vector store not connected.</strong> Open <code>config.json</code> and replace{' '}
            <code>YOUR_VECTOR_STORE_ID_HERE</code> with your OpenAI Vector Store ID to enable citations from your STEM corpus.
          </span>
        </div>
      )}

      {isHistoryLoading ? (
        <div className="welcome" />
      ) : hasMessages ? (
        <ChatInterface messages={messages} isLoading={isLoading} />
      ) : (
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
              Get clear, cited explanations for science, technology, engineering, and math.
              Upload your notes or homework, and STEMMY will walk through the concepts —
              then quiz you on what you're still working to master.
            </p>
            <div className="welcome-partner">
              <img
                className="welcome-partner-logo"
                src="/minorities-in-stem-logo.svg"
                alt="Minorities in STEM logo"
                onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
              />
              <span className="welcome-partner-text">
                <strong>Minorities in STEM</strong>
                An MIS initiative, built to close the opportunity gap in STEM education.
              </span>
            </div>
            {!user && (
              <p className="welcome-anon-hint">
                Chat freely below — <button className="auth-inline-link" onClick={() => openAuthModal()}>sign in</button> to save your history across devices.
              </p>
            )}
            <div className="welcome-divider" />
            <p className="welcome-hint">Try a question below or type your own ↓</p>
            <StarterQuestions onSelect={handleSend} />
          </div>
        </div>
      )}

      <AchievementBadges
        achievements={achievements}
        newBadge={newBadge}
        progress={progress}
        streak={streak}
        onDismissToast={clearNewBadge}
      />

      {!user && anonQuota && (
        <div className={`anon-quota-bar ${anonQuota.remaining <= 5 ? 'low' : ''}`}>
          <span>
            {anonQuota.remaining} of {anonQuota.limit} free messages left this hour
          </span>
          <button className="auth-inline-link" onClick={() => openAuthModal()}>Sign in for unlimited</button>
        </div>
      )}

      <InputArea
        onSend={handleSend}
        isLoading={isLoading}
        uploadedFile={uploadedFile}
        onUpload={setUploadedFile}
        onClearUpload={() => setUploadedFile(null)}
        accessToken={accessToken}
      />
    </div>
  );
}
