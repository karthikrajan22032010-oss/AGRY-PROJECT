import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import './ChatBot.css';

const GEMINI_KEY = 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

const SYSTEM_PROMPT = `You are Agri AI Assistant — an expert agricultural advisor for Indian farmers.
You specialize in:
- Crop planning, selection, and rotation for all Indian climates
- Soil health, fertilizer recommendations (NPK, organic, bio-fertilizers)
- Irrigation methods: drip, sprinkler, flood, furrow
- Pest and disease management with organic and chemical solutions
- Weather impact on crops and farm activities
- Land measurement and valuation
- Government schemes for farmers (PM-KISAN, PMFBY, etc.)
- Tamil Nadu specific farming: Cauvery Delta, Coimbatore, Salem
- Water conservation and rainwater harvesting
- Organic farming and natural farming (Zero Budget Natural Farming)
- Market prices, MSP (Minimum Support Price)

Respond helpfully in the language the user writes in (Tamil, Hindi, or English).
Keep responses practical, actionable, and farmer-friendly.
If asked in Tamil, respond in Tamil. If Hindi, respond in Hindi. Default English.`;

const QUICK_QUESTIONS = {
  en: [
    '🌾 Which crops suit Red Loamy soil?',
    '💧 How much water does Paddy need?',
    '🌦 Will rain affect my crop this week?',
    '🪨 Best fertilizer for Black Cotton soil?',
    '🐛 How to control pests organically?',
    '📈 Current MSP for Wheat?',
  ],
  ta: [
    '🌾 சிவப்பு மண்ணுக்கு எந்த பயிர்?',
    '💧 நெல்லுக்கு எவ்வளவு தண்ணீர்?',
    '🌦 இந்த வாரம் மழை பயிரை பாதிக்குமா?',
    '🪨 கருப்பு மண்ணுக்கு சிறந்த உரம்?',
    '🐛 இயற்கையாக பூச்சியை கட்டுப்படுத்துவது எப்படி?',
    '📈 கோதுமை MSP என்ன?',
  ],
  hi: [
    '🌾 लाल मिट्टी में कौन सी फसल उगाएं?',
    '💧 धान को कितना पानी चाहिए?',
    '🌦 क्या इस हफ्ते बारिश फसल को नुकसान करेगी?',
    '🪨 काली मिट्टी के लिए सबसे अच्छा उर्वरक?',
    '🐛 जैविक तरीके से कीट नियंत्रण कैसे करें?',
    '📈 गेहूं का MSP क्या है?',
  ],
};

async function callGemini(messages) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, no response generated.';
}

// Local fallback for common queries
function localFallback(q) {
  const lower = q.toLowerCase();
  if (lower.includes('paddy') || lower.includes('rice') || lower.includes('நெல்')) {
    return '🌾 **Paddy Requirements:**\n- Water: 6-8 L/hour during growing season\n- Fertilizer: Urea 100kg + SSP 250kg + MOP 60kg per acre\n- Season: Kuruvai (June-Sep), Samba (Aug-Jan), Thaladi (Nov-Mar)\n- Pest: Brown Plant Hopper — use Buprofezin 25% SC @ 400ml/acre';
  }
  if (lower.includes('fertilizer') || lower.includes('உரம்') || lower.includes('उर्वरक')) {
    return '🌱 **General Fertilizer Guide:**\n- NPK 17:17:17 — All purpose @ 50kg/acre\n- Organic: FYM 5 tonnes/acre before planting\n- Bio-fertilizer: Azospirillum + Phosphobacteria @ 600g each\n- Micro-nutrients: Zinc 10kg + Boron 2kg/acre';
  }
  if (lower.includes('water') || lower.includes('irrigation') || lower.includes('தண்ணீர்') || lower.includes('पानी')) {
    return '💧 **Irrigation Guide:**\n- Drip Irrigation: Best for vegetables, fruits — 40% water savings\n- Sprinkler: Good for wheat, groundnut\n- Flood: Traditional for paddy\n- Schedule: Morning 6-8 AM or Evening 4-6 PM preferred\n- Avoid watering during peak sun (11AM-2PM)';
  }
  if (lower.includes('soil') || lower.includes('மண்') || lower.includes('मिट्टी')) {
    return '🪨 **Soil Management:**\n- Test soil every 3 years (Free at Soil Health Card centers)\n- Red Loamy: pH 5.5-6.5 — Good for groundnut, millets\n- Black Cotton: pH 7-8 — Good for cotton, wheat, sorghum\n- Add FYM/Compost 5T/acre to improve fertility\n- Vermicompost: 2T/acre for organic farms';
  }
  return '🤖 I\'m your Agri AI Assistant. Ask me about crops, soil, irrigation, fertilizers, pest management, weather impacts, or government schemes for farmers. I can respond in English, Tamil (தமிழ்), or Hindi (हिंदी)!';
}

export default function ChatBot({ landData }) {
  const { t, lang, langClass } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hello! I am your **Agri AI Assistant**. I\'ve analyzed your land data and I\'m ready to help!\n\nAsk me about:\n🌾 Crop selection & planning\n💧 Irrigation & water management\n🪨 Soil health & fertilizers\n🌦 Weather impact on crops\n📊 Market prices & government schemes\n\nI can respond in **English**, **தமிழ்**, or **हिंदी**!',
      time: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');

    const userMsg = { role: 'user', content: q, time: new Date() };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      // Add land context to first real message
      const contextQ = landData
        ? `[Land Context: ${landData.soilType}, ${landData.slope}, ${landData.locationName || 'Tamil Nadu'}, Crops: ${landData.crops?.join(', ') || 'not specified'}]\n\n${q}`
        : q;

      const apiMessages = [
        ...messages.filter(m => m.role !== 'system').slice(-8),
        { role: 'user', content: contextQ },
      ];

      const reply = await callGemini(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, time: new Date() }]);
    } catch (err) {
      console.error('Gemini error:', err);
      // Use local fallback
      const fallback = localFallback(q);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: fallback, time: new Date(), isFallback: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const renderMessage = (content) => {
    // Basic markdown: **bold**, \n newlines, bullet points
    const lines = content.split('\n');
    return lines.map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <div key={i} className={line.startsWith('- ') || line.startsWith('🌾') || line.startsWith('💧') || line.startsWith('🪨') ? 'chat-bullet' : 'chat-line'} dangerouslySetInnerHTML={{ __html: bold }} />;
    });
  };

  const quickQuestions = QUICK_QUESTIONS[lang] || QUICK_QUESTIONS.en;

  return (
    <>
      {/* Floating Button */}
      <button
        id="btn-chatbot-open"
        className={`chatbot-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI Chat"
      >
        {open ? '✕' : '🤖'}
        {!open && <span className="fab-label">Agri AI</span>}
        {!open && messages.length > 1 && <span className="fab-badge">{messages.length - 1}</span>}
      </button>

      {/* Chat Window */}
      {open && (
        <div className={`chatbot-window ${langClass}`}>
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="chat-avatar">🤖</div>
              <div>
                <div className="chat-title">{t('aiAssistant')}</div>
                <div className="chat-status" id="chat-status-indicator">
                  <span className="status-dot" />
                  <span>AI Online • Gemini 2.0 Flash</span>
                </div>
              </div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} id="btn-chatbot-close">✕</button>
          </div>

          {/* Quick Questions */}
          <div className="chat-quick">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                id={`quick-q-${i}`}
                className="quick-q-btn"
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="msg-avatar">🤖</div>
                )}
                <div className="msg-bubble">
                  <div className="msg-content">
                    {renderMessage(msg.content)}
                  </div>
                  {msg.isFallback && (
                    <div className="fallback-note">📴 Local response (API quota reached)</div>
                  )}
                  <div className="msg-time">
                    {msg.time?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                <div className="msg-avatar">🤖</div>
                <div className="msg-bubble">
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              id="chatbot-input"
              className="chat-input"
              placeholder={t('typeMessage')}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              id="btn-chat-send"
              className="chat-send-btn"
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              {loading ? <span className="spinner-sm" /> : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
