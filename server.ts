import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
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
app.post('/api/chat', async (req, res) => {
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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

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

    // Build input — array form needed when attaching a file
    let input: string | OpenAI.Responses.MessageParam[];
    if (uploadedFileId) {
      input = [
        {
          role: 'user',
          content: message,
          // @ts-ignore – attachments are valid per the Responses API spec
          attachments: [{ file_id: uploadedFileId, tools: [{ type: 'file_search' }] }],
        },
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
    const citations: { filename: string; quote?: string }[] = [];
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
                citations.push({ filename: ann.filename, quote: (ann as any).quote });
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

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'OPENAI_API_KEY not configured' });

  const openai = new OpenAI({ apiKey });

  try {
    const file = await openai.files.create({
      file: new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype }),
      purpose: 'assistants',
    });
    res.json({ fileId: file.id, filename: req.file.originalname });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    res.status(500).json({ error: msg });
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

const isDev = process.env.NODE_ENV !== 'production';
const port = isDev ? 3001 : parseInt(process.env.PORT ?? '5000', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 STEMMY server on port ${port} (${isDev ? 'dev' : 'prod'})`);
});
