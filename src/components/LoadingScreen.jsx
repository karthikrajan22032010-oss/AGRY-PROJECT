import React, { useEffect, useState, useRef } from 'react';
import './LoadingScreen.css';
import logo from '/logo.png';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing system...');
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  const steps = [
    { at: 10, text: 'Loading soil database...' },
    { at: 25, text: 'Connecting weather API...' },
    { at: 40, text: 'Loading crop intelligence...' },
    { at: 55, text: 'Initializing AI assistant...' },
    { at: 70, text: 'Calibrating sensors...' },
    { at: 85, text: 'Loading multilingual models...' },
    { at: 98, text: 'Almost ready...' },
  ];

  useEffect(() => {
    let p = 0;
    intervalRef.current = setInterval(() => {
      p += Math.random() * 3 + 0.5;
      if (p >= 100) {
        p = 100;
        clearInterval(intervalRef.current);
        setStatusText('Welcome to AGRI-OPT!');
        setTimeout(() => {
          setDone(true);
          setTimeout(onComplete, 600);
        }, 800);
      }
      setProgress(Math.min(p, 100));
      const step = steps.find(s => Math.abs(p - s.at) < 3);
      if (step) setStatusText(step.text);
    }, 80);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className={`loading-screen${done ? ' fade-out' : ''}`}>
      {/* Overlay for better contrast */}
      <div className="loading-overlay" />
      
      {/* Grid Lines Animation */}
      <div className="grid-lines" />
      
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Logo Area */}
      <div className="loading-logo-wrap">
        <div className="loading-logo-ring">
          <div className="loading-logo-inner">
            <img src={logo} alt="Logo" className="loading-logo-img" />
          </div>
        </div>

        <h1 className="loading-title">
          <span className="title-agri">AGRI</span>
          <span className="title-dash">-</span>
          <span className="title-opt">OPT</span>
        </h1>
        <p className="loading-subtitle">Intelligent Agricultural Management System</p>

        <div className="loading-tags">
          <span className="ltag">🛰 GPS Analytics</span>
          <span className="ltag">🤖 AI Powered</span>
          <span className="ltag">🌦 Live Weather</span>
          <span className="ltag">🌱 Crop Intelligence</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="loading-progress-wrap">
        <div className="loading-progress-bar">
          <div
            className="loading-progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div
            className="loading-progress-glow"
            style={{ left: `${progress}%` }}
          />
        </div>
        <div className="loading-progress-info">
          <span className="loading-status-text">{statusText}</span>
          <span className="loading-percent">{Math.floor(progress)}%</span>
        </div>
      </div>

      {/* Version */}
      <div className="loading-version">AGRI-OPT v2.0 | Tamil Nadu Agricultural Innovation</div>
    </div>
  );
}
