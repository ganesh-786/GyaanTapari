import { useState } from "react";
import { GoogleGenAI } from "@google/genai";
const apiKey = import.meta.env.VITE_GEMINI_KEY;
const ai = new GoogleGenAI({ apiKey });

export async function generateQuestions(userTopic, count = 10) {
  const prompt = `You are a quiz question generator. Produce exactly ${count} multiple-choice questions about "${userTopic}".

Respond ONLY with a single JSON array. Each element must be an object with these keys: id (number), topic (string), question (string), options (array of 4 strings), correct (0-based index number), explanation (short string).

Example element:
{
  "id": 1,
  "topic": "${userTopic}",
  "question": "Sample question?",
  "options": ["A","B","C","D"],
  "correct": 2,
  "explanation": "Short explanation why option C is correct"
}

Make sure the output is valid JSON with no extra text before or after. Use 0-based index for 'correct'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let raw = response.text || "";

    // try to extract the JSON array from the response robustly
    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1) {
      raw = raw.slice(firstBracket, lastBracket + 1);
    }

    // strip triple backticks if any
    raw = raw.replace(/```json\s*|```/gi, "").trim();

    const parsed = JSON.parse(raw);

    // basic normalization & validation
    const normalized = parsed.slice(0, count).map((p, idx) => ({
      id: p.id ?? idx + 1,
      topic: p.topic ?? userTopic,
      question: p.question ?? "(no question)",
      options: Array.isArray(p.options)
        ? p.options.slice(0, 4)
        : ["", "", "", ""],
      correct: typeof p.correct === "number" ? p.correct : 0,
      explanation: p.explanation ?? "",
    }));

    return normalized;
  } catch (err) {
    console.error("generateQuestions error:", err);
    throw err;
  }
}

export default function AI() {
  return <></>;
}
