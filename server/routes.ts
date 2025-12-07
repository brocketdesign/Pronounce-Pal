import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-lesson", async (req, res) => {
    try {
      const { topic, tags = [], details = "" } = req.body;

      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ message: "OpenAI API key is not configured" });
      }

      const openai = new OpenAI({ apiKey });

      let customContext = "";
      if (tags.length > 0) {
        customContext += `\nFocus areas: ${tags.join(", ")}.`;
      }
      if (details.trim()) {
        customContext += `\nAdditional context: ${details.trim()}`;
      }

      const prompt = `Generate a short English paragraph (3-5 sentences) about "${topic}" suitable for pronunciation practice.${customContext}
      
After the paragraph, provide a JSON array of 15-20 key vocabulary words from the paragraph with their IPA phonetic transcriptions.

Format your response EXACTLY like this:
PARAGRAPH:
[Your paragraph here]

WORDS:
[{"word": "example", "phonetic": "/ɪɡˈzæmpəl/"}, ...]

Make sure to include common and challenging words for pronunciation. The phonetic transcriptions should use the International Phonetic Alphabet (IPA).`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an English pronunciation tutor. Generate educational content with accurate IPA phonetic transcriptions.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const responseText = completion.choices[0]?.message?.content || "";

      const paragraphMatch = responseText.match(
        /PARAGRAPH:\s*([\s\S]*?)\s*WORDS:/
      );
      const wordsMatch = responseText.match(/WORDS:\s*(\[[\s\S]*\])/);

      if (!paragraphMatch || !wordsMatch) {
        return res.status(500).json({
          message: "Failed to parse AI response. Please try again.",
        });
      }

      const paragraph = paragraphMatch[1].trim();
      let words: { word: string; phonetic: string }[] = [];

      try {
        words = JSON.parse(wordsMatch[1]);
      } catch {
        return res.status(500).json({
          message: "Failed to parse vocabulary data. Please try again.",
        });
      }

      res.json({
        paragraph,
        words,
      });
    } catch (error: any) {
      console.error("Lesson generation error:", error);

      if (error?.status === 401) {
        return res.status(401).json({
          message: "Invalid API key. Please check your OpenAI API key.",
        });
      }

      if (error?.status === 429) {
        return res.status(429).json({
          message: "Rate limit exceeded. Please try again later.",
        });
      }

      res.status(500).json({
        message: error?.message || "Failed to generate lesson",
      });
    }
  });

  app.post("/api/text-to-speech", async (req, res) => {
    try {
      const { text, voice = "alloy" } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
      const selectedVoice = validVoices.includes(voice) ? voice : "alloy";

      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ message: "OpenAI API key is not configured" });
      }

      const openai = new OpenAI({ apiKey });

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: selectedVoice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: text,
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length,
      });

      res.send(buffer);
    } catch (error: any) {
      console.error("Text-to-speech error:", error);

      if (error?.status === 401) {
        return res.status(401).json({
          message: "Invalid API key. Please check your OpenAI API key.",
        });
      }

      if (error?.status === 429) {
        return res.status(429).json({
          message: "Rate limit exceeded. Please try again later.",
        });
      }

      res.status(500).json({
        message: error?.message || "Failed to generate audio",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
