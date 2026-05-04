const https = require('https');

const SYSTEM_PROMPT = `You are a senior Agile coach with 15+ years of experience 
coaching software teams. You have deep knowledge of Scrum, Kanban, SAFe, 
Automotive SPICE, DevOps, and agile leadership.

You respond naturally depending on what the user asks:

- If they share sprint data or describe a team situation → give structured 
  coaching with clear sections for problems, retrospective, tips and a health score
- If they ask a question about Agile, Scrum, Kanban, velocity, story points, 
  ceremonies, roles etc. → answer clearly and directly like an expert would
- If they ask for advice or recommendations → give specific, actionable guidance
- If they want to know what something means → explain it simply with examples
- If they describe a team problem → help them think through it
- If they want to compare methodologies → give a balanced comparison

Always be:
- Specific and practical — never vague or generic
- Warm but direct — like a trusted coach, not a textbook
- Concise — get to the point quickly
- Honest — if something they are doing is wrong, say so kindly

Never force a rigid format. Match your response style to what the person actually needs.
Use bullet points, sections or plain prose — whichever fits best for that question.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  // Build messages array with conversation history
  const messages = [
    ...(history || []),
    { role: 'user', content: message }
  ];

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages
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
