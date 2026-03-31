import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ content: "I didn't hear anything! Could you repeat that?" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        content: "Oops! My brain is missing. Please add your `GEMINI_API_KEY` to the Backend `.env` file so I can assist you properly!"
      });
    }

    const fullPrompt = `You are Slackbot, a helpful and friendly digital assistant inside a Real Time Chat Application (Slack clone). 
Help the user with any tasks, answer questions gracefully, and be concise. Respond using standard Markdown formatting.

User says: ${prompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || "Unknown error from Gemini API";
      console.error("Gemini API Error:", errMsg);
      return res.json({ content: `❌ **AI Error:** ${errMsg}` });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response. Please try again!";
    res.json({ content: text });

  } catch (err) {
    console.error("AI Error:", err.message);
    res.json({ content: `❌ **AI Error:** ${err.message}` });
  }
});

export default router;
