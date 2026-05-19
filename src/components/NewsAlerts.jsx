import React from 'react';
import { useLang } from '../context/LangContext';
import './NewsAlerts.css';

const NEWS_DATA = {
  en: [
    { id: 1, type: 'alert', title: '🌧 Heavy Rain Alert', desc: 'Thoothukudi & Madurai expect heavy rainfall in 24h. Secure seeds.', date: 'Live' },
    { id: 2, type: 'news', title: '📈 New Paddy Support Price', desc: 'Government announces 7% increase in MSP for Kharif season.', date: 'Today', img: '🌾' },
    { id: 3, type: 'video', title: '📺 Drip Irrigation Guide', desc: 'Watch how to save 40% water using new smart sensors.', date: '2h ago', link: 'https://www.youtube.com/watch?v=JmPZt5xS0f8' }
  ],
  ta: [
    { id: 1, type: 'alert', title: '🌧 கனமழை எச்சரிக்கை', desc: 'தூத்துக்குடி மற்றும் மதுரையில் 24 மணி நேரத்தில் கனமழை எதிர்பார்க்கப்படுகிறது.', date: 'நேரலை' },
    { id: 2, type: 'news', title: '📈 புதிய நெல் ஆதரவு விலை', desc: 'காரீப் பருவத்திற்கான குறைந்தபட்ச ஆதரவு விலையில் 7% உயர்வு.', date: 'இன்று', img: '🌾' },
    { id: 3, type: 'video', title: '📺 சொட்டு நீர் பாசன வழிகாட்டி', desc: 'ஸ்மார்ட் சென்சார்களைப் பயன்படுத்தி 40% தண்ணீரை சேமிப்பது எப்படி.', date: '2 மணி முன்', link: 'https://www.youtube.com/watch?v=JmPZt5xS0f8' }
  ],
  hi: [
    { id: 1, type: 'alert', title: '🌧 भारी बारिश की चेतावनी', desc: 'तूतीकोरिन और मदुरै में 24 घंटे में भारी बारिश की संभावना।', date: 'लाइव' },
    { id: 2, type: 'news', title: '📈 नया धान समर्थन मूल्य', desc: 'खरीफ सीजन के लिए एमएसपी में 7% की वृद्धि की घोषणा।', date: 'आज', img: '🌾' },
    { id: 3, type: 'video', title: '📺 ड्रिप सिंचाई गाइड', desc: 'नए स्मार्ट सेंसर का उपयोग करके 40% पानी बचाने का तरीका देखें।', date: '2 घंटे पहले', link: 'https://www.youtube.com/watch?v=JmPZt5xS0f8' }
  ]
};

export default function NewsAlerts() {
  const { lang } = useLang();
  const news = NEWS_DATA[lang] || NEWS_DATA.en;

  return (
    <div className="news-alerts-container">
      {/* Top Ticker Alert */}
      <div className="news-ticker">
        <div className="ticker-label">⚠️ EMERGENCY ALERTS</div>
        <div className="ticker-content">
          <span className="ticker-item">{news[0].title}: {news[0].desc}</span>
          <span className="ticker-item">{news[0].title}: {news[0].desc}</span>
        </div>
      </div>

      <div className="news-grid">
        {news.slice(1).map(item => (
          <div 
            key={item.id} 
            className={`news-card ${item.type} ${item.link ? 'clickable' : ''}`}
            onClick={() => item.link && window.open(item.link, '_blank')}
            style={item.link ? { cursor: 'pointer' } : {}}
          >
            <div className="news-badge">{item.type.toUpperCase()}</div>
            <div className="news-body">
              <div className="news-media">
                {item.type === 'video' ? '▶️' : item.img || '📰'}
              </div>
              <div className="news-info">
                <h4 className="news-title">{item.title}</h4>
                <p className="news-desc">{item.desc}</p>
                <span className="news-date">{item.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
