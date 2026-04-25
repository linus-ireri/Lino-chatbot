const axios = require("axios");

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST instead." }),
    };
  }

  let userMessage = "";
  let contextMessages = [];
  try {
    const body = JSON.parse(event.body || "{}");
    userMessage = body.message?.trim();
    contextMessages = Array.isArray(body.context) ? body.context : [];

    if (!userMessage || typeof userMessage !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request format. Expected a 'message' field with text." }),
      };
    }

    // Knowledge base for context
    const greetingResponses = {
      "who are you": "I'm Lino.AI assistant. How can I help you?",
      "who are you?": "I'm Lino.AI assistant. How can I help you?",
      "hello": "Hello! I'm Lino.AI assistant. How can I help you?",
      "hi": "Hi there! I'm Lino.AI assistant. How can I help you?",
      "hey": "Hey! I'm Lino.AI assistant. How can I help you?",
      "how are you": "I'm doing great, thanks for asking! I'm Lino.AI assistant. How can I help you?",
      "how are you?": "I'm doing great, thanks for asking! I'm Lino.AI assistant. How can I help you?",
      "good morning": "Good morning! I'm Lino.AI assistant. How can I help you?",
      "good afternoon": "Good afternoon! I'm Lino.AI assistant. How can I help you?",
      "good evening": "Good evening! I'm Lino.AI assistant. How can I help you?"
    };
    
    // Knowledge base for common Lino.AI questions
    const linoAIResponses = {
      "what is lino.ai": "Lino.AI is a technology company led by Ireri Linus Mugendi, specializing in chatbot engineering, AI integration, LLM hosting, fine-tuning, and Retrieval-Augmented Generation (RAG) implementation.",
      "what does lino.ai do": "Lino.AI specializes in chatbot engineering, AI integration, LLM hosting, fine-tuning, Retrieval-Augmented Generation (RAG) implementation using graph knowledge vector databases, website creation, and all aspects of software engineering.",
      "who is lino.ai": "Lino.AI is led by Ireri Linus Mugendi and specializes in AI and software engineering services.",
      "who is ireri linus mugendi": "Ireri Linus Mugendi is the leader of Lino.AI, specializing in AI and software engineering.",
      "contact lino.ai": "You can contact Lino.AI at lino.ai.bot@gmail.com or visit our website at https://lino-ai-co.netlify.app",
      "lino.ai contact": "You can contact Lino.AI at lino.ai.bot@gmail.com or visit our website at https://lino-ai-co.netlify.app",
      "lino.ai services": "Lino.AI offers chatbot engineering, AI integration, LLM hosting, fine-tuning, RAG implementation, website creation, and software engineering services.",
      "lino.ai website": "Visit Lino.AI at https://lino-ai-co.netlify.app",
      "lino.ai email": "Contact Lino.AI at hello.linoai@gmail.com",
      "where did linus school": "Linus attended Lenana School for high school, graduating with an A in mathematics, and is currently pursuing a Bachelor's degree in Mathematics and Computer Science at JKUAT (Jomo Kenyatta University of Agriculture and Technology).",
      "where did linus study": "Linus attended Lenana School and is now at JKUAT studying Mathematics and Computer Science.",
      "where did linus go to school": "Linus went to Lenana School for high school and is currently at JKUAT for university.",
      "what did linus study": "Linus is pursuing a Bachelor's degree in Mathematics and Computer Science at JKUAT.",
      "who is linus": "Linus is a mathematician and AI architect, currently studying at JKUAT and building software solutions.",
      "is linus a mathematician": "Yes, Linus is a mathematician and an AI architect.",
      "which high school did linus attend": "Linus attended Lenana School and graduated with an A in mathematics.",
      "what is linus's background": "Linus is a mathematician and AI architect, currently at JKUAT, and a Lenana School alumnus with an A in mathematics.",
      "was linus a club chairman": "Yes, Linus was the chairman of the Mathematics Club from 2021 to 2023.",
      "what clubs did linus lead": "Linus was the chairman of the Mathematics Club from 2021 to 2023, and is currently the lead of the Data Science and Cloud Computing team at JKUAT.",
      "what is linus's role in jkuat": "Linus is the lead of the Data Science and Cloud Computing team at JKUAT.",
      "what is lino ai's history": "Linus began Lino AI in 2024, but officially decided to implement it in 2025.",
      "when was lino ai started": "Lino AI was started by Linus in 2024, with official implementation beginning in 2025.",
      "who leads data science at jkuat": "Linus is the lead of the Data Science and Cloud Computing team at JKUAT.",
      "who was mathematics club chairman": "Linus was the chairman of the Mathematics Club from 2021 to 2023."
    };

    // Combine all dictionary information for LLM context
    const allFaqs = [
      ...Object.values(greetingResponses),
      ...Object.values(linoAIResponses),
    ].join(" ");

    // Call LLM with the dictionary as background knowledge
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY not set in environment");
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reply: "I can't reach my AI brain right now, but I can still chat about Lino.AI, Linus, and our services. Ask me something specific about those and I'll do my best to answer.",
            context: [],
            source: "no-api-key",
          }),
        };
      }
      
      const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. 

You specialize in answering questions about Lino.AI, Ireri Linus Mugendi, and related services. Use the official information provided below as your primary knowledge base.

For questions about Lino.AI, Linus, or services: Answer using ONLY the official information provided. Do not speculate or invent information.

For off-topic questions (unrelated to Lino.AI, Linus, or Ireri Mugendi): Politely acknowledge the question, but gracefully redirect the user back to what you can help with. For example: "That's an interesting question, but I'm specifically here to help with information about Lino.AI and Linus. Is there anything about those topics I can help you with?"

Maintain a conversational memory across the provided previous messages so that follow-up questions like "really?" or "tell me more" are answered in the context of the prior exchange.`;

      // Map frontend conversation context into LLM chat history
      const historyMessages = contextMessages
        .map((m) => {
          if (!m || !m.role || !m.content) return null;
          const role = m.role === "bot" || m.role === "assistant" ? "assistant" : "user";
          return {
            role,
            content: m.content,
          };
        })
        .filter(Boolean);
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "system", content: `Here is the official information about Lino.AI and myself. Use it as ground truth and do not invent facts:\n\n${allFaqs}` },
        ...historyMessages,
        { role: "user", content: userMessage }
      ];

      let answer;
      let lastError;


      // Retry logic with exponential backoff
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          console.log(`API attempt ${attempt + 1}/${MAX_RETRIES}`);
          
          const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              model: "nvidia/nemotron-3-nano-30b-a3b:free", // Using a more reliable model with better rate limits
              messages
            },
            {
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
              },
              timeout: 15000
            }
          );

          
          answer = response.data.choices?.[0]?.message?.content?.trim();
          console.log(`API success on attempt ${attempt + 1}`);
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          const statusCode = error.response?.status;
          
          console.error(`Attempt ${attempt + 1} failed - Status: ${statusCode}, Error: ${error.message}`);
          
          // If it's a 429 (rate limit) or 5xx error, retry
          if ((statusCode === 429 || statusCode >= 500) && attempt < MAX_RETRIES - 1) {
            const delayMs = RETRY_DELAY * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s
            console.log(`Rate limited/server error. Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          
          // If it's the last attempt or a non-retryable error, throw
          if (attempt === MAX_RETRIES - 1) {
            throw error;
          }
        }
      }
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: answer || "I appreciate your question, but I don't have information about that topic.",
          context: [],
          source: "llm"
        }),
      };
    } catch (llmError) {
      console.error("LLM error after retries:", llmError.message);
      console.error("Error status:", llmError.response?.status);
      console.error("Error data:", llmError.response?.data);
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: "I'm experiencing some technical difficulties right now. Please try again in a moment.",
          context: [],
          source: "error-fallback",
          error: {
            message: llmError.message,
            status: llmError.response?.status,
            data: llmError.response?.data,
          },
        }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unexpected error", details: error.message }),
    };
  }
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}