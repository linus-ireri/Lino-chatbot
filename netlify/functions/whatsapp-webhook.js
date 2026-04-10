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

  // Health check RAG server first
  try {
    const RAG_SERVER_URL = process.env.RAG_SERVER_URL;
    if (!RAG_SERVER_URL) {
      throw new Error("RAG_SERVER_URL not set in environment");
    }
    await axios.get(
      `${RAG_SERVER_URL}/health`,
      { timeout: 1000 } // 1 second timeout for health check
    );
  } catch (healthError) {
    // If health check fails, always call LLM with ALL official info as context for reasoning
    const allFaqs = [
      ...Object.values(greetingResponses),
      ...Object.values(linoAIResponses)
    ].join(" ");
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not set in environment");
      }
      const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. You must answer using ONLY the official information provided below. Do not speculate, do not introduce yourself, do not use general knowledge, and do not say you don't know if the information is present. If the information is not present, say you do not have official information. Always try to follow up on the current conversation and maintain context if possible.`;
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Official information: ${allFaqs}` },
        { role: "user", content: message }
      ];
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "mistralai/mistral-small-3.2-24b-instruct:free",
          messages
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 4000 // 4 seconds timeout for LLM fallback
        }
      );
      const answer = response.data.choices?.[0]?.message?.content?.trim();
      return answer || "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
    } catch (llmError) {
      return "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
    }
  }

  // If health check passes, proceed with RAG (6s) and LLM fallback (4s)
  try {
    const RAG_SERVER_URL = process.env.RAG_SERVER_URL;
    if (!RAG_SERVER_URL) {
      throw new Error("RAG_SERVER_URL not set in environment");
    }
    const ragResponse = await axios.post(
      `${RAG_SERVER_URL}/rag`,
      { question: message },
      { timeout: 6000 } // 6 seconds timeout for RAG
    );

    // If answer is present, return it
    if (ragResponse.data && ragResponse.data.answer) {
      return ragResponse.data.answer;
    }

    // If no answer, but context exists, use it in LLM fallback
    const retrievedContext = ragResponse.data && ragResponse.data.context;
    if (retrievedContext) {
      // --- LLM must answer ONLY from retrieved RAG context ---
      try {
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error("OPENROUTER_API_KEY not set in environment");
        }
        const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. You must answer using ONLY the retrieved context provided below. Do not speculate, do not introduce yourself, do not use general knowledge, and do not say you don't know if the information is present. If the information is not present, say you do not have official information. Always try to follow up on the current conversation and maintain context if possible.`;
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Retrieved context: ${Array.isArray(retrievedContext) ? retrievedContext.join(" ") : retrievedContext}` },
          { role: "user", content: message }
        ];
        const response = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          { messages },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 4000 // 4 seconds timeout for LLM fallback
          }
        );
        const answer = response.data.choices?.[0]?.message?.content?.trim();
        return answer || "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
      } catch (llmError) {
        console.error("Error in LLM request:", llmError);
        return "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
      }
    }

    // If no context, fall back to FAQ/cached info as context
    const allFaqs = [
      ...Object.values(greetingResponses),
      ...Object.values(linoAIResponses)
    ].join(" ");
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not set in environment");
      }
      const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. You must answer using ONLY the official information provided below. Do not speculate, do not introduce yourself, do not use general knowledge, and do not say you don't know if the information is present. If the information is not present, say you do not have official information. Always try to follow up on the current conversation and maintain context if possible.`;
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Official information: ${allFaqs}` },
        { role: "user", content: message }
      ];
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "mistralai/mistral-small-3.2-24b-instruct:free",
          messages
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 4000 // 4 seconds timeout for LLM fallback
        }
      );
      const answer = response.data.choices?.[0]?.message?.content?.trim();
      return answer || "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
    } catch (llmError) {
      return "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
    }
  } catch (error) {
    console.error("Error in RAG request:", error);
    // If RAG fails, proceed with LLM fallback with no context
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY not set in environment");
      }
      const systemPrompt = `You are Lino.AI Assistant. Only identify yourself as Lino.AI Assistant if the user explicitly asks who you are or similar. Never say you are a language model, AI model, or mention Mistral or any other provider. Never say you were created by Mistral or anyone else. You must answer using ONLY the retrieved context provided below. Do not speculate, do not introduce yourself, do not use general knowledge, and do not say you don't know if the information is present. If the information is not present, say you do not have official information. Always try to follow up on the current conversation and maintain context if possible.`;
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ];
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        { messages },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 4000 // 4 seconds timeout for LLM fallback
        }
      );
      const answer = response.data.choices?.[0]?.message?.content?.trim();
      return answer || "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
    } catch (llmError) {
      console.error("Error in LLM fallback:", llmError);
      return "I'm experiencing high traffic right now and can't answer this question at the moment. Please try again in a few minutes!";
    }
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
