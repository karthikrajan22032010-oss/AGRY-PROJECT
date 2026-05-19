import React, { useState } from 'react';
import { LangProvider } from './context/LangContext';
import LoadingScreen from './components/LoadingScreen';
import AuthPage from './components/AuthPage';
import Header from './components/Header';
import HomePage from './components/HomePage';
import LandForm from './components/LandForm';
import ResultsPage from './components/ResultsPage';
import ChatBot from './components/ChatBot';
import bgAgri from '/bg-agri.png';
import './App.css';

function AppInner() {
  const [phase, setPhase] = useState('loading'); // loading | auth | app
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [landData, setLandData] = useState(null);

  const handleLoadingDone = () => {
    const savedUser = localStorage.getItem('agri_currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setPhase('app');
    } else {
      setPhase('auth');
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setPhase('app');
    setPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('agri_currentUser');
    setUser(null);
    setLandData(null);
    setPhase('auth');
    setPage('home');
  };

  const handleLandSubmit = (data) => {
    setLandData(data);
    setPage('results');
  };

  if (phase === 'loading') {
    return <LoadingScreen onComplete={handleLoadingDone} />;
  }

  if (phase === 'auth') {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Header user={user} onLogout={handleLogout} page={page} setPage={setPage} />

      <main className="app-main">
        {page === 'home' && <HomePage setPage={setPage} user={user} />}
        {page === 'land' && <LandForm onSubmit={handleLandSubmit} />}
        {page === 'results' && <ResultsPage landData={landData} />}
      </main>

      <ChatBot landData={landData} />

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <span>🌾 AGRI-OPT v2.0 — Intelligent Agricultural Management</span>
          <span>Tamil Nadu Agricultural Innovation • {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <div className="global-bg" style={{ 
        backgroundImage: `url(${bgAgri})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        position: 'fixed',
        inset: 0,
        zIndex: -2
      }} />
      <div className="global-overlay" style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at center, rgba(0, 15, 5, 0.1) 0%, rgba(0, 5, 2, 0.65) 100%)',
        zIndex: -1
      }} />
      <AppInner />
    </LangProvider>
  );
}
