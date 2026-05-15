import React, { useState, useRef } from 'react';
import { useLang } from '../context/LangContext';
import './AuthPage.css';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1',  country: 'USA',   flag: '🇺🇸' },
  { code: '+44', country: 'UK',    flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+60', country: 'Malaysia',  flag: '🇲🇾' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+971',country: 'UAE',       flag: '🇦🇪' },
  { code: '+966',country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+49', country: 'Germany',   flag: '🇩🇪' },
  { code: '+33', country: 'France',    flag: '🇫🇷' },
  { code: '+81', country: 'Japan',     flag: '🇯🇵' },
  { code: '+86', country: 'China',     flag: '🇨🇳' },
  { code: '+55', country: 'Brazil',    flag: '🇧🇷' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+234',country: 'Nigeria',   flag: '🇳🇬' },
];

export default function AuthPage({ onLogin }) {
  const { t, lang, setLang, langClass } = useLang();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    username: '', userId: '', email: '', phone: '',
    countryCode: '+91', password: '', confirmPass: '',
    gender: 'Male', dob: '', state: '', district: '',
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar]   = useState(null);   // profile photo dataURL
  const fileRef = useRef(null);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.username.trim())          e.username = 'Required';
    if (form.phone.length < 8)          e.phone    = 'Valid phone required';
    if (form.password.length < 4)       e.password = 'Min 4 characters';
    if (mode === 'register' && form.password !== form.confirmPass)
      e.confirmPass = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Profile photo handler ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Submit (no OTP) ── */
  const handleSubmit = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin({
        ...form,
        fullPhone: form.countryCode + form.phone,
        avatar,
      });
    }, 900);
  };

  return (
    <div className={`auth-page ${langClass}`}>
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-grid" />
        <div className="auth-glow-1" />
        <div className="auth-glow-2" />
      </div>

      <div className="auth-container">

        {/* ── Left panel ── */}
        <div className="auth-left">
          <div className="auth-logo-wrap">
            <img src="/logo.png" alt="Agri-Opt" className="auth-logo-img" />
            <h1 className="auth-logo-name">AGRI-OPT</h1>
          </div>
          <h2 className="auth-welcome">
            {mode === 'login' ? 'Welcome Back, Farmer!' : 'Join AGRI-OPT Today'}
          </h2>
          <p className="auth-desc">
            AI-powered agricultural land management — soil intelligence,
            crop planning &amp; live weather in Tamil, Hindi &amp; English.
          </p>

          <div className="auth-features">
            {['🌿 Soil Analysis','🌾 Crop Planning','💧 Water Scheduling',
              '🤖 AI Assistant','🌦 Live Weather','📍 GPS Location'].map(ft => (
              <div key={ft} className="auth-feature-item">{ft}</div>
            ))}
          </div>

          {/* Language bar */}
          <div className="auth-lang-bar">
            {[['en','EN'],['ta','தமிழ்'],['hi','हिंदी']].map(([code,label]) => (
              <button key={code} id={`lang-btn-${code}`}
                className={`auth-lang-btn ${lang === code ? 'active' : ''}`}
                onClick={() => setLang(code)}>{label}</button>
            ))}
          </div>
        </div>

        {/* ── Right panel (form) ── */}
        <div className="auth-right glass-card">

          {/* Tabs */}
          <div className="auth-tabs">
            <button id="tab-login"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setErrors({}); }}>
              {t('login')}
            </button>
            <button id="tab-register"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setErrors({}); }}>
              {t('register')}
            </button>
          </div>

          {/* ── Profile Photo (register) ── */}
          {mode === 'register' && (
            <div className="avatar-upload-row">
              <div
                className="avatar-circle"
                onClick={() => fileRef.current?.click()}
                id="avatar-upload-btn"
                title="Upload profile photo"
              >
                {avatar
                  ? <img src={avatar} alt="Profile" className="avatar-img" />
                  : <span className="avatar-placeholder">📷<br/><small>Photo</small></span>
                }
                <div className="avatar-overlay">✏</div>
              </div>
              <div className="avatar-info">
                <span className="avatar-label">Profile Photo</span>
                <span className="avatar-hint">Click to upload (optional)</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*"
                style={{ display:'none' }} onChange={handleAvatarChange} />
            </div>
          )}

          <div className="auth-form" style={{ animation: 'fadeIn 0.4s ease' }}>

            {/* Username */}
            <div className="auth-field">
              <label className="auth-label">👤 {t('username')}</label>
              <input id="field-username"
                className={`input-field ${errors.username ? 'error' : ''}`}
                placeholder={t('username')}
                value={form.username} onChange={f('username')} />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>

            {/* User ID (register only) */}
            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-label">🪪 {t('userId')}</label>
                <input id="field-userid" className="input-field"
                  placeholder="AGRI-2024-XXXXXX"
                  value={form.userId} onChange={f('userId')} />
              </div>
            )}

            {/* Email (register only) */}
            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-label">📧 {t('email')}</label>
                <input id="field-email" type="email" className="input-field"
                  placeholder="example@email.com"
                  value={form.email} onChange={f('email')} />
              </div>
            )}

            {/* Phone + Country code */}
            <div className="auth-field">
              <label className="auth-label">📱 {t('phone')}</label>
              <div className="phone-row">
                <select id="field-country-code"
                  className="input-field country-select"
                  value={form.countryCode} onChange={f('countryCode')}>
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} — {c.country}
                    </option>
                  ))}
                </select>
                <input id="field-phone" type="tel"
                  className={`input-field phone-input ${errors.phone ? 'error' : ''}`}
                  placeholder="9876543210"
                  value={form.phone} onChange={f('phone')} />
              </div>
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            {/* Gender + DOB (register) */}
            {mode === 'register' && (
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">⚧ {t('gender')}</label>
                  <select id="field-gender" className="input-field"
                    value={form.gender} onChange={f('gender')}>
                    <option value="Male">{t('male')}</option>
                    <option value="Female">{t('female')}</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label className="auth-label">🎂 {t('dob')}</label>
                  <input id="field-dob" type="date" className="input-field"
                    value={form.dob} onChange={f('dob')} />
                </div>
              </div>
            )}

            {/* State + District (register) */}
            {mode === 'register' && (
              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">🗺 {t('state')}</label>
                  <input id="field-state" className="input-field"
                    placeholder="Tamil Nadu"
                    value={form.state} onChange={f('state')} />
                </div>
                <div className="auth-field">
                  <label className="auth-label">📍 {t('district')}</label>
                  <input id="field-district" className="input-field"
                    placeholder="Coimbatore"
                    value={form.district} onChange={f('district')} />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label">🔒 {t('password')}</label>
              <input id="field-password" type="password"
                className={`input-field ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
                value={form.password} onChange={f('password')} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {mode === 'register' && (
              <div className="auth-field">
                <label className="auth-label">🔑 {t('confirmPass')}</label>
                <input id="field-confirm-pass" type="password"
                  className={`input-field ${errors.confirmPass ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={form.confirmPass} onChange={f('confirmPass')} />
                {errors.confirmPass && <span className="field-error">{errors.confirmPass}</span>}
              </div>
            )}

            {/* Submit — no OTP */}
            <button id="btn-submit-auth"
              className="btn-primary auth-submit"
              onClick={handleSubmit} disabled={loading}>
              {loading
                ? <><span className="spinner" /> {mode === 'login' ? 'Logging in...' : 'Creating account...'}</>
                : mode === 'login'
                  ? `🚀 ${t('login')}`
                  : `✅ ${t('register')}`
              }
            </button>

            <p className="no-otp-note">🔓 Direct access — no OTP required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
