import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Returns a human-friendly reason if the key is unusable, else null.
function apiKeyProblem() {
  const k = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!k) return 'No Anthropic API key found. Add ANTHROPIC_API_KEY to speaking-coach/.env and restart the server.';
  if (k.includes('YOUR_') || k.includes('...') || !k.startsWith('sk-ant-')) {
    return 'Your ANTHROPIC_API_KEY in speaking-coach/.env is still a placeholder. Replace it with your real key from console.anthropic.com, then restart the server.';
  }
  return null;
}

router.post('/', async (req, res) => {
  const { transcript, fillerWordCounts, avgWpm, wpmData, pauses, volumeStdDev, duration } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  // Fail fast with a clear message rather than a raw 401 from Anthropic.
  const keyIssue = apiKeyProblem();
  if (keyIssue) {
    return res.status(401).json({ error: keyIssue });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const fillerSummary = Object.entries(fillerWordCounts || {})
    .map(([w, c]) => `"${w}": ${c} times`)
    .join(', ') || 'none detected';

  const prompt = `You are an expert public speaking coach. Analyze this speech and return a JSON coaching report.

SPEECH TRANSCRIPT:
"${transcript}"

SPEECH METRICS:
- Duration: ${Math.round(duration || 0)} seconds
- Average speaking pace: ${Math.round(avgWpm || 0)} words per minute
- Filler words used: ${fillerSummary}
- Long pauses (>2s): ${pauses?.length || 0} detected
- Volume consistency (std dev): ${volumeStdDev?.toFixed(2) || 'N/A'}

Return ONLY valid JSON matching this exact structure:
{
  "overallScore": <integer 1-10>,
  "categoryScores": {
    "clarity": <integer 1-10>,
    "structure": <integer 1-10>,
    "vocabulary": <integer 1-10>,
    "confidence": <integer 1-10>
  },
  "feedback": {
    "clarity": "<2-3 sentence specific feedback>",
    "structure": "<2-3 sentence specific feedback>",
    "vocabulary": "<2-3 sentence specific feedback>",
    "confidence": "<2-3 sentence specific feedback>"
  },
  "tips": [
    "<actionable tip 1 specific to this speech>",
    "<actionable tip 2 specific to this speech>",
    "<actionable tip 3 specific to this speech>"
  ],
  "highlights": [
    "<something they did well 1>",
    "<something they did well 2>"
  ]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const report = JSON.parse(jsonMatch[0]);
    res.json(report);
  } catch (err) {
    const status = err?.status ?? err?.statusCode;
    if (status === 401 || /authentication|invalid x-api-key/i.test(err?.message || '')) {
      return res.status(401).json({
        error:
          'Anthropic rejected the API key (401). Make sure ANTHROPIC_API_KEY in speaking-coach/.env is a valid, active key, then restart the server.',
      });
    }
    console.error('Feedback error:', err);
    res.status(500).json({ error: err.message || 'Feedback generation failed' });
  }
});

export default router;
