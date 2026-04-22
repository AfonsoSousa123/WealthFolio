import { GoogleGenAI, Type } from "@google/genai";
import { Asset, AIAnalysisResult } from "../types";

// Initialize the Gemini API client directly in the frontend
// The environment provides GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = "gemini-3-flash-preview"; // Standard model for these tasks

export const getRealTimeAssetData = async (symbol: string, assetName: string) => {
  try {
    const prompt = `Find real-time financial data for ${assetName} (Symbol: ${symbol}). 
    Return the data as a JSON object with the following fields: 
    price (number, in EUR if possible), currency (string, e.g. "EUR"), 
    marketCap (string), peRatio (string), dividendYield (string), high52 (number), 
    low52 (number), volume (string), description (string - 2-3 sentences about the asset),
    sourceUrl (string - URL where you found it), sourceTitle (string - name of the website),
    ter (number - Total Expense Ratio for ETF), fundSize (string - total assets), 
    replication (string - method), distribution (string - policy).
    Focus on JustETF or Yahoo Finance.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            price: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            marketCap: { type: Type.STRING },
            peRatio: { type: Type.STRING },
            dividendYield: { type: Type.STRING },
            high52: { type: Type.NUMBER },
            low52: { type: Type.NUMBER },
            volume: { type: Type.STRING },
            description: { type: Type.STRING },
            sourceUrl: { type: Type.STRING },
            sourceTitle: { type: Type.STRING },
            ter: { type: Type.NUMBER },
            fundSize: { type: Type.STRING },
            replication: { type: Type.STRING },
            distribution: { type: Type.STRING },
          },
          required: ["price", "sourceUrl"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error fetching real-time data:", error);
    return null;
  }
};

export const analyzePortfolio = async (assets: Asset[]): Promise<AIAnalysisResult | null> => {
  try {
    const prompt = `Analyze this investment portfolio: ${JSON.stringify(assets)}. 
    Evaluate diversification across asset classes, overall health score, and rebalancing needs. 
    Return as JSON.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER },
            riskAssessment: { type: Type.STRING },
            healthStatus: { type: Type.STRING },
            rebalancingNeeded: { type: Type.BOOLEAN },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            diversificationStatus: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error analyzing portfolio:", error);
    return null;
  }
};

export const analyzeAsset = async (asset: Asset, realTimeData: any = null) => {
  try {
    const prompt = `Perform a deep technical and fundamental analysis for ${asset.name} (${asset.symbol}) 
    based on this live metrics: ${JSON.stringify(realTimeData)}. 
    Provide a rating (Buy/Hold/Sell) and a detailed case.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: { type: Type.STRING },
            summary: { type: Type.STRING },
            bullishCase: { type: Type.STRING },
            bearishCase: { type: Type.STRING },
            priceTarget: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error analyzing asset:", error);
    return null;
  }
};
