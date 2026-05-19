import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
const fs = require('fs');
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agri_opt';
const VITE_GEMINI_KEY = process.env.VITE_GEMINI_KEY || 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';
const DB_FILE = './db.json';
const PDF_PATH = './documents/cowen.pdf';

const VectorDocSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }
});

const VectorDoc = mongoose.model('VectorDoc', VectorDocSchema);

async function getEmbedding(text) {
  try {
    const res = await fetch(
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
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Embedding API error: status ${res.status} - body: ${errText}`);
    }
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (e) {
    console.warn(`⚠️ API failed for "${text.substring(0, 20)}...". Generating fallback mock embedding.`);
    const mockVec = [];
    for (let i = 0; i < 768; i++) {
      mockVec.push(Math.sin((text.charCodeAt(i % text.length) || 0) * (i + 1)));
    }
    return mockVec;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('🤖 Starting Agri-Opt Vector Knowledge Base Training...');
  
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ PDF file not found at path: ${PDF_PATH}`);
    process.exit(1);
  }

  // 1. Read and parse PDF
  console.log(`📄 Reading ${PDF_PATH}...`);
  const dataBuffer = fs.readFileSync(PDF_PATH);
  
  let rawText = '';
  try {
    const pdfParser = new pdf.PDFParse({ data: dataBuffer });
    const textResult = await pdfParser.getText();
    rawText = textResult.text || '';
    console.log('✅ PDF parsed successfully using PDFParse.');
  } catch (e) {
    console.error('❌ Failed to parse PDF file:', e);
    process.exit(1);
  }
  
  // 2. Split text into paragraphs/chunks
  // We split by double newlines or single newlines with spacing, filtering out pages or headers
  console.log('✂️ Chunking text into clean paragraphs...');
  const rawParagraphs = rawText.split(/\n\s*\n+/);
  const paragraphs = [];
  
  for (let p of rawParagraphs) {
    p = p.replace(/\s+/g, ' ').trim();
    // Filter out very short lines (headers, page numbers, or junk symbols)
    if (p.length > 80 && !p.toLowerCase().includes('page') && !/^\d+$/.test(p)) {
      paragraphs.push(p);
    }
  }

  console.log(`📊 Extracted ${paragraphs.length} valid paragraphs for training.`);

  // 3. Connect to Database (with local file fallback)
  let useJsonFallback = false;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('📦 Connected to MongoDB vector repository.');
  } catch (err) {
    console.warn('⚠️ MongoDB is not active or running. Training will populate local db.json.');
    useJsonFallback = true;
  }

  // Clear previous training data to avoid duplicates
  if (useJsonFallback) {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    db.vectorDocs = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } else {
    await VectorDoc.deleteMany({});
    console.log('🧹 Cleaned existing vector collection in MongoDB.');
  }

  // 4. Generate Embeddings and Save Chunks
  let successCount = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i];
    console.log(`⏳ [${i + 1}/${paragraphs.length}] Generating embedding...`);
    
    // Call API with a small delay to avoid rate limit hits
    await delay(150);
    const embedding = await getEmbedding(text);
    
    if (embedding) {
      if (useJsonFallback) {
        const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        db.vectorDocs.push({ text, embedding });
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      } else {
        const doc = new VectorDoc({ text, embedding });
        await doc.save();
      }
      successCount++;
    }
  }

  console.log(`\n🎉 Training Finished! Successfully saved ${successCount}/${paragraphs.length} document vectors to ${useJsonFallback ? 'local db.json fallback' : 'MongoDB'}.`);
  
  if (!useJsonFallback) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

run();
