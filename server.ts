// @ts-nocheck
import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
import config from './config.json' with { type: 'json' };

const app = express();
app.set('trust proxy', 1); // needed for accurate req.ip behind Vercel/Replit's proxy
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Publishable key only — sufficient to validate a user's access token via getUser().
const supabaseAuth = createClient(
  'https://xjydqqhfbaskvfumdbjr.supabase.co',
  'sb_publishable_pNwEPf2ZbnECRkBFFKuZJw_MtvgNKaT'
);

// Identifies the caller if they sent a valid Supabase session token, but never blocks the request —
// the app is usable anonymously; signed-in users just get unlimited access + saved history.
async function attachUser(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    const { data } = await supabaseAuth.auth.getUser(token);
    (req as any).user = data?.user ?? null;
  } else {
    (req as any).user = null;
  }
  next();
}

// Anonymous callers are capped; signed-in users are exempt entirely.
const anonUsageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !!(req as any).user,
  message: { error: 'rate_limited', message: "You've hit the limit for anonymous use. Sign in for unlimited access." },
});

app.use(express.json());

// CORS in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
}

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
  }
}

// Config endpoint (safe — no secrets)
app.get('/api/config', (_req, res) => {
  const vectorStoreConfigured =
    !!config.vector_store_id &&
    config.vector_store_id !== 'YOUR_VECTOR_STORE_ID_HERE';
  res.json({
    assistant_name: config.assistant_name,
    vector_store_configured: vectorStoreConfigured,
  });
});

// Chat streaming endpoint (SSE)
app.post('/api/chat', attachUser, anonUsageLimiter, async (req, res) => {
  const { message, previousResponseId, uploadedFileId } = req.body as {
    message: string;
    previousResponseId?: string;
    uploadedFileId?: string;
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is not configured. Add it as a Replit Secret.' });
  }

  const openai = new OpenAI({ apiKey });

  // Disable Nagle's algorithm so each chunk is sent immediately
  req.socket?.setNoDelay(true);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // prevents proxy/nginx from buffering
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    // Force immediate flush on every chunk
    if (typeof (res as any).flush === 'function') (res as any).flush();
  };

  try {
    const tools: OpenAI.Responses.Tool[] = [];
    const vectorStoreConfigured =
      config.vector_store_id && config.vector_store_id !== 'YOUR_VECTOR_STORE_ID_HERE';

    if (vectorStoreConfigured) {
      tools.push({
        type: 'file_search',
        vector_store_ids: [config.vector_store_id],
      } as OpenAI.Responses.Tool);
    }

    // Build input — array form with an input_file content part lets the model read
    // an ad-hoc attachment directly, separate from the persistent vector-store corpus.
    let input: string | OpenAI.Responses.MessageParam[];
    if (uploadedFileId) {
      input = [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: message },
            { type: 'input_file', file_id: uploadedFileId },
          ],
        } as unknown as OpenAI.Responses.MessageParam,
      ];
    } else {
      input = message;
    }

    const createParams: OpenAI.Responses.ResponseCreateParamsStreaming = {
      model: (config.model as string) || 'gpt-4o-mini',
      instructions: config.assistant_instructions as string,
      input,
      stream: true,
      ...(tools.length > 0 ? { tools } : {}),
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
    };

    const stream = await openai.responses.create(createParams);

    let responseId = '';
    const citations: { filename: string; quote?: string; fileId?: string }[] = [];
    const seenFiles = new Set<string>();

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        send({ type: 'delta', text: event.delta });
      } else if (event.type === 'response.completed') {
        responseId = event.response.id;

        // Extract citations from annotations
        for (const output of event.response.output ?? []) {
          // @ts-ignore
          for (const content of output.content ?? []) {
            for (const ann of content.annotations ?? []) {
              if (ann.type === 'file_citation' && !seenFiles.has(ann.filename)) {
                seenFiles.add(ann.filename);
                citations.push({
                  filename: ann.filename,
                  quote: (ann as any).quote,
                  fileId: (ann as any).file_id,
                });
              }
            }
          }
        }
      }
    }

    send({ type: 'done', responseId, citations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    send({ type: 'error', message });
  }

  res.end();
});

// Generates a short conversation title from the first exchange
app.post('/api/title', attachUser, anonUsageLimiter, async (req, res) => {
  const { message, response } = req.body as { message: string; response: string };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });
  if (!message) return res.status(400).json({ error: 'message is required' });

  const openai = new OpenAI({ apiKey });

  try {
    const result = await openai.responses.create({
      model: 'gpt-4o-mini',
      instructions:
        'Generate a short, specific title (3-6 words, no quotes, no trailing punctuation) summarizing what this STEM tutoring exchange is about.',
      input: `Student: ${message}\n\nSTEMMY: ${(response ?? '').slice(0, 500)}`,
    });
    const title = (result.output_text ?? '').trim().slice(0, 80) || 'New conversation';
    res.json({ title });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Title generation failed';
    res.status(500).json({ error: msg });
  }
});

// File types the file_search tool can actually extract text from
const SUPPORTED_UPLOAD_EXTENSIONS = ['.pdf', '.txt', '.docx', '.md'];

// File upload endpoint
app.post('/api/upload', attachUser, anonUsageLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!SUPPORTED_UPLOAD_EXTENSIONS.includes(ext)) {
    return res.status(400).json({
      error: `Unsupported file type "${ext}". Please upload one of: ${SUPPORTED_UPLOAD_EXTENSIONS.join(', ')}.`,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });

  const openai = new OpenAI({ apiKey });

  try {
    const file = await openai.files.create({
      file: new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype }),
      purpose: 'user_data',
    });
    res.json({ fileId: file.id, filename: req.file.originalname });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    res.status(500).json({ error: msg });
  }
});

// Streams a vector-store source file back so citations can link directly to it
app.get('/api/files/:fileId', anonUsageLimiter, async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });

  const openai = new OpenAI({ apiKey });
  const { fileId } = req.params;

  try {
    const [meta, content] = await Promise.all([
      openai.files.retrieve(fileId),
      openai.files.content(fileId),
    ]);
    const buffer = Buffer.from(await content.arrayBuffer());
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${meta.filename ?? fileId}"`);
    res.send(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'File not found';
    res.status(404).json({ error: msg });
  }
});

// SPA fallback in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Build not found. Run: npm run build');
    }
  });
}

export default app;

if (!process.env.VERCEL) {
  const isDev = process.env.NODE_ENV !== 'production';
  const port = isDev ? 3001 : parseInt(process.env.PORT ?? '5000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 STEMMY server on port ${port} (${isDev ? 'dev' : 'prod'})`);
  });
}
