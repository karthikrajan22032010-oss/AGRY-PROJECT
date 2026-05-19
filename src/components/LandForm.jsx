import React, { useState, useRef } from 'react';
import { useLang } from '../context/LangContext';
import './LandForm.css';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

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
  const [showManual,  setShowManual]      = useState(false);
  const imgInputRef = useRef(null);

  // Auto-locate on mount
  React.useEffect(() => {
    if (!form.lat && !form.locationName) {
      useMyLocation();
    }
  }, []);

  const triggerLocationAI = async (lat, lon, locName) => {
    setAnalyzing(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an elite agricultural AI. Based on the exact GPS coordinates (Lat: ${lat}, Lon: ${lon}) at location "${locName}", predict the highly probable agricultural data for this specific geographic area.
Return exactly these categories in JSON:
1. soilType: Must match one of: ${SOIL_TYPES.join(' / ')}
2. slope: Must match one of: ${SLOPE_OPTIONS.join(' / ')}
3. crops: Array of 2-3 most common crops here matching these options: ${CROP_OPTIONS.join(' / ')}
4. condition: healthy / dry / flooded
5. groundWater: Estimated level as a number 10-100
6. recommendation: A short expert farming tip based on this geography.

Reply ONLY with valid JSON.`
              }]
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
          }),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        const findBestMatch = (val, options) => {
          if (!val) return null;
          const v = val.toLowerCase();
          return options.find(opt => opt.toLowerCase().includes(v) || v.includes(opt.toLowerCase()));
        };

        const matchedSoil = findBestMatch(parsed.soilType, SOIL_TYPES);
        const matchedSlope = findBestMatch(parsed.slope, SLOPE_OPTIONS);
        const matchedCrops = Array.isArray(parsed.crops) 
          ? parsed.crops.map(c => findBestMatch(c, CROP_OPTIONS)).filter(Boolean)
          : [];

        setImageAnalysis({ ...parsed, type: 'location' }); // Sets state to hide manual forms
        setForm(p => ({
          ...p,
          soilType: matchedSoil || p.soilType,
          slope: matchedSlope || p.slope,
          crops: matchedCrops.length ? [...new Set([...p.crops, ...matchedCrops])] : p.crops,
          groundWater: parsed.groundWater ? String(parsed.groundWater) : p.groundWater
        }));
      }
    } catch (err) {
      console.warn('Location AI failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

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
        let name = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          // Use a more detailed address lookup with zoom level 18 for exactness
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`);
          const d = await r.json();
          const addr = d.address || {};
          
          // Formulate a very exact address string with no duplicates
          const rawParts = [
            addr.amenity || addr.building,
            addr.road,
            addr.neighbourhood || addr.suburb,
            addr.village || addr.town || addr.city,
            addr.state_district || addr.county,
            addr.state,
            addr.postcode
          ].filter(Boolean);
          
          const parts = [...new Set(rawParts)];
          name = parts.join(', ');
        } catch {}
        setForm(p => ({ ...p, lat: latitude.toFixed(6), lon: longitude.toFixed(6), locationName: name }));
        setLocLoading(false);
        triggerLocationAI(latitude.toFixed(6), longitude.toFixed(6), name);
      },
      () => { setLocError('Could not get exact location. Enter manually.'); setLocLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Force high accuracy GPS
    );
  };

  const openGoogleMaps = () => {
    // Priority: 1. Coordinates (Exact), 2. Location Name (General)
    let q = '';
    if (form.lat && form.lon) {
      q = `${form.lat},${form.lon}`;
    } else if (form.locationName) {
      q = form.locationName;
    } else {
      q = 'Tamil Nadu Agriculture';
    }
    
    // Using a more reliable Google Maps URL format for coordinates
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    window.open(url, '_blank');
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
                  { text: `Analyze this agricultural land photo for high-precision field diagnostics. 
Return exactly these categories in JSON:
1. soilType: Must match one of: ${SOIL_TYPES.join(' / ')}
2. slope: Must match one of: ${SLOPE_OPTIONS.join(' / ')}
3. crops: Array of detected crops matching these options: ${CROP_OPTIONS.join(' / ')}
4. condition: dry / wet / flooded / healthy / degraded
5. groundWater: Estimated level as a number 10-100
6. concerns: Any visible land issues
7. recommendation: A short expert farming tip.

Reply ONLY with valid JSON: {"soilType":"...","slope":"...","crops":["..."],"condition":"...","groundWater":85,"concerns":"...","recommendation":"..."}` },
                  { inline_data: { mime_type: file.type, data: b64 } },
                ],
              }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
            }),
          }
        );
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setImageAnalysis(parsed);
          
          // FUZZY MATCHING LOGIC
          const findBestMatch = (val, options) => {
            if (!val) return null;
            const v = val.toLowerCase();
            return options.find(opt => opt.toLowerCase().includes(v) || v.includes(opt.toLowerCase()));
          };

          const matchedSoil = findBestMatch(parsed.soilType, SOIL_TYPES);
          const matchedSlope = findBestMatch(parsed.slope, SLOPE_OPTIONS);
          const matchedCrops = Array.isArray(parsed.crops) 
            ? parsed.crops.map(c => findBestMatch(c, CROP_OPTIONS)).filter(Boolean)
            : [];

          setForm(p => ({
            ...p,
            soilType: matchedSoil || p.soilType,
            slope: matchedSlope || p.slope,
            crops: matchedCrops.length ? [...new Set([...p.crops, ...matchedCrops])] : p.crops,
            groundWater: parsed.groundWater ? String(parsed.groundWater) : p.groundWater
          }));
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
        {/* ── IMAGE UPLOAD (The main entry point for 'Magic' mode) ── */}
        <div className={`glass-card land-card image-upload-card ${imageAnalysis ? 'magic-active' : ''}`}>
          <h3 className="card-title">
            🖼 {imageAnalysis ? 'AI Field Scan Complete' : 'Upload Land Photo'}
            <span className="optional-badge">{imageAnalysis ? 'AI Verified' : 'Auto AI Analysis'}</span>
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
                <div className="image-drop-hint">AI will auto-fill every technical detail for you</div>
              </div>
            )}
            <input ref={imgInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handleImageChange} />
          </div>

          {analyzing && (
            <div className="image-analyzing">
              <span className="spinner-sm" />
              <span>AI is reading your land... no manual entry needed.</span>
            </div>
          )}

          {imageAnalysis && !analyzing && (
            <div className="magic-success-pill">
              ✨ AI has completed the check. Your field is ready for analysis.
            </div>
          )}

          {imageAnalysis && !analyzing && (
            <div className="image-analysis-result magic-result">
              <div className="analysis-title">🤖 AI Field Intelligence</div>
              <div className="magic-grid">
                {imageAnalysis.soilType && <div className="magic-item"><span>🪨 Soil</span><strong>{imageAnalysis.soilType}</strong></div>}
                {imageAnalysis.slope && <div className="magic-item"><span>⛰ Slope</span><strong>{imageAnalysis.slope}</strong></div>}
                {imageAnalysis.crops && imageAnalysis.crops.length > 0 && (
                  <div className="magic-item"><span>🌱 Crops</span><strong>{imageAnalysis.crops.join(', ')}</strong></div>
                )}
                {imageAnalysis.condition && <div className="magic-item"><span>💧 Status</span><strong>{imageAnalysis.condition}</strong></div>}
              </div>
              <div className="analysis-recommend magic-tip">💡 {imageAnalysis.recommendation}</div>
            </div>
          )}
        </div>

        {/* ── LOCATION (Always shown but simplified in magic mode) ── */}
        <div className={`glass-card land-card location-primary-card ${imageAnalysis ? 'magic-mini' : ''}`}>
          <h3 className="card-title">📍 {t('location')}</h3>
          
          <div className="magic-location-box">
            <span className="magic-loc-icon">🌐</span>
            <div className="magic-loc-info">
              <span className="magic-loc-label">Current Field Location</span>
              <span className="magic-loc-value">{form.locationName || 'Detecting...'}</span>
            </div>
            {!imageAnalysis && (
              <button className="magic-change-loc" onClick={useMyLocation}>🔄 Update</button>
            )}
          </div>

          {!imageAnalysis && (
            <>
              <div className="loc-actions">
                <button id="btn-my-location" className="btn-primary loc-btn" onClick={useMyLocation} disabled={locLoading}>
                  {locLoading ? <span className="spinner-sm" /> : '📡'} {t('useMyLocation')}
                </button>
              </div>
              <div className="form-group search-loc-group">
                <div className="input-with-btn">
                  <input className="input-field" placeholder="Search place name..." value={form.locationName} onChange={f('locationName')} />
                </div>
              </div>
            </>
          )}

          {form.lat && form.lon && (
            <div className="map-preview-wrap">
              <iframe title="map" className="map-preview" src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(form.lon)-0.005},${parseFloat(form.lat)-0.005},${parseFloat(form.lon)+0.005},${parseFloat(form.lat)+0.005}&layer=mapnik&marker=${form.lat},${form.lon}`} />
            </div>
          )}
        </div>

        {/* ── MANUAL BOXES (Hidden by Default) ── */}
        {!imageAnalysis && (
          <div className="manual-toggle-section" style={{ width: '100%', textAlign: 'center', marginTop: '1rem', gridColumn: '1 / -1' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setShowManual(!showManual)}
              style={{ background: 'transparent', border: '1px solid var(--border-bright)', color: 'var(--green-bright)', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '1rem' }}
            >
              {showManual ? '▲ Hide Manual Entry' : '▼ Show Manual Entry'}
            </button>
            
            {showManual && (
              <div className="manual-fields-container" style={{ animation: 'fadeIn 0.3s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
                <div className="glass-card land-card">
                  <h3 className="card-title">📐 {t('landArea')}</h3>
                  <div className="dim-row">
                    <input className="input-field" type="number" placeholder="Length (ft)" value={form.length} onChange={f('length')} />
                    <input className="input-field" type="number" placeholder="Width (ft)" value={form.width} onChange={f('width')} />
                  </div>
                </div>

                <div className="glass-card land-card">
                  <h3 className="card-title">🌍 Conditions</h3>
                  <select className="input-field" value={form.soilType} onChange={f('soilType')}>
                    {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="input-field" value={form.slope} onChange={f('slope')}>
                    {SLOPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="glass-card land-card">
                  <h3 className="card-title">🌱 Crops</h3>
                  <div className="crop-grid">
                    {CROP_OPTIONS.slice(0, 8).map(c => (
                      <button key={c} className={`crop-chip ${form.crops.includes(c) ? 'selected' : ''}`} onClick={() => toggleCrop(c)}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
