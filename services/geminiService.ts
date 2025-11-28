import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Transaction, AnalysisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const transactionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING, description: "The transaction date (e.g., DD/MM/YY)" },
    narration: { type: Type.STRING, description: "Description or details of the transaction" },
    name: { type: Type.STRING, description: "The extracted name of the payee/payer from the narration. Format is often [Payment_type]-[Transaction_no]-[Name]-[Details]. Extract [Name]. If format differs, try to identify the entity name.", nullable: true },
    referenceNo: { type: Type.STRING, description: "Cheque number or reference number if available", nullable: true },
    valueDate: { type: Type.STRING, description: "The value date of the transaction", nullable: true },
    withdrawalAmount: { type: Type.NUMBER, description: "Amount withdrawn or debited. Use 0 if none." },
    depositAmount: { type: Type.NUMBER, description: "Amount deposited or credited. Use 0 if none." },
    closingBalance: { type: Type.NUMBER, description: "The resulting balance after transaction." },
  },
  required: ["date", "narration", "withdrawalAmount", "depositAmount", "closingBalance"],
};

const responseSchema: Schema = {
  type: Type.ARRAY,
  items: transactionSchema,
  description: "List of transactions extracted from the bank statement.",
};

export const analyzeBankStatement = async (base64Data: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const model = "gemini-2.5-flash";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analyze this bank statement document. Extract all transaction rows into a structured JSON format.
            
            Rules:
            1. Extract the Date, Narration, Reference No (if any), Value Date, Withdrawal Amount, Deposit Amount, and Closing Balance.
            2. Extract the 'Name' from the narration field. 
               - The narration often follows the format: [Payment_type]-[Transaction_no]-[Name]-[Receivers_BankDetails]. 
               - Example: 'NEFT DR-UBIN123456-RAJU DUBEY-NETBANK' -> Name is 'RAJU DUBEY'.
               - Example: 'UPI-3037...-9307...-OK' -> If no clear name exists, leave Name null or empty.
            3. Normalize all amounts to numbers (remove currency symbols and commas).
            4. If a field is empty (like Withdrawal Amount for a Deposit row), set it to 0.
            5. Return ONLY the JSON array matching the schema.
            `
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("No data returned from Gemini.");
    }

    const transactions: Transaction[] = JSON.parse(rawText);

    // Calculate summary stats on the client side to ensure accuracy
    const summary = transactions.reduce(
      (acc, curr) => ({
        totalDeposits: acc.totalDeposits + (curr.depositAmount || 0),
        totalWithdrawals: acc.totalWithdrawals + (curr.withdrawalAmount || 0),
        transactionCount: acc.transactionCount + 1,
        netMovement: 0, // calculated below
      }),
      { totalDeposits: 0, totalWithdrawals: 0, netMovement: 0, transactionCount: 0 }
    );
    summary.netMovement = summary.totalDeposits - summary.totalWithdrawals;

    return {
      transactions,
      summary,
    };
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const fileToGenerativePart = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        data: base64String,
        mimeType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};