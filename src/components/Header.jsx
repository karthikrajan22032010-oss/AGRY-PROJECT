import React, { useState, useEffect, useCallback } from 'react';
import { useLang, LANGS } from '../context/LangContext';
import logo from '/logo.png';
import './Header.css';

const GEMINI_KEY = 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

export default function Header({ user, onLogout, page, setPage }) {
  const { lang, setLang, t, langClass } = useLang();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: '--', humidity: '--', windSpeed: '--', isHeavyWind: false, condition: 'Loading...', icon: '🌤', location: 'Detecting...' });
  const [menuOpen, setMenuOpen] = useState(false);

  // Live clock
  useEffect(() => {
    const tid = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tid);
  }, []);

  // Fetch live weather using Open-Meteo (free, no key needed)
  const fetchWeather = useCallback(async (lat, lon, locationName) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
      );
      const data = await res.json();
      const cw = data.current;
      const humidity = cw?.relative_humidity_2m ?? '--';
      const windSpeed = cw?.wind_speed_10m ?? 0;
      const wcode = cw?.weather_code ?? 0;
      
      const icons = { 0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️', 45: '🌫', 51: '🌦', 61: '🌧', 80: '🌦', 95: '⛈' };
      const icon = icons[wcode] || '🌤';
      const conditions = { 0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast', 45: 'Foggy', 51: 'Light Drizzle', 61: 'Rain', 80: 'Showers', 95: 'Thunderstorm' };
      
      setWeather({
        temp: cw?.temperature_2m ? Math.round(cw.temperature_2m) : '--',
        humidity,
        windSpeed: windSpeed ? Math.round(windSpeed) : 0,
        isHeavyWind: windSpeed > 15,
        condition: conditions[wcode] || 'Partly Cloudy',
        icon,
        location: locationName,
      });
    } catch {
      setWeather(w => ({ ...w, condition: 'Weather unavailable', location: 'Tamil Nadu' }));
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let locName = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
          try {
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`);
            const d = await r.json();
            const addr = d.address || {};
            locName = addr.road || addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.state_district || locName;
          } catch {}
          fetchWeather(latitude, longitude, locName);
        },
        () => fetchWeather(11.0168, 76.9558, 'Coimbatore')
      );
    } else {
      fetchWeather(11.0168, 76.9558, 'Coimbatore');
    }
  }, [fetchWeather]);

  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fmtDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  const navItems = [
    { id: 'home', label: t('home'), icon: '🏠' },
    { id: 'land', label: t('analyze'), icon: '🌾' },
    { id: 'results', label: t('results'), icon: '📊' },
  ];

  return (
    <header className={`app-header ${langClass}`}>
      {/* Left — Logo */}
      <div className="header-logo" onClick={() => setPage('home')} id="header-logo">
        <img src={logo} alt="Agri-Opt" className="header-logo-img" />
        <span className="header-logo-text">AGRI-OPT</span>
      </div>

      {/* Center — Nav */}
      <nav className="header-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`header-nav-btn ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Right — Weather + Time + Lang + User */}
      <div className="header-right">
        {/* Location + Weather */}
        <div className="header-weather">
          <span className="weather-icon">{weather.icon}</span>
          <div className="weather-info">
            <span className="weather-location">{weather.location}</span>
            <div className="weather-stats">
              <span className="weather-temp">{weather.temp}°C</span>
              <span className="weather-sep">·</span>
              <span className="weather-hum">💧{weather.humidity}%</span>
              <span className="weather-sep">·</span>
              <span className="weather-wind">💨 {weather.windSpeed} km/h</span>
            </div>
          </div>
          {weather.isHeavyWind && (
            <div className="wind-alert-badge" title="Wind speed exceeds safe levels!">
              ⚠️ {lang === 'ta' ? 'பலத்த காற்று!' : lang === 'hi' ? 'तेज हवा!' : 'Heavy Wind!'}
            </div>
          )}
        </div>

        {/* Live Clock */}
        <div className="header-clock">
          <span className="clock-time">{fmt(time)}</span>
          <span className="clock-date">{fmtDate(time)}</span>
        </div>

        {/* Language Toggle */}
        <div className="header-lang">
          {[['en', 'English'], ['ta', 'தமிழ்'], ['hi', 'हिंदी']].map(([code, label]) => (
            <button
              key={code}
              id={`header-lang-${code}`}
              className={`lang-pill ${lang === code ? 'active' : ''}`}
              onClick={() => setLang(code)}
              title={code === 'ta' ? 'தமிழ்' : code === 'hi' ? 'हिंदी' : 'English'}
            >
              {label}
            </button>
          ))}
        </div>

        {/* User Menu */}
        <div className="header-user" onClick={() => setMenuOpen(m => !m)} id="header-user-menu">
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="user-name">{user?.username || 'Farmer'}</span>
          <span className="user-chevron">{menuOpen ? '▲' : '▼'}</span>
          {menuOpen && (
            <div className="user-dropdown">
              <div className="dropdown-item user-info-item">
                <span>📱 {user?.fullPhone}</span>
              </div>
              <div className="dropdown-item user-info-item">
                <span>📧 {user?.email}</span>
              </div>
              <div className="dropdown-sep" />
              <button className="dropdown-item logout-btn" onClick={onLogout} id="btn-logout">
                🚪 {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
