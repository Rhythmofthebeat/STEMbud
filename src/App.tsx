import { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useChat } from './hooks/useChat';
import { useAchievements } from './hooks/useAchievements';
import Header from './components/Header';
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
  const { messages, sendMessage, generateQuiz, isLoading } = useChat();
  const { achievements, newBadge, clearNewBadge } = useAchievements(messages.length);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setAppConfig)
      .catch(() => null);
  }, []);

  const handleSend = (text: string) => {
    sendMessage(text, uploadedFile?.fileId, uploadedFile?.filename);
    setUploadedFile(null);
  };

  const hasMessages = messages.length > 0;
  const userTurns = messages.filter((m) => m.role === 'user').length;
  const quizDisabled = isLoading || userTurns < 2;

  return (
    <div className="app" data-theme={theme}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        hasMessages={hasMessages}
        quizDisabled={quizDisabled}
        onGenerateQuiz={generateQuiz}
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

      {hasMessages ? (
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
            <div className="welcome-divider" />
            <p className="welcome-hint">Try a question below or type your own ↓</p>
            <StarterQuestions onSelect={handleSend} />
          </div>
        </div>
      )}

      <AchievementBadges
        achievements={achievements}
        newBadge={newBadge}
        onDismissToast={clearNewBadge}
      />

      <InputArea
        onSend={handleSend}
        isLoading={isLoading}
        uploadedFile={uploadedFile}
        onUpload={setUploadedFile}
        onClearUpload={() => setUploadedFile(null)}
      />
    </div>
  );
}
