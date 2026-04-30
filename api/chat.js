const https = require('https');

const SYSTEM_PROMPT = `You are an experienced Agile coach with 10+ years in software teams.

When given sprint data, respond using EXACTLY this format with no changes:

🔴 TOP PROBLEMS
- [problem 1]
- [problem 2]
- [problem 3]

🔄 RETROSPECTIVE
Start: [what to start doing]
Stop: [what to stop doing]
Continue: [what to keep doing]

💡 NEXT SPRINT TIP
[one specific actionable tip in 2-3 sentences]

❤️ HEALTH SCORE: [number]/10
[one sentence reason]

RULES YOU MUST FOLLOW:
- Never use ## headers
- Never use ** bold markers
- Never use markdown of any kind
- Always use the exact emoji and format shown above
- Keep each point short and specific
- Be direct, warm, and specific. No generic advice.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: message }
    ]
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  try {
    const result = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid response from Groq')); }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    if (result.error) throw new Error(result.error.message);

    const reply = result.choices[0].message.content;
    res.status(200).json({ reply });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
