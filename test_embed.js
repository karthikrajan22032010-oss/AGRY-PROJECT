import dotenv from 'dotenv';
dotenv.config();

const VITE_GEMINI_KEY = process.env.VITE_GEMINI_KEY || 'AIzaSyAeIETs3_B6wPJo8dWE_HLn0hdIt6jByCk';

async function test(url, modelName) {
  try {
    const res = await fetch(url + `?key=${VITE_GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        content: { parts: [{ text: 'Hello world' }] }
      })
    });
    console.log(`URL: ${url} | Model: ${modelName}`);
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text.substring(0, 300));
    console.log('------------------------------------');
  } catch (e) {
    console.error('Error:', e);
  }
}

async function run() {
  // Test 1: v1beta gemini-embedding-001
  await test(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',
    'models/gemini-embedding-001'
  );
  // Test 2: v1 gemini-embedding-001
  await test(
    'https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:embedContent',
    'models/gemini-embedding-001'
  );
}

run();
