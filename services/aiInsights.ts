import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";
import { formatCurrency } from "../utils/formatters";

export type AiInsight = { 
  title: string; 
  message: string; 
  level: "info" | "warn" | "action";
  badge: string;
};

export async function getAiInsights(transactions: Transaction[]): Promise<AiInsight[]> {
  try {
    // Fix: Initialize GoogleGenAI using the process.env.API_KEY directly as required
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Preparar dados para a IA sem expor dados sensíveis
    const summary = transactions.slice(0, 20).map(t => ({
      desc: t.description,
      val: t.amount,
      type: t.type,
      month: t.competenceMonth
    }));

    // Fix: Use gemini-3-pro-preview for complex reasoning tasks (financial analysis)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Lançamentos recentes: ${JSON.stringify(summary)}`,
      config: {
        systemInstruction: "Você é um mentor financeiro humano e calmo. Analise os lançamentos recentes do usuário e gere 2 insights práticos. Responda EXCLUSIVAMENTE em formato JSON seguindo este schema: Array<{title: string, message: string, level: 'info'|'warn'|'action', badge: string}>. Mantenha um tom encorajador e acolhedor (estilo Azular).",
        responseMimeType: "application/json"
      }
    });

    // Fix: Extract text output using the .text property on GenerateContentResponse
    const text = response.text;
    if (text) {
      return JSON.parse(text);
    }
    
    throw new Error("Empty AI response");
  } catch (err) {
    console.error("Gemini Error:", err);
    return [
      {
        title: "Guia Azular",
        message: "Continue registrando seus passos. Amanhã teremos novos conselhos baseados nos seus números.",
        level: "info",
        badge: "Dica do Dia"
      }
    ];
  }
}