import React, { useState, useRef } from 'react';
import { useLang } from '../context/LangContext';
import './LandForm.css';

const GEMINI_KEY = 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

/* ── Color themes that change when an image is uploaded ── */
const IMAGE_THEMES = [
  { name:'Forest Green',  primary:'#00e664', bg:'#050d08', accent:'#00cc55' },
  { name:'Golden Farm',   primary:'#f5c518', bg:'#0d0b03', accent:'#c9a200' },
  { name:'Sky Blue',      primary:'#00bfff', bg:'#030a12', accent:'#0088cc' },
  { name:'Harvest Orange',primary:'#ff7f30', bg:'#100600', accent:'#cc5500' },
  { name:'Lavender Dusk', primary:'#aa88ff', bg:'#07030e', accent:'#7744dd' },
  { name:'Red Soil',      primary:'#ff5050', bg:'#100303', accent:'#cc2222' },
  { name:'Teal Fields',   primary:'#00e5cc', bg:'#02100e', accent:'#00aa99' },
];

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty('--green-primary',  theme.primary);
  root.style.setProperty('--green-bright',   theme.primary);
  root.style.setProperty('--green-dim',      theme.accent);
  root.style.setProperty('--green-glow',     theme.primary + '44');
  root.style.setProperty('--border-green',   theme.primary + '33');
  root.style.setProperty('--border-bright',  theme.primary + '88');
  root.style.setProperty('--bg-primary',     theme.bg);
  root.style.setProperty('--bg-secondary',   theme.bg + 'cc');
  root.style.setProperty('--bg-glass',       theme.primary + '08');
}

const SOIL_TYPES   = ['Red Loamy Soil','Black Cotton Soil','Alluvial Soil','Laterite Soil','Sandy Soil','Clay Soil','Silt Soil'];
const CROP_OPTIONS = ['Paddy (Rice)','Wheat','Sugarcane','Cotton','Tomato','Banana','Mango','Coconut','Groundnut','Maize','Onion','Sunflower','Soybean','Millets'];
const SLOPE_OPTIONS= ['Flat (0-1%)','Gentle Slope (2-3%)','Moderate Slope (4-6%)','Steep Slope (7-15%)'];

export default function LandForm({ onSubmit }) {
  const { t, langClass } = useLang();
  const [form, setForm] = useState({
    lat: '', lon: '', locationName: '',
    length: '', width: '',
    plotType: 'rectangular', shape2Area: '',
    soilType: 'Red Loamy Soil',
    slope: 'Gentle Slope (2-3%)',
    groundWater: '85',
    crops: [],
  });
  const [locLoading, setLocLoading]       = useState(false);
  const [locError,   setLocError]         = useState('');
  const [submitting, setSubmitting]       = useState(false);

  /* ── Image upload state ── */
  const [landImage,   setLandImage]       = useState(null);   // base64
  const [imageFile,   setImageFile]       = useState(null);
  const [imageTheme,  setImageTheme]      = useState(IMAGE_THEMES[0]);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [analyzing,   setAnalyzing]       = useState(false);
  const imgInputRef = useRef(null);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  /* ── Area calculation ── */
  const calcArea = () => {
    const L = parseFloat(form.length) || 0;
    const W = parseFloat(form.width)  || 0;
    if (form.plotType === 'rectangular') return L * W;
    return (L * W * 0.5) + (parseFloat(form.shape2Area) || 0);
  };
  const sqFt   = calcArea();
  const cents  = (sqFt / 435.6).toFixed(3);
  const guntas = (sqFt / 1089).toFixed(3);
  const acres  = (sqFt / 43560).toFixed(4);

  /* ── GPS location ── */
  const useMyLocation = () => {
    setLocLoading(true);
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported.'); setLocLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        let name = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const d = await r.json();
          name = [d.address?.village, d.address?.state_district, d.address?.state].filter(Boolean).join(', ');
        } catch {}
        setForm(p => ({ ...p, lat: latitude.toFixed(6), lon: longitude.toFixed(6), locationName: name }));
        setLocLoading(false);
      },
      () => { setLocError('Could not get location. Enter manually.'); setLocLoading(false); }
    );
  };

  const openGoogleMaps = () => {
    const q = form.lat && form.lon ? `${form.lat},${form.lon}` : form.locationName || 'Tamil Nadu Agriculture';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
  };

  /* ── Image upload + Gemini Vision analysis ── */
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);

    // Read as base64
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target.result.split(',')[1];
      const dataUrl = ev.target.result;
      setLandImage(dataUrl);

      // Pick a theme based on file index (deterministic rotation)
      const themeIdx = Math.floor(Math.random() * IMAGE_THEMES.length);
      const chosen   = IMAGE_THEMES[themeIdx];
      setImageTheme(chosen);
      applyTheme(chosen);           // ← live color change

      // Call Gemini Vision
      setAnalyzing(true);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: `Analyze this agricultural land photo. Identify:
1. Visible soil type (Red Loamy / Black Cotton / Alluvial / Sandy / Clay / Laterite / Silt)
2. Land condition (dry / wet / flooded / healthy / degraded)
3. Visible crops or vegetation
4. Slope (flat / gentle / moderate / steep)
5. Land security concerns (any visible encroachment, water erosion, etc.)
6. Short recommendation for this land.
Reply in JSON format: {"soilType":"...","condition":"...","crops":["..."],"slope":"...","concerns":"...","recommendation":"..."}` },
                  { inline_data: { mime_type: file.type, data: b64 } },
                ],
              }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
            }),
          }
        );
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setImageAnalysis(parsed);
          // Auto-fill form fields from analysis
          if (parsed.soilType)  setForm(p => ({ ...p, soilType: parsed.soilType }));
          if (parsed.slope) {
            const slopeMap = { flat:'Flat (0-1%)', gentle:'Gentle Slope (2-3%)', moderate:'Moderate Slope (4-6%)', steep:'Steep Slope (7-15%)' };
            const key = Object.keys(slopeMap).find(k => parsed.slope.toLowerCase().includes(k));
            if (key) setForm(p => ({ ...p, slope: slopeMap[key] }));
          }
          if (Array.isArray(parsed.crops) && parsed.crops.length) {
            const matched = parsed.crops.filter(c => CROP_OPTIONS.some(opt => opt.toLowerCase().includes(c.toLowerCase())));
            if (matched.length) setForm(p => ({ ...p, crops: matched }));
          }
        }
      } catch (err) {
        console.warn('Image analysis failed:', err);
        setImageAnalysis({ recommendation: 'Image uploaded. Manual entry used.' });
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ── Crop toggle ── */
  const toggleCrop = (crop) => setForm(p => ({
    ...p,
    crops: p.crops.includes(crop) ? p.crops.filter(c => c !== crop) : [...p.crops, crop],
  }));

  /* ── Submit ── */
  const handleSubmit = () => {
    if (!form.locationName && !form.lat) {
      setLocError('Please enter your location first.'); return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSubmit({ ...form, sqFt, cents, guntas, acres, imageAnalysis, themeName: imageTheme.name });
    }, 900);
  };

  return (
    <div className={`land-form-page ${langClass}`}>
      <div className="land-form-header">
        <h2 className="land-form-title">🌾 {t('enterLand')}</h2>
        <p className="land-form-sub">
          Enter your <strong>location</strong> &amp; optionally upload a land photo for AI auto-analysis
        </p>
      </div>

      <div className="land-form-grid">

        {/* ── LOCATION (primary — required) ── */}
        <div className="glass-card land-card location-primary-card">
          <h3 className="card-title">📍 {t('location')} <span className="required-badge">Required</span></h3>

          <div className="loc-actions">
            <button id="btn-my-location" className="btn-primary loc-btn"
              onClick={useMyLocation} disabled={locLoading}>
              {locLoading ? <span className="spinner-sm" /> : '📡'}
              {locLoading ? 'Detecting...' : t('useMyLocation')}
            </button>
            <button id="btn-open-map" className="btn-outline loc-btn" onClick={openGoogleMaps}>
              🗺 {t('openMap')}
            </button>
          </div>

          {locError && <div className="loc-error">⚠ {locError}</div>}

          <div className="form-group">
            <label className="form-label">🏘 Location Name / Village / District</label>
            <input id="field-location-name" className="input-field location-big-input"
              placeholder="e.g. Coimbatore, Tamil Nadu or Village name..."
              value={form.locationName}
              onChange={f('locationName')} />
          </div>

          <div className="coord-row">
            <div className="form-group">
              <label className="form-label">🌐 Latitude</label>
              <input id="field-lat" className="input-field" placeholder="11.0168"
                value={form.lat} onChange={f('lat')} />
            </div>
            <div className="form-group">
              <label className="form-label">🌐 Longitude</label>
              <input id="field-lon" className="input-field" placeholder="76.9558"
                value={form.lon} onChange={f('lon')} />
            </div>
          </div>

          {/* Mini map preview */}
          {form.lat && form.lon && (
            <div className="map-preview-wrap">
              <iframe
                title="Land Location"
                className="map-preview"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(form.lon)-0.01},${parseFloat(form.lat)-0.01},${parseFloat(form.lon)+0.01},${parseFloat(form.lat)+0.01}&layer=mapnik&marker=${form.lat},${form.lon}`}
                loading="lazy"
              />
              <div className="map-label">📍 {form.locationName || `${form.lat}, ${form.lon}`}</div>
            </div>
          )}
        </div>

        {/* ── IMAGE UPLOAD (auto-analyzes & changes color) ── */}
        <div className="glass-card land-card image-upload-card">
          <h3 className="card-title">
            🖼 Upload Land Photo
            <span className="optional-badge">Auto AI Analysis</span>
          </h3>

          <div
            className={`image-drop-zone ${landImage ? 'has-image' : ''}`}
            onClick={() => imgInputRef.current?.click()}
            id="land-image-upload"
          >
            {landImage ? (
              <img src={landImage} alt="Uploaded land" className="land-img-preview" />
            ) : (
              <div className="image-drop-inner">
                <div className="image-drop-icon">📸</div>
                <div className="image-drop-text">Click to upload land photo</div>
                <div className="image-drop-hint">JPG / PNG — AI will auto-analyze soil, crops & slope</div>
              </div>
            )}
            <input ref={imgInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleImageChange} />
          </div>

          {/* Analyzing indicator */}
          {analyzing && (
            <div className="image-analyzing">
              <span className="spinner-sm" />
              <span>AI analyzing your land photo...</span>
            </div>
          )}

          {/* Theme badge */}
          {landImage && !analyzing && (
            <div className="theme-applied-badge">
              🎨 Theme applied: <strong>{imageTheme.name}</strong>
              <button className="change-theme-btn"
                onClick={() => {
                  const next = IMAGE_THEMES[(IMAGE_THEMES.indexOf(imageTheme) + 1) % IMAGE_THEMES.length];
                  setImageTheme(next); applyTheme(next);
                }}>
                Next Theme →
              </button>
            </div>
          )}

          {/* Analysis result */}
          {imageAnalysis && !analyzing && (
            <div className="image-analysis-result">
              <div className="analysis-title">🤖 AI Analysis Result</div>
              {imageAnalysis.soilType    && <div className="analysis-row"><span>Soil:</span><span>{imageAnalysis.soilType}</span></div>}
              {imageAnalysis.condition   && <div className="analysis-row"><span>Condition:</span><span>{imageAnalysis.condition}</span></div>}
              {imageAnalysis.slope       && <div className="analysis-row"><span>Slope:</span><span>{imageAnalysis.slope}</span></div>}
              {imageAnalysis.concerns    && <div className="analysis-row"><span>Concerns:</span><span>{imageAnalysis.concerns}</span></div>}
              {imageAnalysis.recommendation && (
                <div className="analysis-recommend">💡 {imageAnalysis.recommendation}</div>
              )}
            </div>
          )}

          {/* Color swatches */}
          <div className="theme-swatches">
            <span className="swatch-label">Color Theme:</span>
            {IMAGE_THEMES.map((th, i) => (
              <button key={i}
                className={`swatch-btn ${imageTheme.name === th.name ? 'active' : ''}`}
                style={{ background: th.primary }}
                title={th.name}
                onClick={() => { setImageTheme(th); applyTheme(th); }}
              />
            ))}
          </div>
        </div>

        {/* ── AREA (optional) ── */}
        <div className="glass-card land-card">
          <h3 className="card-title">📐 {t('landArea')} <span className="optional-badge">Optional</span></h3>

          <div className="form-group">
            <label className="form-label">{t('plotType')}</label>
            <div className="plot-type-toggle">
              <button id="plot-rectangular"
                className={`plot-type-btn ${form.plotType === 'rectangular' ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, plotType: 'rectangular' }))}>▭ {t('rectangular')}</button>
              <button id="plot-nonrectangular"
                className={`plot-type-btn ${form.plotType === 'nonrectangular' ? 'active' : ''}`}
                onClick={() => setForm(p => ({ ...p, plotType: 'nonrectangular' }))}>△ {t('nonRectangular')}</button>
            </div>
          </div>

          <div className="dim-row">
            <div className="form-group">
              <label className="form-label">↔ {t('landLength')}</label>
              <input id="field-length" className="input-field" type="number"
                placeholder="e.g. 200" value={form.length} onChange={f('length')} />
            </div>
            <div className="form-group">
              <label className="form-label">↕ {t('landWidth')}</label>
              <input id="field-width" className="input-field" type="number"
                placeholder="e.g. 100" value={form.width} onChange={f('width')} />
            </div>
          </div>

          {form.plotType === 'nonrectangular' && (
            <div className="form-group">
              <label className="form-label">△ Triangle Extra Area (sq ft)</label>
              <input id="field-shape2" className="input-field" type="number"
                placeholder="e.g. 500" value={form.shape2Area} onChange={f('shape2Area')} />
            </div>
          )}

          {sqFt > 0 && (
            <div className="area-result-box">
              <div className="area-result-title">Calculated Area</div>
              <div className="area-result-grid">
                {[
                  [sqFt.toLocaleString(), t('sqFt')],
                  [cents, t('cents')],
                  [guntas, t('guntas')],
                  [acres, t('acres')],
                ].map(([v, u]) => (
                  <div key={u} className="area-result-item">
                    <span className="area-val">{v}</span>
                    <span className="area-unit">{u}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversion table */}
          <div className="conversion-table-wrap">
            <div className="conv-title">📊 Quick Conversion</div>
            <table className="agri-table conv-table">
              <thead><tr><th>Unit</th><th>= Sq Ft</th><th>Example</th></tr></thead>
              <tbody>
                <tr><td>1 Cent</td><td>435.6</td><td>40×10.9 ft</td></tr>
                <tr><td>1 Gunta</td><td>1,089</td><td>33×33 ft</td></tr>
                <tr><td>1 Ground</td><td>2,400</td><td>60×40 ft</td></tr>
                <tr><td>1 Acre</td><td>43,560</td><td>220×198 ft</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SOIL & CONDITIONS ── */}
        <div className="glass-card land-card">
          <h3 className="card-title">🌍 Soil &amp; Field Conditions <span className="optional-badge">Auto-filled if image uploaded</span></h3>

          <div className="form-group">
            <label className="form-label">🪨 {t('soilType')}</label>
            <select id="field-soil" className="input-field" value={form.soilType} onChange={f('soilType')}>
              {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">⛰ {t('fieldSlope')}</label>
            <select id="field-slope" className="input-field" value={form.slope} onChange={f('slope')}>
              {SLOPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">💧 {t('groundWater')} ({form.groundWater}%)</label>
            <input type="range" min={10} max={100} step={5}
              value={form.groundWater} onChange={f('groundWater')}
              className="range-slider" id="field-groundwater" />
            <div className="slider-value">
              <span className="gwl-val">{form.groundWater}%</span>
              <span className={`gwl-status ${form.groundWater >= 60 ? 'good' : form.groundWater >= 30 ? 'medium' : 'low'}`}>
                {form.groundWater >= 60 ? '✓ Good' : form.groundWater >= 30 ? '⚠ Medium' : '✗ Low'}
              </span>
            </div>
          </div>
        </div>

        {/* ── CROPS ── */}
        <div className="glass-card land-card">
          <h3 className="card-title">🌱 Crops &amp; Plants <span className="optional-badge">Auto-filled if image uploaded</span></h3>
          <div className="crop-grid">
            {CROP_OPTIONS.map(crop => (
              <button key={crop} id={`crop-${crop.replace(/\s+/g,'-')}`}
                className={`crop-chip ${form.crops.includes(crop) ? 'selected' : ''}`}
                onClick={() => toggleCrop(crop)}>
                {form.crops.includes(crop) ? '✓ ' : ''}{crop}
              </button>
            ))}
          </div>
          {form.crops.length > 0 && (
            <div className="selected-crops">Selected: {form.crops.join(', ')}</div>
          )}
        </div>

      </div>

      {/* Submit */}
      <div className="land-form-footer">
        <button id="btn-submit-land" className="btn-primary submit-big"
          onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? <><span className="spinner" /> Analyzing with AI...</>
            : <>🤖 {t('submit')} →</>
          }
        </button>
      </div>
    </div>
  );
}
