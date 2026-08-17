import { NICHES, SYSTEM_RULES } from './niches.js';

// Probed against this key on 2026-08-06: 2.0/2.5 return 404 or a hard 0-quota 429.
// Ordered fastest-first — this is a speed demo, so latency is the product.
// If the whole chain fails, re-probe with:
//   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
];

const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Crude in-memory rate limit. Resets on cold start, which is fine — this is a public
// demo, not a product. It exists so one bored person can't drain the free tier.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimited(ip) {
  const now = Date.now();
  const record = hits.get(ip);
  if (!record || now - record.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  record.count += 1;
  return record.count > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'local';
  if (rateLimited(ip)) {
    return res.status(429).json({
      error: 'Slow down a moment — demo is rate limited.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  }

  const { niche, messages } = req.body ?? {};
  const config = NICHES[niche];
  if (!config) {
    return res.status(400).json({ error: `Unknown niche: ${niche}` });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  // Keep the tail only — the demo never needs deep history, and it caps token spend.
  const recent = messages.slice(-12).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.text ?? '').slice(0, 1000) }],
  }));

  const payload = {
    systemInstruction: {
      parts: [{ text: `${SYSTEM_RULES}\n\n--- YOUR BUSINESS ---\n${config.context}` }],
    },
    contents: recent,
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 200,
    },
  };

  const started = Date.now();
  let lastStatus = 0;

  // Walk the chain: a 429 means that model's free quota is spent, so try the next.
  // A 4xx that isn't 429/404 is our bug, not a quota problem — stop and surface it.
  for (const model of MODELS) {
    try {
      const upstream = await fetch(`${endpointFor(model)}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!upstream.ok) {
        lastStatus = upstream.status;
        const detail = await upstream.text();
        console.error(`[${model}] ${upstream.status}`, detail.slice(0, 300));
        if (upstream.status === 429 || upstream.status === 404) continue;
        break;
      }

      const data = await upstream.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!reply) {
        const blocked = data?.promptFeedback?.blockReason;
        console.error(`[${model}] empty reply`, blocked ?? '');
        lastStatus = 502;
        continue;
      }

      return res.status(200).json({ reply, ms: Date.now() - started, model });
    } catch (err) {
      console.error(`[${model}] threw`, err.message);
      lastStatus = 500;
    }
  }

  return res.status(502).json({
    error:
      lastStatus === 429
        ? 'Demo is at its free-tier limit right now — try again in a minute.'
        : `Could not reach the model (last status ${lastStatus}).`,
  });
}
