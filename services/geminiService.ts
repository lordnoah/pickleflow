
import { GoogleGenAI } from "@google/genai";
import { PlayerStats } from "../types";

export const getSessionInsights = async (stats: PlayerStats[]) => {
  // Always use a named parameter with process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const statsString = stats.map(s => `${s.name}: ${s.wins}W-${s.losses}L, Diff: ${s.diff}`).join('\n');
  
  const prompt = `
    Analyze these pickleball session stats and provide "Captain's Notes". 
    Be witty, encouraging, and call out the top performer and any interesting trends.
    Keep it under 100 words.
    Stats:
    ${statsString}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional but slightly humorous pickleball tournament director.",
        temperature: 0.8,
      },
    });
    // The .text property directly returns the string output (do not use .text())
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "The AI referee is currently reviewing the tapes. Check back in a moment!";
  }
};
