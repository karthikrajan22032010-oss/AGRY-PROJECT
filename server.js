import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_opt';

// Enable CORS and increase body-parser limit for large avatar dataURLs
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB Database.'))
  .catch(err => console.error('MongoDB database connection error:', err));

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

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, phone, countryCode, password } = req.body;
    if (!username || !phone || !password) {
      return res.status(400).json({ error: 'Username, phone, and password are required fields.' });
    }

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
    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;
    res.status(201).json(userResponse);
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

    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found in database.' });
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(200).json(userResponse);
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

    // Verify phone number or full phone match
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'Username not found in database.' });
    }

    // Allow matching on last 8 digits or exact phone to account for country code differences
    const matched = user.phone.endsWith(phone) || phone.endsWith(user.phone);
    if (!matched) {
      return res.status(400).json({ error: 'Phone number does not match registration records.' });
    }

    user.password = password;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully in database.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error during password reset.' });
  }
});

// Chat Endpoints
app.get('/api/chat/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const history = await Chat.find({ username }).sort({ time: 1 });
    res.status(200).json(history);
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

    const newMessage = new Chat({
      username,
      role,
      content,
      time: time ? new Date(time) : new Date()
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Save chat message error:', err);
    res.status(500).json({ error: 'Internal server error saving chat message.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Express server is running on HTTP port ${PORT}`);
});
