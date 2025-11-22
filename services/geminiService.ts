import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateAIAnswer = async (question: string, context?: string): Promise<string> => {
  if (!apiKey) {
    return "<p>AI Suggestions are disabled (Missing API Key).</p>";
  }

  try {
    const prompt = `
      You are a senior IT Support Specialist at a major bank.
      Please provide a technical, concise, and professional answer (or draft) for the following Knowledge Base entry title/question.
      
      Question: ${question}
      
      ${context ? `Context provided: ${context}` : ''}

      Format the response as valid HTML using simple tags (e.g., <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>).
      Do not include the outer \`\`\`html\`\`\` code blocks or the <html>/<body> tags. Just the content body.
      Ensure the tone is suitable for an IT knowledge base.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "<p>Could not generate a response.</p>";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "<p>Error communicating with AI service.</p>";
  }
};

export const generateSummary = async (titles: string[]): Promise<string> => {
  if (!apiKey) {
    return "AI Summary is disabled (Missing API Key).";
  }
  if (titles.length === 0) {
    return "No entries available to summarize.";
  }

  try {
    const prompt = `
      You are an intelligent IT Knowledge Base assistant for Banco Santander.
      
      Analyze the following list of Knowledge Base article titles currently visible in the dashboard:
      ${titles.map(t => `- ${t}`).join('\n')}
      
      Provide a high-level, concise summary (max 2-3 sentences) of the topics and technical solutions available in this list. 
      Focus on grouping common themes (e.g., "Users can find solutions for VPN connectivity, printer setup on specific floors, and security policy updates.").
      Do not list every single title. Keep it professional and helpful.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Summary Error:", error);
    return "Error communicating with AI service to generate summary.";
  }
};