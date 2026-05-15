import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import './ChatBot.css';

const GEMINI_KEY = 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

const SYSTEM_PROMPT = `You are the Agri-Opt Professional AI Assistant — a world-class agricultural scientist and field expert.
Your training includes:
- **Expert Diagnostics**: Analyze descriptions of leaves, stems, or soil to diagnose pests (like stem borer, whitefly) or diseases (blight, rust).
- **Precision Fertilization**: Provide exact NPK ratios and organic alternatives (Panchagavya, Jeevamrutha) based on crop stages.
- **Water Wisdom**: Expert on Drip, Sprinkler, and Solar-pumping systems. Advise on water conservation.
- **Market Intelligence**: Guide on MSP, current mandi trends, and post-harvest storage.
- **Regional Specialization**:
  - South India: Deep knowledge of Cauvery Delta, Western Ghats, and dryland farming in TN.
  - North India: Expertise in Wheat-Rice cycles, Sugarcane belts, and organic farming in hilly regions.
- **Government Liaison**: Expert on PM-KISAN, e-NAM, and state-specific subsidies.

**Tone & Language**:
- Be professional, empathetic, and highly actionable.
- TRILINGUAL MASTERY: 
  - If the user writes in TAMIL, respond in professional yet accessible Tamil (தமிழ்).
  - If the user writes in HINDI, respond in professional Hindi (हिंदी).
  - Otherwise, respond in English.
- Use bullet points for steps and bold text for key terms.
- Always encourage sustainable and high-yield practices.`;

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

// Local fallback for common queries (A-Z Trilingual)
function localFallback(q) {
  const lower = q.toLowerCase();
  
  // English Keywords
  const isEn = (k) => lower.includes(k);
  // Tamil Keywords
  const isTa = (k) => lower.includes(k) || /[\u0B80-\u0BFF]/.test(q);
  // Hindi Keywords
  const isHi = (k) => lower.includes(k) || /[\u0900-\u097F]/.test(q);

  if (isEn('paddy') || isEn('rice') || isTa('நெல்') || isHi('धान')) {
    return '🌾 **Paddy/Rice Guide:**\n- Water: 1200-1500mm total\n- Fertilizer: 100:50:50 NPK kg/ha\n- Pest: Stem borer — use Chlorantraniliprole\n- Season: Kharif (June), Rabi (Nov)';
  }
  
  if (isEn('soil') || isTa('மண்') || isHi('मिट्टी')) {
    return '🪨 **Soil Health:**\n- Red Soil: Good for groundnut/millets. Needs organic matter.\n- Black Soil: Holds water well. Best for cotton/wheat.\n- Loamy: Perfect for most crops. Keep pH 6.5-7.5.';
  }

  if (isEn('pest') || isEn('insect') || isTa('பூச்சி') || isHi('कीट')) {
    return '🐛 **Pest Control:**\n- Organic: Neem oil (3ml/L) or Ginger-Garlic extract.\n- Chemical: Consult local AO before using pesticides.\n- Traps: Use yellow sticky traps for whitefly.';
  }

  if (isEn('scheme') || isEn('subsidy') || isTa('திட்டம்') || isHi('योजना')) {
    return '📊 **Govt Schemes:**\n- PM-KISAN: ₹6000/year for landholders.\n- PMFBY: Crop insurance against natural disasters.\n- KCC: Low-interest loans for farmers.';
  }

  if (isEn('water') || isEn('drip') || isTa('தண்ணீர்') || isHi('पानी')) {
    return '💧 **Water Management:**\n- Drip Irrigation: Saves 40-70% water.\n- Fertigation: Mix fertilizer in drip for better yield.\n- Timing: Water in early morning to reduce evaporation.';
  }

  return '🤖 I am your Agri AI Assistant. I can help with crops, soil, water, and pests in English, Tamil, and Hindi! (Limited mode: API Offline)';
}

export default function ChatBot({ landData }) {
  const { t, lang, langClass } = useLang();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hello! I am your **Agri-Opt Pro Voice Assistant**. I\'ve analyzed your land data and I\'m ready to help!\n\n**Training & Skills:**\n🌾 Precision Crop Selection\n💧 Smart Irrigation & Drip Systems\n🪨 Expert Soil Health (NPK/Organic)\n📊 Live Market Prices & Govt Schemes\n🎤 **Voice Mode**: Speak to me in **English, தமிழ், or हिंदी!**\n\nTry clicking the 🎤 icon to start a voice conversation!',
      time: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        setIsVoiceMode(true); // Flag that this is a voice interaction
        // Automatically send after a short delay
        setTimeout(() => send(transcript, true), 500);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
        synthRef.current.cancel(); // Stop any current speech
      } else {
        alert("Speech recognition not supported in this browser.");
      }
    }
  };

  const detectLanguage = (text) => {
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta-IN';
    if (/[\u0900-\u097F]/.test(text)) return 'hi-IN';
    return 'en-IN';
  };

  const speakMessage = (text, id) => {
    if (speakingId === id && id !== null) {
      synthRef.current.cancel();
      setSpeakingId(null);
      return;
    }

    synthRef.current.cancel();
    const cleanText = text.replace(/\*\*/g, '').replace(/🌾|💧|🪨|🐛|🌦|📈|👋|🤖/g, '');
    const utter = new SpeechSynthesisUtterance(cleanText);
    const langCode = detectLanguage(text);
    utter.lang = langCode;

    // Find best voice for the language
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0])) || voices.find(v => v.lang.startsWith('en'));
    if (voice) utter.voice = voice;

    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);

    if (id !== null) setSpeakingId(id);
    synthRef.current.speak(utter);
  };

  const send = async (text, fromVoice = false) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');

    const userMsg = { role: 'user', content: q, time: new Date() };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      const contextQ = landData
        ? `[Land Context: ${landData.soilType}, ${landData.slope}, ${landData.locationName || 'Tamil Nadu'}, Crops: ${landData.crops?.join(', ') || 'not specified'}]\n\n${q}`
        : q;

      const apiMessages = [
        ...messages.filter(m => m.role !== 'system').slice(-8),
        { role: 'user', content: contextQ },
      ];

      const reply = await callGemini(apiMessages);
      const newMsg = { role: 'assistant', content: reply, time: new Date() };
      setMessages(prev => [...prev, newMsg]);
      
      // Automatic Voice Assistant Response
      if (fromVoice || isVoiceMode) {
        setTimeout(() => speakMessage(reply, history.length), 300);
        setIsVoiceMode(false);
      }
    } catch (err) {
      console.error('Gemini error:', err);
      const fallback = localFallback(q);
      const newMsg = { role: 'assistant', content: fallback, time: new Date(), isFallback: true };
      setMessages(prev => [...prev, newMsg]);
      if (fromVoice || isVoiceMode) {
        setTimeout(() => speakMessage(fallback, history.length), 300);
        setIsVoiceMode(false);
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

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
                  <div className="msg-content-wrapper">
                    <div className="msg-content">
                      {renderMessage(msg.content)}
                    </div>
                    {msg.role === 'assistant' && (
                      <button 
                        className={`msg-speaker ${speakingId === i ? 'speaking' : ''}`} 
                        onClick={() => speakMessage(msg.content, i)}
                        title="Listen"
                      >
                        {speakingId === i ? '⏹️' : '🔊'}
                      </button>
                    )}
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
            <button 
              className={`voice-input-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleListen}
              title={isListening ? "Stop listening" : "Voice input"}
              disabled={loading}
            >
              {isListening ? '🛑' : '🎤'}
            </button>
            <textarea
              ref={inputRef}
              id="chatbot-input"
              className="chat-input"
              placeholder={isListening ? "Listening..." : t('typeMessage')}
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
