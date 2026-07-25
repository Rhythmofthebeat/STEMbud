import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import SharedConversationView from './components/SharedConversationView.tsx';

const sharedMatch = window.location.pathname.match(/^\/shared\/([^/]+)\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {sharedMatch ? <SharedConversationView token={sharedMatch[1]} /> : <App />}
  </StrictMode>,
);
