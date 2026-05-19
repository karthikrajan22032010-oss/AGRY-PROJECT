import React from 'react';
import { useLang } from '../context/LangContext';
import NewsAlerts from './NewsAlerts';
import './HomePage.css';

const STATS = [
  { icon: '🌾', val: '50+', label: 'Crop Varieties' },
  { icon: '🗺', val: '28', label: 'States Covered' },
  { icon: '🤖', val: 'AI', label: 'Powered Analysis' },
  { icon: '🌦', val: 'Live', label: 'Weather Data' },
];

const FEATURES = [
  { icon: '📍', title: 'GPS Land Mapping', desc: 'Pinpoint your exact land location using GPS and Google Maps integration for precise analysis.' },
  { icon: '🪨', title: 'Soil Intelligence', desc: 'Identify soil type, pH levels, and get customized fertilizer recommendations for maximum yield.' },
  { icon: '🌾', title: 'Crop Planning', desc: 'AI-powered crop selection based on your soil, climate, and water availability for optimal harvest.' },
  { icon: '💧', title: 'Water Management', desc: 'Hourly irrigation schedules based on crop type, soil moisture, and weather forecasts.' },
  { icon: '🛡', title: 'Land Security', desc: 'Automated encroachment detection and land security status analysis for your plot.' },
  { icon: '🤖', title: 'AI Assistant', desc: 'Ask any farming question in Tamil, Hindi or English. Get expert answers 24/7.' },
];

export default function HomePage({ setPage, user }) {
  const { t, lang, langClass } = useLang();

  return (
    <div className={`home-page ${langClass}`}>
      <NewsAlerts />
      {/* Hero */}
      <section className="hero-section">
        {/* Local overlays removed to show beautiful global background */}
        <div className="hero-content">
          <h1 className="hero-title">
            {lang === 'ta'
              ? <><span className="hero-title-green">அக்ரி-ஆப்ட்</span><br />உங்கள் நிலத்தை புரிந்துகொள்</>
              : lang === 'hi'
              ? <><span className="hero-title-green">अग्री-ऑप्ट</span><br />अपनी भूमि को समझें</>
              : <><span className="hero-title-green">AGRI-OPT</span><br />Understand Your Land</>
            }
          </h1>

          <p className="hero-desc">
            {lang === 'ta'
              ? 'AI மூலம் உங்கள் நிலத்தை பகுப்பாய்வு செய்து, சரியான பயிர், உரம், நீர் நிர்வாகம் பெறுங்கள்.'
              : lang === 'hi'
              ? 'AI की मदद से अपनी जमीन का विश्लेषण करें, सही फसल, उर्वरक और सिंचाई की जानकारी पाएं।'
              : 'Analyze your agricultural land with AI. Get personalized crop recommendations, soil analysis, fertilizer dosage, irrigation schedules, and encroachment detection — all in one platform.'
            }
          </p>

          <div className="hero-actions">
            <button id="hero-btn-analyze" className="btn-primary hero-btn" onClick={() => setPage('land')}>
              🌾 {t('analyze')} Your Land →
            </button>
            {user && (
              <div className="hero-user-badge">
                👤 Welcome, <strong>{user.username}</strong> | {user.fullPhone}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="hero-stats">
            {STATS.map((s, i) => (
              <div key={i} className="hero-stat-item">
                <span className="stat-icon">{s.icon}</span>
                <span className="stat-val">{s.val}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">
            {lang === 'ta' ? 'எங்கள் சேவைகள்' : lang === 'hi' ? 'हमारी सेवाएं' : 'Platform Features'}
          </h2>
          <p className="section-sub">Everything you need to optimize your agricultural land</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass-card feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="glass-card cta-card">
          <h2 className="cta-title">
            {lang === 'ta' ? 'உங்கள் நிலத்தை இப்போதே பகுப்பாய்வு செய்யுங்கள்!' :
             lang === 'hi' ? 'अभी अपनी जमीन का विश्लेषण करें!' :
             'Start Analyzing Your Land Today!'}
          </h2>
          <p className="cta-desc">Enter your land details and get a complete AI-powered agricultural report in minutes.</p>
          <button id="cta-btn-start" className="btn-primary cta-btn" onClick={() => setPage('land')}>
            🚀 Get Started — Enter Land Details
          </button>
        </div>
      </section>
    </div>
  );
}
