import './loadEnv.js'; // must be first: sets env before routes build API clients
import express from 'express';
import cors from 'cors';
import transcribeRoute from './routes/transcribe.js';
import feedbackRoute from './routes/feedback.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/transcribe', transcribeRoute);
app.use('/api/feedback', feedbackRoute);

const key = (process.env.ANTHROPIC_API_KEY || '').trim();
if (!key || key.includes('YOUR_') || !key.startsWith('sk-ant-')) {
  console.warn(
    '\n⚠  ANTHROPIC_API_KEY is missing or a placeholder — AI feedback will fail with 401.\n' +
      '   Add your real key to speaking-coach/.env (from console.anthropic.com) and restart.\n'
  );
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
