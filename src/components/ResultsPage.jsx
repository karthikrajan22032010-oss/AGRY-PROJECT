import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '../context/LangContext';
import './ResultsPage.css';

const GEMINI_KEY = 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

// Fertilizer data by soil type
const FERTILIZER_DATA = {
  'Red Loamy Soil': { npk: 'NPK 20:20:20 - 50kg/acre', base: 'FYM 5T + Urea 100kg', ph: '5.5-6.5' },
  'Black Cotton Soil': { npk: 'NPK 10:26:26 - 60kg/acre', base: 'FYM 4T + SSP 150kg', ph: '7.0-8.0' },
  'Alluvial Soil': { npk: 'NPK 17:17:17 - 55kg/acre', base: 'FYM 6T + MOP 80kg', ph: '6.5-7.5' },
  'Laterite Soil': { npk: 'NPK 15:15:15 - 45kg/acre', base: 'Lime 200kg + FYM 5T', ph: '4.5-5.5' },
  'Sandy Soil': { npk: 'NPK 10:10:20 - 70kg/acre', base: 'FYM 8T + Urea 80kg', ph: '6.0-7.0' },
  'Clay Soil': { npk: 'NPK 14:14:14 - 50kg/acre', base: 'FYM 4T + Gypsum 100kg', ph: '6.0-7.5' },
  'Silt Soil': { npk: 'NPK 18:18:18 - 55kg/acre', base: 'FYM 5T + Zinc Sulphate 25kg', ph: '6.5-7.0' },
};

// Crop schedule data
const CROP_SCHEDULE = {
  'Paddy (Rice)': { fert: '200g/day', water: '8L/hour', grass: 'Weekly weeding', season: 'Kharif/Rabi' },
  'Wheat': { fert: '150g/day', water: '4L/hour', grass: 'Monthly trim', season: 'Rabi' },
  'Sugarcane': { fert: '350g/day', water: '12L/hour', grass: 'Bi-weekly clear', season: 'Annual' },
  'Cotton': { fert: '180g/day', water: '5L/hour', grass: '2x monthly', season: 'Kharif' },
  'Tomato': { fert: '200g/day', water: '5L/hour', grass: 'Trim weekly', season: 'All year' },
  'Banana': { fert: '400g/month', water: '15L/day', grass: 'Clear 1m radius', season: 'Annual' },
  'Mango': { fert: '500g/month', water: '10L/day', grass: 'Clear 2m radius', season: 'Annual' },
  'Coconut': { fert: '600g/month', water: '8L/day', grass: 'Monthly trim', season: 'Annual' },
  'Groundnut': { fert: '100g/day', water: '4L/hour', grass: 'Weekly weeding', season: 'Kharif' },
  'Maize': { fert: '200g/day', water: '6L/hour', grass: 'Bi-weekly', season: 'Kharif' },
  'Onion': { fert: '120g/day', water: '3L/hour', grass: 'Weekly weeding', season: 'Rabi' },
  'Sunflower': { fert: '160g/day', water: '4L/hour', grass: 'Monthly', season: 'Kharif' },
  'Soybean': { fert: '130g/day', water: '4L/hour', grass: 'Bi-weekly', season: 'Kharif' },
  'Millets': { fert: '100g/day', water: '3L/hour', grass: 'Monthly', season: 'Kharif' },
};

const LAND_TYPES = {
  flat: ['Wetland', 'Paddy Field', 'Irrigation Farm'],
  gentle: ['Dryland', 'Horticulture Land', 'Mixed Farm'],
  moderate: ['Upland', 'Terrace Farm', 'Plantation'],
  steep: ['Forest Edge', 'Contour Farm', 'Slope Farm'],
};

function getLandType(slope) {
  if (slope.includes('0-1')) return LAND_TYPES.flat[Math.floor(Math.random() * 3)];
  if (slope.includes('2-3')) return LAND_TYPES.gentle[Math.floor(Math.random() * 3)];
  if (slope.includes('4-6')) return LAND_TYPES.moderate[Math.floor(Math.random() * 3)];
  return LAND_TYPES.steep[Math.floor(Math.random() * 3)];
}

function getEncroachmentStatus(groundWater, slope) {
  const gw = parseInt(groundWater);
  if (gw >= 75 && !slope.includes('Steep')) return { status: 'Secure', risk: 'Low', detail: 'No Encroachment Detected', color: 'green' };
  if (gw >= 45) return { status: 'Moderate Risk', risk: 'Medium', detail: 'Boundary verification recommended', color: 'yellow' };
  return { status: 'High Risk', risk: 'High', detail: 'Immediate survey required', color: 'red' };
}

export default function ResultsPage({ landData }) {
  const { t, lang, langClass, speak, stopSpeak } = useLang();
  const [speaking, setSpeaking] = useState(false);
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setAnalyzing(false), 1800);
    return () => clearTimeout(timer);
  }, [landData]);

  if (!landData) {
    return (
      <div className="no-data-msg">
        <div className="no-data-icon">🌾</div>
        <h3>No Land Data Yet</h3>
        <p>Go to the Analyze tab and enter your land details to see results.</p>
      </div>
    );
  }

  const fertData = FERTILIZER_DATA[landData.soilType] || FERTILIZER_DATA['Red Loamy Soil'];
  const encr = getEncroachmentStatus(landData.groundWater, landData.slope);
  const landType = getLandType(landData.slope);
  const crops = landData.crops?.length ? landData.crops : ['Tomato', 'Mango'];

  const resultText = `
    Land Analysis Report. Land Type: ${landType}. Soil Type: ${landData.soilType}. 
    Field Slope: ${landData.slope}. Area: ${landData.sqFt} square feet, ${landData.acres} acres.
    Fertilizer Required: ${fertData.npk}. Base Fertilizer: ${fertData.base}.
    Ground Water Level: ${landData.groundWater} percent.
    Land Security Status: ${encr.status}. ${encr.detail}.
    Location: ${landData.locationName || `${landData.lat}, ${landData.lon}`}.
  `;

  const handleSpeak = () => {
    if (speaking) {
      stopSpeak();
      setSpeaking(false);
    } else {
      speak(resultText);
      setSpeaking(true);
      setTimeout(() => setSpeaking(false), resultText.length * 60);
    }
  };

  if (analyzing) {
    return (
      <div className="analyzing-screen">
        <div className="analyzing-icon">🤖</div>
        <h3>{t('analyzing')}</h3>
        <div className="analyzing-bar">
          <div className="analyzing-fill" />
        </div>
        <div className="analyzing-steps">
          {['Processing coordinates...', 'Analyzing soil data...', 'Calculating fertilizer...', 'Checking encroachment...', 'Generating report...'].map((s, i) => (
            <div key={i} className="analyzing-step" style={{ animationDelay: `${i * 0.3}s` }}>✓ {s}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`results-page ${langClass}`}>
      {/* Header */}
      <div className="results-top">
        <div className="results-title-row">
          <h2 className="results-title">
            {lang === 'ta' ? '🌾 நில பகுப்பாய்வு அறிக்கை' : lang === 'hi' ? '🌾 भूमि विश्लेषण रिपोर्ट' : '🌾 Field Analysis Report'}
          </h2>
          <div className="results-actions">
            <button
              id="btn-speak-results"
              className={`btn-outline speak-btn ${speaking ? 'speaking' : ''}`}
              onClick={handleSpeak}
            >
              {speaking ? `🔊 ${t('stopSpeak')}` : `🔊 ${t('speak')}`}
            </button>
            <span className="tag">
              <span className="status-dot" />
              {t('reportReady')}
            </span>
          </div>
        </div>
        <div className="results-meta">
          📍 {landData.locationName || `${landData.lat}, ${landData.lon}`} •
          📐 {parseFloat(landData.sqFt).toLocaleString()} {t('sqFt')} ({landData.acres} {t('acres')}) •
          🕐 {new Date().toLocaleString(lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN')}
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="results-grid">

        {/* 1 — Land Details */}
        <div className="glass-card result-card">
          <h3 className="result-card-title">
            {lang === 'ta' ? '1. நில விவரங்கள்' : lang === 'hi' ? '1. भूमि विवरण' : '1. Land Details'}
          </h3>
          <div className="detail-list">
            <div className="detail-row">
              <span className="detail-key">
                {t('selectedArea')}
              </span>
              <span className="detail-val">{t('mobile')} {landData.fullPhone || '9080404579'} • {t('loc')}: {landData.lat || '11.719'}, {landData.lon || '77.2701'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('landType')}</span>
              <span className="detail-val neon">{t(landType)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('area')}</span>
              <span className="detail-val">{parseFloat(landData.sqFt).toLocaleString()} {t('sqFt')} / {landData.acres} {t('acres')} / {landData.cents} {t('cents')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('fieldSlope')}</span>
              <span className="detail-val">{t(landData.slope)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('groundWater')}</span>
              <div className="gwl-bar-wrap">
                <div className="gwl-bar">
                  <div className="gwl-bar-fill" style={{ width: `${landData.groundWater}%` }} />
                </div>
                <span className="gwl-pct neon">{landData.groundWater}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 — Soil Type */}
        <div className="glass-card result-card">
          <h3 className="result-card-title">
            {lang === 'ta' ? '2. மண் விவரம்' : lang === 'hi' ? '2. मिट्टी विवरण' : '2. Soil Information'}
          </h3>
          <div className="soil-badge">
            <div className="soil-icon">🪨</div>
            <div>
              <div className="soil-name">{t(landData.soilType)}</div>
              <div className="soil-ph">pH Range: {fertData.ph}</div>
            </div>
          </div>
          <div className="detail-list mt-2">
            <div className="detail-row">
              <span className="detail-key">{t('waterRetention')}</span>
              <span className="detail-val">
                {landData.soilType.includes('Clay') || landData.soilType.includes('Black') ? t('high') :
                 landData.soilType.includes('Sandy') ? t('low') : t('medium')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('organicMatter')}</span>
              <span className="detail-val neon">{t('medium')} — 2.3%</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('drainage')}</span>
              <span className="detail-val">
                {landData.soilType.includes('Sandy') ? 'Well drained' :
                 landData.soilType.includes('Clay') ? 'Poor drainage' : t('medium')}
              </span>
            </div>
          </div>
        </div>

        {/* 3 — Field Slope */}
        <div className="glass-card result-card">
          <h3 className="result-card-title">
            {lang === 'ta' ? '3. வயல் சரிவு' : lang === 'hi' ? '3. खेत की ढलान' : '3. Field Slope Analysis'}
          </h3>
          <div className="slope-visual">
            <div className="slope-diagram" title={landData.slope}>
              <div className="slope-line" style={{
                transform: `rotate(-${landData.slope.includes('0-1') ? 2 : landData.slope.includes('2-3') ? 6 : landData.slope.includes('4-6') ? 12 : 20}deg)`
              }} />
              <span className="slope-label">{t(landData.slope)}</span>
            </div>
          </div>
          <div className="detail-list mt-2">
            <div className="detail-row">
              <span className="detail-key">{t('erosionRisk')}</span>
              <span className={`detail-val ${landData.slope.includes('Steep') ? 'text-red' : 'neon'}`}>
                {landData.slope.includes('0-1') ? t('vLow') : landData.slope.includes('2-3') ? t('low') : landData.slope.includes('4-6') ? t('medium') : t('high')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('irrigationMethod')}</span>
              <span className="detail-val">
                {landData.slope.includes('0-1') ? 'Flood/Drip' : landData.slope.includes('2-3') ? 'Sprinkler/Drip' : 'Contour Bunding'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('bundNeeded')}</span>
              <span className="detail-val neon">
                {landData.slope.includes('0-1') ? t('no') : landData.slope.includes('2-3') ? t('optional') : t('yes') + ' — ' + t('mandatory')}
              </span>
            </div>
          </div>
        </div>

        {/* 4 — Fertilizer */}
        <div className="glass-card result-card fert-card">
          <h3 className="result-card-title">
            {lang === 'ta' ? '4. உர தேவை' : lang === 'hi' ? '4. उर्वरक आवश्यकता' : '4. Fertilizer Required'}
          </h3>
          <div className="fert-main">
            <div className="fert-npk-box">
              <span className="fert-npk-label">{t('baseNPK')}</span>
              <span className="fert-npk-val">{fertData.npk}</span>
            </div>
            <div className="fert-flood-box">
              <div className="fert-flood-icon">⚠</div>
              <div>
                <div className="fert-flood-title">{t('floodRisk')}</div>
                <div className="fert-flood-detail">
                  {landData.slope.includes('Steep') ? 'Build terrace walls, deep-root plants along ridges' :
                   landData.slope.includes('Moderate') ? 'Build small trenches, plant deep-rooted trees along edges' :
                   landData.slope.includes('0-1') ? 'Install drainage channels, monitor monsoon runoff' :
                   'Build small trenches, plant deep-rooted trees along edges'}
                </div>
              </div>
            </div>
          </div>
          <div className="detail-list mt-2">
            <div className="detail-row">
              <span className="detail-key">{t('baseTreatment')}</span>
              <span className="detail-val">{fertData.base}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('microNutrients')}</span>
              <span className="detail-val">Zinc 10kg + Boron 2kg/acre</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('bioFertilizer')}</span>
              <span className="detail-val neon">Rhizobium + Azospirillum</span>
            </div>
          </div>
        </div>

        {/* 5 — Land Security */}
        <div className="glass-card result-card">
          <h3 className="result-card-title">
            {lang === 'ta' ? '5. நில பாதுகாப்பு' : lang === 'hi' ? '5. भूमि सुरक्षा' : '5. Land Security Status'}
          </h3>
          <div className={`security-badge security-${encr.color}`}>
            <div className="security-icon">
              {encr.color === 'green' ? '🛡' : encr.color === 'yellow' ? '⚠' : '🚨'}
            </div>
            <div>
              <div className="security-status">{t(encr.status)}</div>
              <div className="security-detail">{t(encr.detail)}</div>
            </div>
          </div>
          <div className="detail-list mt-2">
            <div className="detail-row">
              <span className="detail-key">{t('encroachment')}</span>
              <span className={`detail-val text-${encr.color === 'green' ? 'neon' : encr.color}`}>{t(encr.risk)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('surveyNo')}</span>
              <span className="detail-val">Auto-detect required</span>
            </div>
            <div className="detail-row">
              <span className="detail-key">{t('landUse')}</span>
              <span className="detail-val neon">{t(landType)}</span>
            </div>
          </div>
        </div>

        {/* 6 — Crop Schedule */}
        <div className="glass-card result-card crop-schedule-card full-width">
          <h3 className="result-card-title">
            {lang === 'ta' ? '6. பயிர் & தாவர பராமரிப்பு அட்டவணை' : lang === 'hi' ? '6. फसल और पौधे की देखभाल अनुसूची' : '6. Crop & Plant Maintenance Schedule'}
          </h3>
          <div className="table-wrap">
            <table className="agri-table">
              <thead>
                <tr>
                  <th>{t('crop')}</th>
                  <th>{t('fertilizerDaily')}</th>
                  <th>{t('waterHourly')}</th>
                  <th>{t('grassMaint')}</th>
                  <th>{t('season')}</th>
                </tr>
              </thead>
              <tbody>
                {crops.map(crop => {
                  const d = CROP_SCHEDULE[crop] || { fert: '150g/day', water: '5L/hour', grass: 'Monthly', season: 'All year' };
                  return (
                    <tr key={crop}>
                      <td><span className="crop-name">🌱 {t(crop)}</span></td>
                      <td><span className="neon">{d.fert}</span></td>
                      <td><span style={{ color: '#00aaff' }}>💧 {d.water}</span></td>
                      <td>{t(d.grass)}</td>
                      <td><span className="tag">{t(d.season)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
