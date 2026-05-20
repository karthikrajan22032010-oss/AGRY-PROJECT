import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import './ChatBot.css';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

const SYSTEM_PROMPT = `You are an AI chatbot for this website. 
You must ONLY answer questions using the text from the "Flowering Trees" book provided below.

STRICT RULES:
1. DO NOT use your outside knowledge.
2. DO NOT search the internet like Google.
3. If the answer is NOT in the book text below, you must reply: "I am sorry, I only have information about the Flowering Trees book."
4. If the user asks in Tamil, answer in Tamil. If they ask in English, answer in English. If in Hindi, answer in Hindi.

Book Text:
- **Trees**:
  - *Gulmohur (Delonix regia)*: Crimson/scarlet flowers in huge clusters, fern-like bipinnate leaves. Blooms April-June.
  - *Flame of the Forest (Butea monosperma)*: Palas/Dhak. Bright orange-red flowers on leafless branches, looks like fire. Dyes and tanning.
  - *Indian Coral Tree (Erythrina indica)*: Mandar. Spiny branches, dense spikes of scarlet/red flowers. Blooms February-March.
  - *Golden Shower / Amaltas (Cassia fistula)*: Hanging yellow flowers, long cylindrical pods. Blooms April-May. Highly drought resistant.
  - *Pride of India (Lagerstroemia speciosa)*: Queen's Flower. Mauve/purple crinkled petals. Blooms April-June.
  - *Asoka Tree (Saraca asoca)*: True Asoka. Orange-scarlet fragrant clusters, lance-shaped leaves. Blooms February-April.
  - *Colville's Glory (Colvillea racemosa)*: Orange-scarlet flower buds like grape bunches. Blooms September-October.
  - *Kachnar (Bauhinia variegata)*: Orchid-like purple, pink, or white flowers, two-lobed camel-foot leaves. Edible flower buds.
  - *Pagoda Tree / Frangipani (Plumeria acutifolia)*: Champa. Sweet-scented white flowers with yellow centers, milky latex sap.
  - *Jacaranda (Jacaranda mimosaefolia)*: Mauve-blue tubular bells, delicate bipinnate leaves. Blooms March-May.
  - *Teak (Tectona grandis)*: Stately tree, massive leaves, white panicle flowers. Premium timber.
  - *Baobab (Adansonia digitata)*: Massive water-storing trunk, white hanging flowers. Extremely long-lived.
- **Shrubs & Flora**:
  - *Bougainvillea (Bougainvillea spectabilis)*: Woody climber with vibrant paper-like bracts (purple, magenta, orange, white).
  - *Hibiscus (Hibiscus rosa-sinensis)*: China Rose / Gudhal. Crimson blooms, serrated leaves. Used for hair care and worship.
  - *Jungle Flame (Ixora coccinea)*: Small shrubs with dense round heads of scarlet, yellow, or pink tubular flowers.
  - *Oleander (Nerium oleander)*: Kaner. Double/single pink or white fragrant flowers. Toxic latex, very hardy.
  - *Yellow Oleander (Thevetia neriifolia)*: Pila Kaner. Bell-shaped yellow fragrant flowers, lance-like leaves.`;

const QUICK_QUESTIONS = {
  en: [
    '🌸 Tell me about the Gulmohur tree.',
    '🔥 What is the Flame of the Forest?',
    '🏵 Tell me about the Asoka tree.',
    '🌼 What does the book say about Jacaranda?',
    '💮 Tell me about Pagoda/Frangipani tree.',
    '🌾 What is the Golden Shower / Amaltas?',
  ],
  ta: [
    '🌸 குல்மோஹர் மரம் பற்றி கூறவும்.',
    '🔥 காட்டு சுடர் (பிளேம் ஆஃப் தி பாரஸ்ட்) என்றால் என்ன?',
    '🏵 அசோக மரம் பற்றி கூறவும்.',
    '🌼 ஜகராண்டா பற்றி புத்தகம் என்ன கூறுகிறது?',
    '💮 சம்பா (பிராங்கிபானி) மரம் பற்றி கூறவும்.',
    '🌾 கொன்றை (அமல்தாஸ்) மரம் என்றால் என்ன?',
  ],
  hi: [
    '🌸 गुलमोहर पेड़ के बारे में बताएं।',
    '🔥 फ्लेम ऑफ द फॉरेस्ट क्या है?',
    '🏵 अशोक पेड़ के बारे में बताएं।',
    '🌼 जकारैंडा के बारे में पुस्तक क्या कहती है?',
    '💮 चम्पा (फ्रेंगिपानी) पेड़ के बारे में बताएं।',
    '🌾 अमलतास पेड़ क्या है?',
  ],
};

async function callGemini(messages) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 256,
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

// Global Agricultural Knowledge Base (Flowering Trees Book Strict Fallback)
function localFallback(q) {
  const lower = q.toLowerCase();
  
  // Keyword checking helpers
  const has = (k) => lower.includes(k);
  const isTa = () => /[\u0B80-\u0BFF]/.test(q) || has('tamil') || has('தமிழ்');
  const isHi = () => /[\u0900-\u097F]/.test(q) || has('hindi') || has('हिंदी');

  if (has('gulmohur') || has('gul mohr') || has('mayarum')) {
    if (isTa()) return '🌸 **டி. வி. கோவன் புத்தகக் குறிப்பு (மயிர் கொன்றை / Mayarum):**\n- தமிழ் பெயர்: **Mayarum** (மயிர் கொன்றை).\n- பூக்கும் காலம்: ஏப்ரல் முதல் ஜூன் வரை.\n- மலர்கள்: பிரகாசமான சிவப்பு மற்றும் ஆரஞ்சு நிறக் கொத்துகள்.';
    if (isHi()) return '🌸 **डी. वी. कोवेन पुस्तक संदर्भ (गुलमोहर):**\n- तमिल नाम: **Mayarum**।\n- फूल आने का समय: अप्रैल से जून।\n- विशेषताएं: बड़े समूहों में चमकीले लाल और नारंगी रंग के फूल।';
    return '🌸 **D. V. Cowen Botanical Reference (Gul Mohr):**\n- Tamil Name: **Mayarum**.\n- Botanical Name: *Delonix regia* (syn. *Poinciana regia*).\n- Blooming Season: April to June.\n- Flowers: Crimson or scarlet flowers in huge clusters.';
  }

  if (has('jack fruit') || has('jackfruit') || has('pila') || has('pilavu') || has('kanthal')) {
    if (isTa()) return '🌸 **டி. வி. கோவன் புத்தகக் குறிப்பு (பலா மரம் / Jackfruit):**\n- **பயன்கள்**: பழுக்காத காய்கள் சமைத்து உண்ணப்படுகின்றன; தேன்-பலா பழம் மிகவும் இனிமையானது. முதிர்ந்த விதைகள் வறுக்கப்படுகின்றன.\n- **விலங்கு தீவனம்**: பலா இலைகள் ஆடு மற்றும் மாடுகளுக்கு ஊட்டம் அளிக்கின்றன.\n- **மருத்துவ பயன்கள்**: இலைகள் புண்களுக்கு ஒத்தடம் கொடுக்கவும், இலை சாறு சுரப்பி வீக்கங்களை குணப்படுத்தவும் உதவுகிறது.\n- **இதர பயன்கள்**: பலா மரம் மரச்சாமான்கள் செய்ய உதவுகிறது. மலபாரின் நம்பூதிரி பிராமணர்கள் உலர்ந்த பலா மரக் குச்சிகளை உராய்ந்து புனித நெருப்பை உருவாக்குகிறார்கள்.';
    if (isHi()) return '🌸 **डी. वी. कोवेन पुस्तक संदर्भ (कटहल / Jackfruit):**\n- **उपयोग**: कच्चे फल सब्जी के रूप में पकाए जाते हैं; पका हुआ फल मीठा होता है। बीजों को भूनकर खाया जाता है।\n- **पशु चारा**: पत्तियां गाय और बकरियों को मोटा करने के लिए दी जाती हैं।\n- **औषधीय उपयोग**: पत्तियों का लेप घावों पर और रस ग्रंथियों की सूजन को कम करने में सहायक है।\n- **अन्य**: लकड़ी का उपयोग निर्माण कार्य में होता है। मालाबार के नंबूदिरी ब्राह्मण सूखी कटहल की टहनियों से पवित्र अग्नि उत्पन्न करते हैं।';
    return '🌸 **D. V. Cowen Botanical Reference (Jackfruit Tree):**\n- **Uses**: Unripe fruits are cooked as vegetables. Honey-jack variety is the sweetest. Mature seeds are roasted and eaten. \n- **Fodder**: Jackfruit leaves are used to fatten cattle and goats.\n- **Medicinal**: Leaves make a fomentation applied to wounds; leaf juice relieves gland swellings.\n- **Other Uses**: The timber is highly valued for building and cabinet work. Nambudri Brahmins of Malabar produce sacred fire by the friction of dry Jackfruit branches.';
  }

  if (has('flame of the forest') || has('asoka') || has('frangipani') || has('champa') || has('jacaranda') || has('kaner') || has('bougainvillea') || has('kachnar') || has('amaltas') || has('coral tree') || has('pride of india') || has('colville') || has('teak') || has('baobab') || has('hibiscus') || has('gudhal') || has('ixora')) {
    if (isTa()) return '🌸 **டி. வி. கோவன் புத்தகக் குறிப்பு (ஆஃப்லைன்):**\n- **குல்மோஹர்**: சித்திராபதி வண்ண மலர்கள், ஏப்ரல்-ஜூன் பூக்கும்.\n- **அசோக மரம்**: ஆரஞ்சு-சிவப்பு நறுமண மலர்கள்.\n- **சம்பா (பிராங்கிபானி)**: நறுமண வெள்ளை மலர்கள்.\n- **காஞ்சனார்**: ஒட்டகக் கால் வடிவ இலைகள், ஊதா/வெள்ளை பூக்கள்.';
    if (isHi()) return '🌸 **डी. वी. कोवेन पुस्तक संदर्भ (ऑफ़लाइन):**\n- **गुलमोहर**: अप्रैल-जून में लाल-नारंगी फूल आते हैं।\n- **अशोक**: सुगंधित लाल-नारंगी फूलों के गुच्छे।\n- **चम्पा (फ्रेंगिपानी)**: सुगंधित सफेद-पीले फूल।\n- **कचनार**: दो-तरफा ऊँट के पैर जैसे पत्ते, बैंगनी या सफेद फूल।';
    return '🌸 **D. V. Cowen Botanical Reference (Offline):**\n- **Gulmohur**: Crimson/scarlet flowers in huge clusters. Blooms April-June.\n- **Flame of the Forest**: Bright orange-red flowers cluster on leafless branches.\n- **Asoka Tree**: Sacred fragrant orange-scarlet clusters.\n- **Frangipani/Champa**: Fragrant white-yellow offering flowers.';
  }

  // Refusal for everything else
  if (isTa()) return 'மன்னிக்கவும், என்னிடம் பூக்கும் மரங்கள் புத்தகத்தைப் பற்றிய தகவல்கள் மட்டுமே உள்ளன.';
  if (isHi()) return 'मुझे खेद है, मेरे पास केवल फ्लावरिंग ट्री बुक के बारे में जानकारी है।';
  return 'I am sorry, I only have information about the Flowering Trees book.';
}

export default function ChatBot({ landData }) {
  const { t, lang, langClass } = useLang();
  const [open, setOpen] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // 🤖 Dynamic Intelligence Core (Flowering Trees Book Specialist)
  const intelligenceReport = {
    model: 'Flowering Trees Book Specialist (AI)',
    training: 'Flowering Trees & Shrubs in India by D. V. Cowen',
    lastUpdate: 'Strict Local Scope active',
    languages: 'English, Tamil (தமிழ்), Hindi (हिंदी)',
    specialty: 'Indian Flowering Trees, Shrubs & Flora Botany'
  };
  const getGreeting = (l) => {
    if (l === 'ta') return '👋 வணக்கம்! நான் உங்கள் **மலர் மற்றும் தாவர AI**. என்னிடம் டி. வி. கோவனின் "பூக்கும் மரங்கள்" புத்தகத்தைப் பற்றி எதையும் கேளுங்கள்.';
    if (l === 'hi') return '👋 नमस्ते! मैं आपका **पुष्प और वृक्ष AI** हूँ। मुझसे डी. वी. कोवेन की "फ्लावरिंग ट्रीज़" पुस्तक के बारे में कुछ भी पूछें।';
    return '👋 Hello! I am your **Flowering Trees & Botany AI**. Ask me anything about D. V. Cowen\'s book "Flowering Trees & Shrubs in India".';
  };

  const currentUser = JSON.parse(localStorage.getItem('agri_currentUser') || '{}');
  const username = currentUser.username || 'guest';

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: getGreeting(lang),
    time: new Date(),
  }]);

  // Load chat history from MongoDB on mount/user change
  useEffect(() => {
    const fetchHistory = async () => {
      if (!username || username === 'guest') return;
      try {
        const res = await fetch(`http://localhost:5001/api/chat/${username}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setMessages(data.map(m => ({ ...m, time: new Date(m.time) })));
          }
        }
      } catch (err) {
        console.warn('Failed to load chat history from database:', err);
      }
    };
    fetchHistory();
  }, [username]);

  // Save helper to store message in database
  const saveMessageToDb = async (role, content) => {
    if (!username || username === 'guest') return;
    try {
      await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role, content, time: new Date() })
      });
    } catch (err) {
      console.warn('Failed to save message to database:', err);
    }
  };

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1) {
        return [{ ...prev[0], content: getGreeting(lang) }];
      }
      return prev;
    });
  }, [lang]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);

  const isVideoCallRef = useRef(isVideoCall);
  const isListeningRef = useRef(isListening);
  const langRef = useRef(lang);
  const loadingRef = useRef(loading);

  useEffect(() => { isVideoCallRef.current = isVideoCall; }, [isVideoCall]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const startVideoCall = async () => {
    setIsVideoCall(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240 }, 
        audio: true 
      });
      streamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Auto-start voice recognition in video call
      setTimeout(() => {
        if (recognitionRef.current && !isListening) {
          recognitionRef.current.lang = lang === 'ta' ? 'ta-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (err) {
            console.warn('Recognition auto-start failed:', err);
          }
        }
      }, 800);
    } catch (err) {
      console.warn("Camera/Mic access denied:", err);
    }
  };

  const stopVideoCall = () => {
    setIsVideoCall(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (speakingId !== null) {
      synthRef.current.cancel();
      setSpeakingId(null);
    }
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {}
      setIsListening(false);
    }
  };

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
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

    const handleSpeechEnd = () => {
      setSpeakingId(null);
      if (isVideoCallRef.current) {
        setTimeout(() => {
          if (recognitionRef.current && !isListeningRef.current && !loadingRef.current) {
            recognitionRef.current.lang = langRef.current === 'ta' ? 'ta-IN' : langRef.current === 'hi' ? 'hi-IN' : 'en-IN';
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch (err) {
              console.warn("Recognition start fail:", err);
            }
          }
        }, 600);
      }
    };

    utter.onend = handleSpeechEnd;
    utter.onerror = handleSpeechEnd;

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

      let reply = '';
      let savedByBackend = false;
      try {
        const response = await fetch('http://localhost:5001/api/bot/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, message: q, history: apiMessages })
        });
        if (response.ok) {
          const resData = await response.json();
          reply = resData.reply;
          savedByBackend = true;
        } else {
          throw new Error('Backend RAG failed');
        }
      } catch (backendErr) {
        console.warn('Backend RAG failed, calling Gemini directly:', backendErr);
        saveMessageToDb('user', q);
        reply = await callGemini(apiMessages);
      }

      const newMsg = { role: 'assistant', content: reply, time: new Date() };
      setMessages(prev => [...prev, newMsg]);
      
      if (!savedByBackend) {
        saveMessageToDb('assistant', reply);
      }

      // Automatic Voice Assistant Response
      if (fromVoice || isVoiceMode || isVideoCall) {
        setTimeout(() => speakMessage(reply, history.length), 300);
        setIsVoiceMode(false);
      }
    } catch (err) {
      console.error('Gemini error:', err);
      saveMessageToDb('user', q);
      const fallback = localFallback(q);
      const newMsg = { role: 'assistant', content: fallback, time: new Date(), isFallback: true };
      setMessages(prev => [...prev, newMsg]);
      saveMessageToDb('assistant', fallback);
      if (fromVoice || isVoiceMode || isVideoCall) {
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
            <div className="header-info">
              <div className="bot-avatar">🤖</div>
              <div>
                <h3 className="bot-name">AGRI-OPT Hyper-AI</h3>
                <div className="bot-status">
                  <span className="online-dot" /> 
                  Online
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                className={`video-call-btn-header ${isVideoCall ? 'active' : ''}`}
                onClick={isVideoCall ? stopVideoCall : startVideoCall}
                title="Start Video Call with AI"
                style={{
                  background: isVideoCall ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 255, 100, 0.1)',
                  border: `1px solid ${isVideoCall ? '#ef4444' : 'var(--border-green)'}`,
                  color: isVideoCall ? '#ff4d4d' : 'var(--green-primary)',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                {isVideoCall ? '⏹️ End' : '📹 Call'}
              </button>
              <button className="chat-close" onClick={() => { stopVideoCall(); setOpen(false); }}>×</button>
            </div>
          </div>

          {isVideoCall ? (
            <div className="chat-video-call-container">
              {/* Virtual AI Avatar */}
              <div className="video-avatar-main">
                <div className={`avatar-glow-ring ${speakingId !== null ? 'pulse-speaking' : loading ? 'pulse-loading' : isListening ? 'pulse-listening' : ''}`} />
                <div className="avatar-face">
                  <div className="avatar-eye left"></div>
                  <div className="avatar-eye right"></div>
                  <div className="avatar-mouth"></div>
                </div>
                <div className="video-call-status">
                  {speakingId !== null ? (lang === 'ta' ? 'AI பேசுகிறது...' : lang === 'hi' ? 'AI बोल रहा है...' : 'AI Speaking...') :
                   loading ? (lang === 'ta' ? 'AI யோசிக்கிறது...' : lang === 'hi' ? 'AI सोच रहा है...' : 'AI Thinking...') :
                   isListening ? (lang === 'ta' ? 'கேட்கிறது... பேசுங்கள்' : lang === 'hi' ? 'सुन रहा है... बोलिए' : 'Listening... Speak now') :
                   (lang === 'ta' ? 'தயாராக உள்ளது' : lang === 'hi' ? 'तैयार है' : 'Ready')}
                </div>
              </div>

              {/* Local User Pip (Webcam) */}
              <div className="video-user-pip">
                <video ref={localVideoRef} autoPlay playsInline muted className="pip-video-feed" />
                <span className="pip-label">You</span>
              </div>

              {/* Speech Subtitles Text */}
              <div className="video-subtitles">
                {messages[messages.length - 1] && (
                  <p className="subtitle-text">
                    <strong>{messages[messages.length - 1].role === 'user' ? (lang === 'ta' ? 'நீங்கள்: ' : lang === 'hi' ? 'आप: ' : 'You: ') : 'AI: '}</strong>
                    {messages[messages.length - 1].content.slice(0, 100)}
                    {messages[messages.length - 1].content.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="video-call-controls">
                <button className={`video-control-btn voice-btn ${isListening ? 'listening' : ''}`} onClick={toggleListen}>
                  {isListening ? '🎙️ Mic Active' : '🔇 Mic Muted'}
                </button>
                <button className="video-control-btn end-btn" onClick={stopVideoCall}>
                  🚪 Hang Up
                </button>
              </div>
            </div>
          ) : (
            <>
              {showCredentials && (
                <div className="intelligence-panel" style={{ animation: 'slideInDown 0.4s ease' }}>
                  <h4>🧬 AI Intelligence Core</h4>
                  <div className="intel-grid">
                    <div className="intel-item"><span>Engine:</span> <strong>{intelligenceReport.model}</strong></div>
                    <div className="intel-item"><span>Knowledge:</span> <strong>Google Search & Books</strong></div>
                    <div className="intel-item"><span>Training:</span> <strong>Multi-modal Agri Expert</strong></div>
                    <div className="intel-item"><span>Status:</span> <strong className="neon">Verified</strong></div>
                  </div>
                </div>
              )}

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
                      <div className="searching-status">🔍 Searching Google Knowledge Base...</div>
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
            </>
          )}
        </div>
      )}
    </>
  );
}
