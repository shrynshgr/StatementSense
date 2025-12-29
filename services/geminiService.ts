
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AnalysisResult, ChatMessage } from "../types";

/**
 * Strips potential markdown code blocks and whitespace from the AI response.
 */
const cleanJsonResponse = (text: string): string => {
  // Remove markdown code blocks like ```json ... ``` or just ``` ... ```
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  // Extract anything between the first { and the last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
};

/**
 * Compresses an image to ensure it stays within stable RPC payload limits.
 */
const compressImage = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 2000;
        const MAX_HEIGHT = 2000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve({
          data: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export const analyzeBankStatement = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please select an API key.");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview";
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `This is an HDFC Bank statement. Extract ALL transactions from this document. Return ONLY a valid JSON object.
            Required fields per transaction: Date, Narration (full text), Reference No (if present), Withdrawal (debit amount), Deposit (credit amount), and Balance.
            
            Strictly categorize each: [Food, Shopping, Housing, Transport, Utilities, Healthcare, Entertainment, Salary, Transfer, Other].
            Clean merchant names into a concise 'name' field for better identification.`
          },
        ],
      },
      config: { 
        temperature: 0,
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  narration: { type: Type.STRING },
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  referenceNo: { type: Type.STRING },
                  withdrawalAmount: { type: Type.NUMBER },
                  depositAmount: { type: Type.NUMBER },
                  closingBalance: { type: Type.NUMBER }
                },
                required: ["date", "narration", "category", "withdrawalAmount", "depositAmount", "closingBalance"]
              }
            }
          },
          required: ["transactions"]
        }
      },
    });

    const rawText = response.text;
    if (!rawText) throw new Error("No readable text returned from analysis.");

    let data;
    try {
      const cleaned = cleanJsonResponse(rawText);
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON Parsing Error:", e, rawText);
      throw new Error("Data extraction failed. The statement structure might be too complex for a single scan. Try a clearer screenshot of the transactions.");
    }

    const transactions: Transaction[] = data.transactions || [];
    if (transactions.length === 0) throw new Error("No transactions found. Ensure dates and amounts are clearly visible.");

    const categoryTotals: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.withdrawalAmount > 0) {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.withdrawalAmount);
      }
    });

    const sortedDates = [...transactions].map(t => t.date).filter(d => d && d !== 'NULL');

    const summary = transactions.reduce(
      (acc, curr) => ({
        totalDeposits: acc.totalDeposits + (Number(curr.depositAmount) || 0),
        totalWithdrawals: acc.totalWithdrawals + (Number(curr.withdrawalAmount) || 0),
        transactionCount: acc.transactionCount + 1,
        netMovement: 0,
        startDate: acc.startDate,
        endDate: acc.endDate,
        categories: categoryTotals
      }),
      { 
        totalDeposits: 0, 
        totalWithdrawals: 0, 
        netMovement: 0, 
        transactionCount: 0, 
        startDate: sortedDates[0], 
        endDate: sortedDates[sortedDates.length - 1], 
        categories: categoryTotals 
      }
    );
    summary.netMovement = summary.totalDeposits - summary.totalWithdrawals;

    return { transactions, summary };
  } catch (error: any) {
    if (error.message?.includes("Rpc failed") || error.message?.includes("500")) {
      throw new Error("The file is too heavy for the connection. Please try a screenshot of just the transaction table.");
    }
    throw error;
  }
};

export const chatWithStatement = async (question: string, context: Transaction[], history: ChatMessage[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview";
  const dataSummary = JSON.stringify(context.slice(0, 40).map(t => ({
    d: t.date,
    n: t.name || t.narration.slice(0, 20),
    w: t.withdrawalAmount,
    dep: t.depositAmount
  })));

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: question }] }
    ],
    config: { 
      systemInstruction: `You are a financial analyst specializing in HDFC bank statements. Based on this data:\n${dataSummary}\nAnswer concisely.`,
      temperature: 0.2
    }
  });

  return response.text || "I couldn't process that question.";
};

export const fileToGenerativePart = async (file: File): Promise<{ data: string; mimeType: string }> => {
  if (file.type.startsWith('image/')) {
    return compressImage(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve({ data: result.split(',')[1], mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
