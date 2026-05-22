import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import Message from '../Models/Message.js';
import { Channel } from '../Models/channel.js';
import { User } from '../Models/user.js';
import Groq from "groq-sdk";
import multer from "multer";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* CHAT WITH SLACKBOT */
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const prompt = req.body.prompt || "";
    const attachmentUrl = req.body.attachmentUrl;
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const hasFile = !!attachmentUrl;

    if (!prompt && !hasFile) {
      return res.status(400).json({ content: "I didn't hear anything! Could you repeat that or upload a file?" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.json({
        content: "Oops! My brain is missing. Please add your `GROQ_API_KEY` to the Backend `.env` file so I can assist you properly!"
      });
    }

    const user = await User.findById(req.userId);
    const username = user ? user.username : "User";

    const userChannels = await Channel.find({ members: req.userId, isDM: false });
    const channelNames = userChannels.map(c => c.name).join(", ") || "None";

    const systemPrompt = `You are Slackbot, a helpful AI assistant inside this Slack Clone app.
The user you are talking to is ${username}.
They are currently a member of ${userChannels.length} channels: ${channelNames}.

Use the app context only when the user asks about this app, their workspace, channels, files, messages, or Slackbot features. For normal questions, answer normally as a general assistant.

App context:
- Users can create and join workspaces and channels.
- Users can send real-time DMs and channel messages.
- Users can upload and share images and PDFs.
- Users can star messages or channels.
- Slackbot can answer general questions, help with app questions, and read uploaded PDFs.
- The app includes profile customization, online statuses, and authentication.

Be concise and direct. If a user asks a follow-up like "which one" or "give", use the recent conversation history to understand what they mean. If the history does not contain enough information, ask one short clarifying question.`;

    let userPrompt = prompt;

    let messagesPayload = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history
        .slice(-10)
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => ({
          role: m.role,
          content: String(m.content).slice(0, 2000),
        })),
      {
        role: "user",
        content: userPrompt,
      },
    ];
    let selectedModel = "llama-3.1-8b-instant";

    if (hasFile) {
      let dataBuffer;
      let fileExt = attachmentUrl.split('.').pop().toLowerCase();
      fileExt = '.' + fileExt.split('?')[0]; // Strip query params just in case

      if (attachmentUrl.startsWith("http")) {
        try {
          const response = await fetch(attachmentUrl);
          if (!response.ok) throw new Error("Failed to fetch remote file");
          dataBuffer = Buffer.from(await response.arrayBuffer());
        } catch (err) {
          return res.json({ content: "❌ Error: Could not download the uploaded file from cloud storage." });
        }
      } else {
        const filePath = path.join(process.cwd(), attachmentUrl);
        if (!fs.existsSync(filePath)) {
          return res.json({ content: "❌ Error: Could not find the uploaded file on the server." });
        }
        dataBuffer = fs.readFileSync(filePath);
      }

      if (fileExt === '.pdf') {
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        
        userPrompt += `\n\n[USER UPLOADED PDF DOCUMENT CONTENT (TEXT)]:\n${pdfData.text}`;
        messagesPayload[messagesPayload.length - 1].content = userPrompt;
      } else if (fileExt === '.png' || fileExt === '.jpg' || fileExt === '.jpeg' || fileExt === '.webp') {
        return res.json({ content: "❌ AI Error: Groq has decommissioned their Vision model, so I can no longer see or process images. Please upload text or PDF documents instead!" });
        selectedModel = "llama-3.2-11b-vision-preview";
        const imageAsBase64 = dataBuffer.toString('base64');
        const mimeType = fileExt === '.png' ? 'image/png' : (fileExt === '.webp' ? 'image/webp' : 'image/jpeg');
        messagesPayload = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageAsBase64}`,
                },
              },
            ],
          },
        ];
      } else {
        return res.json({ content: `❌ Unsupported file format: ${fileExt}. I can only process PDF documents and Images at the moment.` });
      }
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: messagesPayload,
      model: selectedModel,
    });

    const text = chatCompletion.choices[0].message.content;
    res.json({ content: text });
  } catch (err) {
    console.log("Groq Error:", err);
    res.json({ content: `❌ **AI Error:** ${err.message}` });
  }
});

/* SUMMARIZE CHANNEL */
router.post('/summarize-channel/:channelId', verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(400).json({ message: "Groq API Key missing" });

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    // Fetch last 50 messages
    const messages = await Message.find({ channelId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "username");

    if (messages.length === 0) return res.json({ summary: "No messages to summarize." });

    const context = messages.reverse().map(m => `${m.sender.username}: ${m.content}`).join("\n");
    const prompt = `You are a professional assistant. Summarize the following chat conversation from the "${channel.name}" channel. Highlight key decisions, action items, and the general sentiment. Be concise and use bullet points.\n\nConversation:\n${context}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
    });

    const summary = chatCompletion.choices[0].message.content;
    res.json({ summary });
  } catch (err) {
    console.log("Groq Error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
