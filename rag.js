import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import axios from "axios";

async function main() {
  // 1. Load the persisted vector store
  const embeddings = new HuggingFaceTransformersEmbeddings({
    modelName: "Xenova/all-MiniLM-L6-v2"
  });
  const vectorStore = await HNSWLib.load("vector_store", embeddings);

  // 2. Define a user question (replace with your own question)
  const question = "Summarize what this chatbot is and who built it.";

  // 3. Retrieve the top 3 most relevant chunks
  const results = await vectorStore.similaritySearch(question, 3);

  // 4. Format the prompt for the LLM
  const context = results.map((doc, i) => `Context #${i + 1}:\n${doc.pageContent}`).join("\n\n");
  const prompt = `You are an AI assistant. Use the following context to answer the user's question.\n\n${context}\n\nUser question: ${question}\n\nAnswer:`;

  // 5. Send the prompt to OpenRouter
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set in environment variables.");
    process.exit(1);
  }

  const messages = [
    { role: "system", content: "You are a helpful AI assistant." },
    { role: "user", content: prompt }
  ];

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "tencent/hy3-preview:free",
        messages
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );
    const answer = response.data.choices?.[0]?.message?.content || "[No answer returned]";
    console.log("\n----- LLM Answer -----\n");
    console.log(answer);
  } catch (err) {
    console.error("Error calling OpenRouter:", err.response?.data || err.message);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 