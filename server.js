import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// --- Setup Express ---
const app = express();
app.use(cors());
app.use(express.json());

// --- File path setup for frontend ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "frontend")));

// --- LM Studio Connection ---
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || "http://localhost:1234/v1/chat/completions";
const MODEL_NAME = process.env.MODEL_NAME || "llama-3-8b-instruct";

// --- Chat Route (AI Assistant) ---
app.post("/chat", async (req, res) => {
  const { message, name = "User", history = [], pageContent = "" } = req.body;

  // Context prompt for assistant
  const siteContext = `
  You are Eva, a friendly AI assistant for the "HTI" website.
  You help users with information, navigation, and questions.

  🧭 If the user asks to navigate to a specific section
  (Home, Courses, Careers, Client Portal, Contact),
  respond only with JSON in this exact format:
  {"action":"navigate","target":"#section-id"}

  Example:
  - "Go to the Careers section" → {"action":"navigate","target":"#careers"}
  - "Scroll down" → {"action":"scroll","direction":"down"}
  - "Scroll up" → {"action":"scroll","direction":"up"}

  For all other queries, respond naturally as Eva.
  The user’s name is ${name}.
  Current page context: ${pageContent || "No extra content provided."}
  `;

  const messages = [
    { role: "system", content: siteContext },
    ...(Array.isArray(history) ? history : []),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch(LMSTUDIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ LM Studio API Error:", response.status, errText);
      return res.status(500).json({
        reply: "⚠️ LM Studio connection failed.",
        details: errText,
      });
    }

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "🤖 Sorry, no response from model.";

    res.json({ reply });
  } catch (error) {
    console.error("❌ Chat error:", error);
    res.status(500).json({ reply: "⚠️ Error contacting the local AI model." });
  }
});

// --- Save User Info Route ---
app.post("/saveUser", (req, res) => {
  const { name, email, phone } = req.body;
  console.log("🆕 New User Joined:", { name, email, phone });
  res.json({ success: true });
});

// --- Serve Frontend ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HTI AI Assistant Server running on http://localhost:${PORT}`);
  console.log(`🧠 Connected to LM Studio at ${LMSTUDIO_URL}`);
});
