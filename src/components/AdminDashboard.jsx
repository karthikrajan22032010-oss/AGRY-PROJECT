import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

export default function AdminDashboard({ setPage }) {
  const [auth, setAuth] = useState(
    sessionStorage.getItem('agri_adminAuth') === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // PDF Upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Filtering / Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState('all');

  // Load chat logs on success auth
  useEffect(() => {
    if (auth) {
      fetchLogs();
    }
  }, [auth]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/admin/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      } else {
        console.error('Failed to load logs.');
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5001/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuth(true);
        sessionStorage.setItem('agri_adminAuth', 'true');
      } else {
        setError(data.error || 'Login failed. Please check password.');
      }
    } catch (err) {
      setError('Connection to auth server failed.');
    }
  };

  const handleLogout = () => {
    setAuth(false);
    sessionStorage.removeItem('agri_adminAuth');
  };

  const detectLanguage = (text) => {
    if (!text) return 'English';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
    if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
    return 'English';
  };

  // Process chats array to pair questions and answers
  const getPairedChats = () => {
    const pairs = [];
    // Since chats are sorted newest first in the API, we iterate
    // A user question is followed in the array by the assistant response if it exists (index i-1 in newest-first sorting)
    for (let i = 0; i < chats.length; i++) {
      if (chats[i].role === 'user') {
        const answerMsg = chats.find(
          (c, idx) => idx < i && c.role === 'assistant' && c.username === chats[i].username
        );
        const lang = detectLanguage(chats[i].content);
        pairs.push({
          id: chats[i]._id || `${chats[i].time}-${chats[i].username}-${i}`,
          username: chats[i].username,
          phone: chats[i].phone || 'N/A',
          email: chats[i].email || 'N/A',
          question: chats[i].content,
          answer: answerMsg ? answerMsg.content : 'No response generated / Pending',
          time: new Date(chats[i].time),
          lang
        });
      }
    }
    return pairs;
  };

  const pairedLogs = getPairedChats();

  // Compute Metrics
  const totalQuestions = pairedLogs.length;
  const tamilCount = pairedLogs.filter(p => p.lang === 'Tamil').length;
  const englishCount = pairedLogs.filter(p => p.lang === 'English').length;
  const hindiCount = pairedLogs.filter(p => p.lang === 'Hindi').length;

  const tamilPercent = totalQuestions ? Math.round((tamilCount / totalQuestions) * 100) : 0;
  const englishPercent = totalQuestions ? Math.round((englishCount / totalQuestions) * 100) : 0;
  const hindiPercent = totalQuestions ? Math.round((hindiCount / totalQuestions) * 100) : 0;

  // Filter & Search pairing logs
  const filteredLogs = pairedLogs.filter(log => {
    const matchesSearch = 
      log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.phone.includes(searchQuery) ||
      log.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterLang === 'all') return matchesSearch;
    return log.lang.toLowerCase() === filterLang.toLowerCase() && matchesSearch;
  });

  // Handle PDF Upload
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        setUploadError('Only PDF files are supported.');
        setFile(null);
      } else {
        setFile(selected);
        setUploadError('');
        setUploadSuccess('');
      }
    }
  };

  const handlePdfUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(10); // Start progress bar

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result.split(',')[1];
          setUploadProgress(40);
          
          const res = await fetch('http://localhost:5001/api/admin/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfData: base64Data,
              filename: file.name
            })
          });
          
          setUploadProgress(80);
          const data = await res.json();
          if (res.ok && data.success) {
            setUploadSuccess(`Successfully trained! Chunked ${data.paragraphs} paragraphs and trained ${data.trained} vectors.`);
            setFile(null);
            setUploadProgress(100);
          } else {
            setUploadError(data.error || 'Failed to process and train the PDF document.');
            setUploadProgress(0);
          }
        } catch (err) {
          setUploadError('Connection to training server failed.');
          setUploadProgress(0);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadError('Failed reading selected file.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // --- LOGIN VIEW ---
  if (!auth) {
    return (
      <div className="admin-login-wrapper">
        <div className="auth-bg-grid" />
        <div className="glass-card admin-login-card">
          <div className="admin-login-header">
            <span className="admin-icon">🛡️</span>
            <h2>Agri-Opt Admin Terminal</h2>
            <p>Enter administrative credentials to access chatbot analytics</p>
          </div>
          
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="form-group">
              <label>Console Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error-message">⚠️ {error}</div>}
            <button type="submit" className="btn-primary login-btn">
              Authenticate Console
            </button>
          </form>
          
          <div className="admin-login-footer">
            <button className="btn-outline" onClick={() => setPage('home')}>
              ← Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  return (
    <div className="admin-dashboard-container">
      {/* Top Console Bar */}
      <div className="admin-topbar">
        <div className="admin-title">
          <span className="console-indicator">🟢</span>
          <h1>Agri-Opt Operations Dashboard</h1>
        </div>
        <div className="topbar-actions">
          <button className="btn-outline" onClick={() => setPage('home')}>
            🌾 Back to Client App
          </button>
          <button className="btn-primary logout-btn" onClick={handleLogout}>
            🔒 Lock Console
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="admin-analytics-grid">
        {/* KPI: Total Queries */}
        <div className="glass-card kpi-card">
          <div className="kpi-icon">💬</div>
          <div className="kpi-info">
            <span className="kpi-label">Total Questions Asked</span>
            <span className="kpi-value">{totalQuestions}</span>
            <span className="kpi-subtext">Across all user accounts</span>
          </div>
        </div>

        {/* KPI: Language Metrics */}
        <div className="glass-card kpi-card lang-metrics-card">
          <div className="kpi-icon">🗣️</div>
          <div className="kpi-info">
            <span className="kpi-label">Language Ratio</span>
            <div className="lang-bar-container">
              <div className="lang-progress-bar">
                <div 
                  className="bar-segment bar-en" 
                  style={{ width: `${englishPercent}%` }} 
                  title={`English: ${englishPercent}%`} 
                />
                <div 
                  className="bar-segment bar-ta" 
                  style={{ width: `${tamilPercent}%` }} 
                  title={`Tamil: ${tamilPercent}%`} 
                />
                <div 
                  className="bar-segment bar-hi" 
                  style={{ width: `${hindiPercent}%` }} 
                  title={`Hindi: ${hindiPercent}%`} 
                />
              </div>
              <div className="lang-legend">
                <span><span className="dot dot-en" /> English ({englishPercent}%)</span>
                <span><span className="dot dot-ta" /> Tamil ({tamilPercent}%)</span>
                <span><span className="dot dot-hi" /> Hindi ({hindiPercent}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI: Database / Knowledge Base */}
        <div className="glass-card kpi-card db-card">
          <div className="kpi-icon">📚</div>
          <div className="kpi-info">
            <span className="kpi-label">Vector Knowledge Base</span>
            <span className="kpi-value db-status-val">Online</span>
            <span className="kpi-subtext green-status">⚡ RAG Search Engine Active</span>
          </div>
        </div>
      </div>

      {/* PDF Upload and Training Panel */}
      <div className="glass-card train-kb-card">
        <h3>📚 Expand AI Knowledge Base</h3>
        <p className="train-desc">
          Upload reference books or documents (PDF format) about crops, soils, birds, or botanical guidelines. 
          The backend will split the PDF, generate vector embeddings using Gemini, and inject them into the RAG model.
        </p>
        
        <div className="train-controls">
          <div className="file-dropzone">
            <input 
              type="file" 
              id="pdf-file-upload" 
              accept=".pdf" 
              onChange={handleFileChange} 
              disabled={uploading}
            />
            <label htmlFor="pdf-file-upload" className="dropzone-label">
              <span>📄</span>
              {file ? <strong>Selected: {file.name}</strong> : 'Choose PDF document to teach AI...'}
            </label>
          </div>

          <button 
            className="btn-primary train-btn" 
            onClick={handlePdfUpload} 
            disabled={!file || uploading}
          >
            {uploading ? 'Embedding Knowledge...' : '🔥 Train AI model'}
          </button>
        </div>

        {uploading && (
          <div className="upload-progress-container">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="progress-text">Embedding text paragraphs into MongoDB: {uploadProgress}%</span>
          </div>
        )}

        {uploadSuccess && <div className="success-message">✅ {uploadSuccess}</div>}
        {uploadError && <div className="error-message">⚠️ {uploadError}</div>}
      </div>

      {/* Logs Table Area */}
      <div className="glass-card logs-table-card">
        <div className="table-header-row">
          <h3>💬 Chatbot Interactions Log</h3>
          <div className="table-filters">
            {/* Search Input */}
            <input 
              type="text" 
              className="input-field search-logs" 
              placeholder="Search user, question, reply..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Language filter pills */}
            <div className="filter-pills">
              {['all', 'English', 'Tamil', 'Hindi'].map(l => (
                <button
                  key={l}
                  className={`pill-btn ${filterLang === l ? 'active' : ''}`}
                  onClick={() => setFilterLang(l)}
                >
                  {l === 'all' ? 'All Languages' : l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="table-loading">
            <div className="spinner-sm" /> Loading console records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="table-empty">
            No chatbot interactions found matching your search.
          </div>
        ) : (
          <div className="logs-table-wrapper">
            <table className="agri-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User Profile</th>
                  <th>Language</th>
                  <th>User Question</th>
                  <th>AI Response</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td className="cell-time">
                      <div>{log.time.toLocaleDateString()}</div>
                      <div className="sub-time">{log.time.toLocaleTimeString()}</div>
                    </td>
                    <td className="cell-user">
                      <strong className="user-name-tag">@{log.username}</strong>
                      <div className="user-contact">📞 {log.phone}</div>
                      <div className="user-contact">📧 {log.email}</div>
                    </td>
                    <td className="cell-lang">
                      <span className={`lang-badge lang-${log.lang.toLowerCase()}`}>
                        {log.lang}
                      </span>
                    </td>
                    <td className="cell-question">
                      <div className="text-scroll">{log.question}</div>
                    </td>
                    <td className="cell-answer">
                      <div className="text-scroll ai-reply-text">{log.answer}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
