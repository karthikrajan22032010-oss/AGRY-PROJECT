import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';

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
      fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], chats: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error reading JSON DB file:', e);
    return { users: [], chats: [] };
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

const User = mongoose.model('User', UserSchema);
const Chat = mongoose.model('Chat', ChatSchema);

// Root landing page to confirm server status
app.get('/', (req, res) => {
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
        
        <div class="endpoints">
          <div class="endpoints-title">Available Database Routes</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/auth/register</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/auth/login</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/auth/forgot-password</div>
          <div class="endpoint-item"><span class="method">GET</span>  /api/chat/:username</div>
          <div class="endpoint-item"><span class="method post">POST</span> /api/chat</div>
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

// Start Server
app.listen(PORT, () => {
  console.log(`Express server is running on HTTP port ${PORT}`);
});
