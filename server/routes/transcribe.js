import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: '/tmp/speaking-coach/' });

// Lazily create the OpenAI client so the server starts even without a key
// (the key is only required for the upload path, not live recording)
let _openai = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env to enable file upload transcription.');
  }
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    const openai = getOpenAI();
    const fileStream = fs.createReadStream(req.file.path);

    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    fs.unlink(req.file.path, () => {});

    const words = (response.words || []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    res.json({
      text: response.text,
      words,
      duration: response.duration ?? (words.at(-1)?.end || 0),
    });
  } catch (err) {
    fs.unlink(req.file?.path, () => {});
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

export default router;
