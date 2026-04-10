const axios = require('axios');

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
  "who was mathematics club chairman": "Linus was the chairman of the Mathematics Club in Lenana School from 2021 to 2023."
};

exports.handler = async function(event, context) {
  const startTime = Date.now();
  const NETLIFY_TIMEOUT = 9000; // 9 seconds to leave buffer
  // Webhook verification (GET request from Meta)
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters;
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (!VERIFY_TOKEN) {
      console.error("WHATSAPP_VERIFY_TOKEN not configured");
      return {
        statusCode: 500,
        body: "Server configuration error"
      };
    }

    if (params["hub.mode"] === "subscribe" && params["hub.verify_token"] === VERIFY_TOKEN) {
      return {
        statusCode: 200,
        body: params["hub.challenge"]
      };
    } else {
      return {
        statusCode: 403,
        body: "Verification failed"
      };
    }
  }

  // Handle incoming messages (POST request from Meta)
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      console.log("Received WhatsApp webhook:", JSON.stringify(body, null, 2));

      // Extract message data
      if (body.object === "whatsapp_business_account" && body.entry && body.entry.length > 0) {
        const entry = body.entry[0];
        if (entry.changes && entry.changes.length > 0) {
          const change = entry.changes[0];
          if (change.value && change.value.messages && change.value.messages.length > 0) {
            const message = change.value.messages[0];
            const from = message.from; // Sender's phone number
            const text = message.text ? message.text.body : "";

            console.log(`Message from ${from}: ${text}`);

            // Process message with health check and fallbacks
            const response = await processMessage(text, from);
            
            // Send response back to WhatsApp
            await sendWhatsAppMessage(from, response);

            return {
              statusCode: 200,
              body: "Message processed"
            };
          }
        }
      }

      return {
        statusCode: 200,
        body: "Event received"
      };

    } catch (error) {
      console.error("Error processing webhook:", error);
      return {
        statusCode: 500,
        body: "Internal server error"
      };
    }
  }

  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };
};

// Function to process message with health check and fallbacks
async function processMessage(message, from) {
  const normalizedMessage = normalize(message); // lower-cased, punctuation-stripped

  // Check for exact matches first (normalized)
  if (greetingResponses[normalizedMessage]) {
    return greetingResponses[normalizedMessage];
  }

  // Check for Lino.AI questions
  for (const [key, response] of Object.entries(linoAIResponses)) {
    if (normalizedMessage.includes(normalize(key))) {
      return response;
    }
  }

  // Combine all dictionary information for LLM context
  const allFaqs = [
    ...Object.values(greetingResponses),
    ...Object.values(linoAIResponses),
  ].join(" ");

  // Call LLM with the dictionary as background knowledge (same as askai.js)
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.length < 10) {
      console.error("OPENROUTER_API_KEY not set or invalid in environment");
      return "I can't reach my AI brain right now, but I can still chat about Lino.AI, Linus, and our services. Ask me something specific about those and I'll do my best to answer.";
    }
    
    const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. 

You specialize in answering questions about Lino.AI, Ireri Linus Mugendi, and related services. Use the official information provided below as your primary knowledge base.

For questions about Lino.AI, Linus, or services: Answer using ONLY the official information provided. Do not speculate or invent information.

For off-topic questions (unrelated to Lino.AI, Linus, or Ireri Mugendi): Politely acknowledge the question, but gracefully redirect the user back to what you can help with. For example: "That's an interesting question, but I'm specifically here to help with information about Lino.AI and Linus. Is there anything about those topics I can help you with?"

Maintain a conversational memory across the provided previous messages so that follow-up questions like "really?" or "tell me more" are answered in the context of the prior exchange.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Here is the official information about Lino.AI and myself. Use it as ground truth and do not invent facts:\n\n${allFaqs}` },
      { role: "user", content: message }
    ];

    // Retry configuration (same as askai.js)
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 500;

    let answer;
    let lastError;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Check if we're approaching Netlify's timeout
      if (Date.now() - startTime > NETLIFY_TIMEOUT) {
        console.log("Approaching Netlify timeout, using fallback response");
        return "I'm taking a bit longer than expected to respond. Please try asking again.";
      }
      
      try {
        console.log(`WhatsApp API attempt ${attempt + 1}/${MAX_RETRIES}`);
        
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: "cohere/rerank-4-fast", // Same model as askai.js
            messages
          },
          {
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            timeout: 8000 // Same timeout as askai.js
          }
        );

        
        answer = response.data.choices?.[0]?.message?.content?.trim();
        console.log(`WhatsApp API success on attempt ${attempt + 1}`);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        const statusCode = error.response?.status;
        
        console.error(`WhatsApp attempt ${attempt + 1} failed - Status: ${statusCode}, Error: ${error.message}`);
        
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
    
    return answer || "I appreciate your question, but I don't have information about that topic.";
    
  } catch (llmError) {
    console.error("WhatsApp LLM error after retries:", llmError.message);
    console.error("Error status:", llmError.response?.status);
    
    let errorMessage = "I'm experiencing some technical difficulties right now. Please try again in a moment.";
    
    // Provide more specific error messages
    if (llmError.response?.status === 401) {
      errorMessage = "There seems to be an authentication issue with my AI service.";
    } else if (llmError.response?.status === 429) {
      errorMessage = "I'm receiving too many requests right now. Please wait a moment and try again.";
    } else if (llmError.response?.status >= 500) {
      errorMessage = "The AI service is temporarily unavailable. Please try again later.";
    } else if (llmError.code === 'ECONNABORTED') {
      errorMessage = "The request timed out. Please try again.";
    }
    
    return errorMessage;
  }
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Function to send message back to WhatsApp
async function sendWhatsAppMessage(to, message) {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      console.error("Missing WhatsApp credentials");
      return;
    }

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("WhatsApp message sent:", response.data);
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}
