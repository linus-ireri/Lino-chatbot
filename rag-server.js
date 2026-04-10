import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

const app = express();
app.set('trust proxy', 1); // Trust first proxy (ngrok)
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());
// Disable x-powered-by
app.disable('x-powered-by');
// CORS (open for now, restrict in prod)
app.use(cors());
// Body size limit
app.use(express.json({ limit: '10kb' }));
// Rate limiting (DoS protection)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

let vectorStore, embeddings;

async function loadRAG() {
  embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2"
  });
  vectorStore = await HNSWLib.load("vector_store", embeddings);
  console.log("RAG vector store and embeddings loaded.");
}

app.post('/rag', async (req, res) => {
  const question = req.body.question;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid question' });
  }
  try {
    const results = await vectorStore.similaritySearch(question, 3);
    const context = results.map((doc, i) => `Context #${i + 1}:\n${doc.pageContent}`);
    const prompt = `You are an AI assistant. Use the following context to answer the user's question.\n\n${context.join("\n\n")}\n\nUser question: ${question}\n\nAnswer:`;

    // LLM call with same model and error handling as askai.js
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.length < 10) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY not set or invalid in environment' });
    }
    
    const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else.

You are a helpful AI assistant that answers questions using the provided context. Use ONLY the context information to answer the user's question. If the information is not in the context, say you don't have enough information to answer that question.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];
    
    // Retry configuration (same as askai.js)
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 500;
    
    let answer = "";
    let lastError;
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`RAG API attempt ${attempt + 1}/${MAX_RETRIES}`);
        
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: "cohere/rerank-4-fast", // Same model as askai.js
            messages
          },
          {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            timeout: 8000 // Same timeout as askai.js
          }
        );

        answer = response.data.choices?.[0]?.message?.content?.trim() || "[No answer returned]";
        console.log(`RAG API success on attempt ${attempt + 1}`);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        const statusCode = error.response?.status;
        
        console.error(`RAG attempt ${attempt + 1} failed - Status: ${statusCode}, Error: ${error.message}`);
        
        // If it's a 429 (rate limit) or 5xx error, retry
        if ((statusCode === 429 || statusCode >= 500) && attempt < MAX_RETRIES - 1) {
          const delayMs = RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff: 0.5s, 1s
          console.log(`Rate limited/server error. Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        
        // For client errors (4xx except 429), don't retry
        if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
          console.log(`Client error ${statusCode}, not retrying`);
          throw error;
        }
        
        // If it's the last attempt or a non-retryable error, throw
        if (attempt === MAX_RETRIES - 1) {
          throw error;
        }
      }
    }
    
    res.json({ context, prompt, answer });
  } catch (err) {
    console.error('RAG error:', err);
    
    // Provide more specific error messages
    let errorMessage = 'RAG retrieval failed';
    let statusCode = 500;
    
    if (err.response?.status === 401) {
      errorMessage = 'Authentication issue with AI service';
    } else if (err.response?.status === 429) {
      errorMessage = 'Too many requests to AI service';
    } else if (err.response?.status >= 500) {
      errorMessage = 'AI service temporarily unavailable';
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = 'Request to AI service timed out';
    }
    
    res.status(statusCode).json({ error: errorMessage, details: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

loadRAG().then(() => {
  app.listen(PORT, () => {
    console.log(`RAG server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to load RAG:', err);
  process.exit(1);
}); 