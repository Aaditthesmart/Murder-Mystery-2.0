import fetch from 'node-fetch';

const GEMINI_API_KEY = "AIzaSyC6T9PxTI9diV9hGINbx6E6S49CtRbBnmI";
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${GEMINI_API_KEY}`;

const JLLM_API_ENDPOINT = "https://janitorai.com/hackathon/completions";
const JLLM_API_KEY = "calhacks2047";

async function testGemini() {
  console.log("Listing Gemini Models...");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    console.log("Gemini Status:", response.status);
    const data = await response.json();
    console.log("1.5 Flash models:", data.models.filter(m => m.name.includes('1.5-flash')).map(m => m.name));
  } catch (err) {
    console.log("Gemini Fetch Error:", err.message);
  }
}

async function testJLLM() {
  console.log("\nTesting JLLM...");
  try {
    const response = await fetch(JLLM_API_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JLLM_API_KEY}`,
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        model: 'jllm',
        messages: [{ role: 'user', content: 'Say OK' }],
        stream: false
      })
    });
    console.log("JLLM Status:", response.status);
    const text = await response.text();
    console.log("JLLM Body Snippet:", text.substring(0, 500));
  } catch (err) {
    console.log("JLLM Fetch Error:", err.message);
  }
}

async function run() {
  await testGemini();
  await testJLLM();
}

run();
