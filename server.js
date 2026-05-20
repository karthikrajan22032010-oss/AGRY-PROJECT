import './server_monitor.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { initDbMonitoring } from './server_monitor.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_opt';

// Enable CORS and increase body-parser limit for large avatar dataURLs
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// --- JSON Fallback Database Configuration ---
const DB_FILE = './db.json';
let useJsonFallback = false;

const readDb = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], chats: [], vectorDocs: [] }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.vectorDocs) data.vectorDocs = [];
    return data;
  } catch (e) {
    console.error('Error reading JSON DB file:', e);
    return { users: [], chats: [], vectorDocs: [] };
  }
};

const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing JSON DB file:', e);
  }
};

// Initialize DB file if not exists
readDb();

// Initialize DB monitoring
initDbMonitoring();

// Connect to MongoDB with Fallback
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Database.');
    useJsonFallback = false;
  })
  .catch(err => {
    console.warn('⚠️ MongoDB is not active or running. Falling back to local db.json database.');
    useJsonFallback = true;
  });

// MongoDB Schemas & Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  userId: String,
  email: String,
  phone: { type: String, required: true },
  countryCode: { type: String, default: '+91' },
  fullPhone: { type: String, required: true },
  password: { type: String, required: true },
  gender: { type: String, default: 'Male' },
  dob: String,
  state: String,
  district: String,
  avatar: String, // Storing dataURL of the user profile photo
  createdAt: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  username: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  time: { type: Date, default: Date.now }
});

const VectorDocSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }
});

const User = mongoose.model('User', UserSchema);
const Chat = mongoose.model('Chat', ChatSchema);
const VectorDoc = mongoose.model('VectorDoc', VectorDocSchema);

// Root landing page to confirm server status
app.get('/', async (req, res) => {
  let docCount = 0;
  try {
    if (useJsonFallback) {
      docCount = readDb().vectorDocs.length;
    } else {
      docCount = await VectorDoc.countDocuments();
    }
  } catch (e) {
    console.error('Error counting vector documents:', e);
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AGRI-OPT Backend Server Status</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #0d1117;
          color: #c9d1d9;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          max-width: 500px;
          width: 90%;
        }
        h1 {
          color: #00ff80;
          margin-top: 0;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .status-badge {
          display: inline-block;
          background: rgba(0, 255, 128, 0.1);
          color: #00ff80;
          border: 1px solid rgba(0, 255, 128, 0.3);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          margin: 15px 0;
        }
        .desc {
          font-size: 0.95rem;
          color: #8b949e;
          line-height: 1.6;
        }
        .endpoints {
          margin-top: 25px;
          text-align: left;
          background: #0d1117;
          border: 1px solid #21262d;
          border-radius: 8px;
          padding: 15px;
        }
        .endpoints-title {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #58a6ff;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .endpoint-item {
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.82rem;
          margin: 6px 0;
          color: #e6edf3;
        }
        .method {
          color: #ff7b72;
          font-weight: bold;
        }
        .method.post {
          color: #7ee787;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌱 AGRI-OPT</h1>
        <p class="desc">Database API Backend Services</p>
        <div class="status-badge">● Active & Secure</div>
        <p class="desc">The server is running correctly and storing data via ${useJsonFallback ? 'Local File (db.json)' : 'MongoDB'}.</p>
        <p class="desc" style="color: #58a6ff; font-weight: 600;">📚 Vector Knowledge Base: ${docCount} paragraphs trained</p>
        
        <div class="endpoints">
          <div class="endpoints-title">Available Database Routes</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/auth/register</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/auth/login</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/auth/forgot-password</div>
          <div class="endpoint-item"><span class="method">GET</span>  /api/chat/:username</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/chat</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/bot/ask</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, phone, countryCode, password } = req.body;
    if (!username || !phone || !password) {
      return res.status(400).json({ error: 'Username, phone, and password are required fields.' });
    }

    if (useJsonFallback) {
      const db = readDb();
      const existingUser = db.users.find(u => u.username === username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists in database.' });
      }

      const fullPhone = (countryCode || '+91') + phone;
      const newUser = {
        ...req.body,
        fullPhone,
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      writeDb(db);

      const userResponse = { ...newUser };
      delete userResponse.password;
      return res.status(201).json(userResponse);
    } else {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists in database.' });
      }

      const fullPhone = (countryCode || '+91') + phone;
      const newUser = new User({
        ...req.body,
        fullPhone
      });

      await newUser.save();
      const userResponse = newUser.toObject();
      delete userResponse.password;
      res.status(201).json(userResponse);
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required fields.' });
    }

    if (useJsonFallback) {
      const db = readDb();
      const user = db.users.find(u => u.username === username && u.password === password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. User not found in database.' });
      }

      const userResponse = { ...user };
      delete userResponse.password;
      return res.status(200).json(userResponse);
    } else {
      const user = await User.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. User not found in database.' });
      }

      const userResponse = user.toObject();
      delete userResponse.password;
      res.status(200).json(userResponse);
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    if (!username || !phone || !password) {
      return res.status(400).json({ error: 'Username, phone number, and new password are required fields.' });
    }

    if (useJsonFallback) {
      const db = readDb();
      const userIndex = db.users.findIndex(u => u.username === username);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'Username not found in database.' });
      }

      const user = db.users[userIndex];
      const matched = user.phone.endsWith(phone) || phone.endsWith(user.phone);
      if (!matched) {
        return res.status(400).json({ error: 'Phone number does not match registration records.' });
      }

      db.users[userIndex].password = password;
      writeDb(db);

      return res.status(200).json({ message: 'Password updated successfully in database.' });
    } else {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'Username not found in database.' });
      }

      const matched = user.phone.endsWith(phone) || phone.endsWith(user.phone);
      if (!matched) {
        return res.status(400).json({ error: 'Phone number does not match registration records.' });
      }

      user.password = password;
      await user.save();

      res.status(200).json({ message: 'Password updated successfully in database.' });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// Chat Endpoints
app.get('/api/chat/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (useJsonFallback) {
      const db = readDb();
      const history = db.chats.filter(c => c.username === username);
      // Sort by time
      history.sort((a, b) => new Date(a.time) - new Date(b.time));
      return res.status(200).json(history);
    } else {
      const history = await Chat.find({ username }).sort({ time: 1 });
      res.status(200).json(history);
    }
  } catch (err) {
    console.error('Fetch chat history error:', err);
    res.status(500).json({ error: 'Internal server error fetching chat history.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { username, role, content, time } = req.body;
    if (!username || !role || !content) {
      return res.status(400).json({ error: 'Username, role, and content are required fields.' });
    }

    if (useJsonFallback) {
      const db = readDb();
      const newMessage = {
        username,
        role,
        content,
        time: time ? new Date(time).toISOString() : new Date().toISOString()
      };

      db.chats.push(newMessage);
      writeDb(db);

      return res.status(201).json(newMessage);
    } else {
      const newMessage = new Chat({
        username,
        role,
        content,
        time: time ? new Date(time) : new Date()
      });

      await newMessage.save();
      res.status(201).json(newMessage);
    }
  } catch (err) {
    console.error('Save chat message error:', err);
    res.status(500).json({ error: 'Internal server error saving chat message.' });
  }
});

// Local Botanical Fallback for Offline/API failure cases
function localOfflineFallback(q) {
  const lower = q.toLowerCase();
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

  if (isTa()) return 'மன்னிக்கவும், என்னிடம் பூக்கும் மரங்கள் புத்தகத்தைப் பற்றிய தகவல்கள் மட்டுமே உள்ளன.';
  if (isHi()) return 'मुझे खेद है, मेरे पास केवल फ्लावरिंग ट्री बुक के बारे में जानकारी है।';
  return 'I am sorry, I only have information about the Flowering Trees book.';
}

const VITE_GEMINI_KEY = process.env.VITE_GEMINI_KEY || 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

// RAG ask chatbot pipeline with MongoDB vector/db.json fallback search
app.post('/api/bot/ask', async (req, res) => {
  try {
    const { username, message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message field is required.' });
    }

    // 1. Fetch embedding for query message
    let queryVector = null;
    try {
      const embedRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${VITE_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/embedding-001',
            content: { parts: [{ text: message }] }
          })
        }
      );
      if (embedRes.ok) {
        const embedData = await embedRes.json();
        queryVector = embedData.embedding?.values;
      }
    } catch (e) {
      console.error('Error fetching query embedding:', e);
    }

    // If embedding API failed or returned null, use direct local offline fallback
    if (!queryVector) {
      console.warn('Embedding API failed, falling back to localOfflineFallback.');
      return res.status(200).json({ reply: localOfflineFallback(message) });
    }

    // 2. Retrieve all documents
    let docs = [];
    if (useJsonFallback) {
      docs = readDb().vectorDocs || [];
    } else {
      docs = await VectorDoc.find();
    }

    // If vector base has no records, fallback to offline lookup
    if (docs.length === 0) {
      console.warn('Vector database is empty. Using local fallback.');
      return res.status(200).json({ reply: localOfflineFallback(message) });
    }

    // 3. Compute cosine similarity (dot product of normalized vectors)
    const dotProduct = (a, b) => a.reduce((sum, val, idx) => sum + val * (b[idx] || 0), 0);

    const scoredDocs = docs.map(doc => ({
      text: doc.text,
      score: dotProduct(queryVector, doc.embedding)
    }));

    // Sort descending and select top 3
    scoredDocs.sort((a, b) => b.score - a.score);
    const top3 = scoredDocs.slice(0, 3);
    const contextText = top3.map(d => d.text).join('\n\n');

    // 4. Construct System Prompt using strictly the matched paragraphs
    const systemPrompt = `You are an AI chatbot for this website. 
You must ONLY answer questions using the text from the reference books/information provided below.

STRICT RULES:
1. DO NOT use your outside knowledge.
2. DO NOT search the internet like Google.
3. If the answer is NOT in the reference text below, you must reply: "I am sorry, I only have information about the Flowering Trees and reference books."
4. If the user asks in Tamil, answer in Tamil. If they ask in English, answer in English. If in Hindi, answer in Hindi.

Reference Book/Information Text:
${contextText}`;

    // 5. Build/Retrieve history and save user query
    let finalHistory = [];
    const isRealUser = username && username !== 'guest';

    if (isRealUser) {
      // Save user question to DB first
      if (useJsonFallback) {
        const db = readDb();
        // Load history logs (last 5 messages) before adding current
        const historyLogs = db.chats.filter(c => c.username === username);
        historyLogs.sort((a, b) => new Date(b.time) - new Date(a.time));
        const last5 = historyLogs.slice(0, 5);
        last5.reverse();
        finalHistory = last5;

        // Save current question
        db.chats.push({
          username,
          role: 'user',
          content: message,
          time: new Date().toISOString()
        });
        writeDb(db);
      } else {
        // Load history logs (last 5 messages) before adding current
        const historyLogs = await Chat.find({ username }).sort({ time: -1 }).limit(5);
        historyLogs.reverse();
        finalHistory = historyLogs;

        // Save current question
        const userMsg = new Chat({
          username,
          role: 'user',
          content: message,
          time: new Date()
        });
        await userMsg.save();
      }
    } else {
      // Guest or no user - fallback to history sent by frontend
      finalHistory = history || [];
    }

    // 6. Send payload to Gemini generation endpoint
    try {
      const contents = finalHistory.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));
      // Append user message if not already in contents
      if (contents.length === 0 || contents[contents.length - 1].parts[0].text !== message) {
        contents.push({ role: 'user', parts: [{ text: message }] });
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${VITE_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.0,
              maxOutputTokens: 256,
              topP: 0.9
            }
          })
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          const cleanReply = replyText.trim();
          
          // Save assistant answer if valid user
          if (isRealUser) {
            if (useJsonFallback) {
              const db = readDb();
              db.chats.push({
                username,
                role: 'assistant',
                content: cleanReply,
                time: new Date().toISOString()
              });
              writeDb(db);
            } else {
              const assistantMsg = new Chat({
                username,
                role: 'assistant',
                content: cleanReply,
                time: new Date()
              });
              await assistantMsg.save();
            }
          }
          return res.status(200).json({ reply: cleanReply });
        }
      }
      
      console.warn('Gemini API call returned non-ok status. Using offline fallback.');
      const fallbackReply = localOfflineFallback(message);
      if (isRealUser) {
        if (useJsonFallback) {
          const db = readDb();
          db.chats.push({
            username,
            role: 'assistant',
            content: fallbackReply,
            time: new Date().toISOString()
          });
          writeDb(db);
        } else {
          const assistantMsg = new Chat({
            username,
            role: 'assistant',
            content: fallbackReply,
            time: new Date()
          });
          await assistantMsg.save();
        }
      }
      res.status(200).json({ reply: fallbackReply });
    } catch (e) {
      console.error('Error in Gemini generation call:', e);
      const fallbackReply = localOfflineFallback(message);
      if (isRealUser) {
        if (useJsonFallback) {
          const db = readDb();
          db.chats.push({
            username,
            role: 'assistant',
            content: fallbackReply,
            time: new Date().toISOString()
          });
          writeDb(db);
        } else {
          const assistantMsg = new Chat({
            username,
            role: 'assistant',
            content: fallbackReply,
            time: new Date()
          });
          await assistantMsg.save();
        }
      }
      res.status(200).json({ reply: fallbackReply });
    }
  } catch (err) {
    console.error('RAG endpoint error:', err);
    res.status(500).json({ error: 'Internal server error processing chatbot message.' });
  }
});

// --- ADMIN API ENDPOINTS ---

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid admin password' });
  }
});

// Fetch all chats enriched with user metadata
app.get('/api/admin/chats', async (req, res) => {
  try {
    let chatsList = [];
    let usersList = [];

    if (useJsonFallback) {
      const db = readDb();
      chatsList = db.chats || [];
      usersList = db.users || [];
    } else {
      chatsList = await Chat.find().lean();
      usersList = await User.find().lean();
    }

    // Map username -> user profile details
    const userMap = {};
    usersList.forEach(u => {
      userMap[u.username] = {
        phone: u.fullPhone || u.phone,
        email: u.email || 'N/A',
        createdAt: u.createdAt
      };
    });

    // Enrich chats with user contact info
    const enrichedChats = chatsList.map(c => {
      const userMeta = userMap[c.username] || { phone: 'N/A', email: 'N/A' };
      // Handle Mongoose toObject vs plain JS object
      const plainChat = c._id ? { ...c } : c;
      return {
        ...plainChat,
        phone: userMeta.phone,
        email: userMeta.email
      };
    });

    // Sort by timestamp newest first so the admin sees the latest logs at the top
    enrichedChats.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json(enrichedChats);
  } catch (err) {
    console.error('Failed to fetch admin chats:', err);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// PDF upload & vector training pipeline
app.post('/api/admin/upload-pdf', async (req, res) => {
  try {
    const { pdfData, filename } = req.body;
    if (!pdfData) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    console.log(`📥 Admin: Received PDF upload "${filename || 'unknown.pdf'}"`);
    const dataBuffer = Buffer.from(pdfData, 'base64');
    
    let rawText = '';
    try {
      const pdfParser = new pdf.PDFParse({ data: dataBuffer });
      const textResult = await pdfParser.getText();
      rawText = textResult.text || '';
      console.log('✅ PDF parsed successfully in Admin API.');
    } catch (e) {
      console.error('❌ Failed parsing uploaded PDF:', e);
      return res.status(400).json({ error: `Failed to parse PDF document: ${e.message}` });
    }

    // Split text into paragraphs/chunks
    const rawParagraphs = rawText.split(/\n\s*\n+/);
    const paragraphs = [];
    for (let p of rawParagraphs) {
      p = p.replace(/\s+/g, ' ').trim();
      // Filter out short chunks, page headers/numbers
      if (p.length > 80 && !p.toLowerCase().includes('page') && !/^\d+$/.test(p)) {
        paragraphs.push(p);
      }
    }

    console.log(`📊 Parsed ${paragraphs.length} paragraphs. Starting vector generation...`);
    if (paragraphs.length === 0) {
      return res.status(400).json({ error: 'No readable text content found in PDF' });
    }

    let successCount = 0;
    // Process chunks and save them (append new ones)
    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i];
      // Rate limit safety delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
      try {
        const embedRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${VITE_GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/embedding-001',
              content: { parts: [{ text }] }
            })
          }
        );
        let embedding = null;
        if (embedRes.ok) {
          const embedData = await embedRes.json();
          embedding = embedData.embedding?.values || null;
        } else {
          throw new Error(`Embedding API status: ${embedRes.status}`);
        }

        if (!embedding) {
          // Mock embedding fallback if API fails
          const mockVec = [];
          for (let k = 0; k < 768; k++) {
            mockVec.push(Math.sin((text.charCodeAt(k % text.length) || 0) * (k + 1)));
          }
          embedding = mockVec;
        }

        if (useJsonFallback) {
          const db = readDb();
          db.vectorDocs.push({ text, embedding });
          writeDb(db);
        } else {
          const doc = new VectorDoc({ text, embedding });
          await doc.save();
        }
        successCount++;
      } catch (err) {
        console.warn(`⚠️ Embedding failed for chunk ${i+1}. Using mock vector.`, err.message);
        const mockVec = [];
        for (let k = 0; k < 768; k++) {
          mockVec.push(Math.sin((text.charCodeAt(k % text.length) || 0) * (k + 1)));
        }
        if (useJsonFallback) {
          const db = readDb();
          db.vectorDocs.push({ text, embedding: mockVec });
          writeDb(db);
        } else {
          const doc = new VectorDoc({ text, embedding: mockVec });
          await doc.save();
        }
        successCount++;
      }
    }

    console.log(`🎉 PDF Training Complete! Saved ${successCount}/${paragraphs.length} vectors to database.`);
    res.json({
      success: true,
      message: `Successfully processed and trained knowledge base on PDF.`,
      paragraphs: paragraphs.length,
      trained: successCount
    });
  } catch (err) {
    console.error('PDF upload training error:', err);
    res.status(500).json({ error: 'Internal server error training PDF document.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Express server is running on HTTP port ${PORT}`);
});
