import { GoogleGenAI } from "@google/genai";
import { Transaction, AnalysisResult } from "../types";

// Initialize Gemini Client
// Using type assertion to handle the hybrid environment check safely
const apiKey = (import.meta as any).env?.VITE_API_KEY || (process as any).env?.API_KEY;

if (!apiKey) {
  console.warn("API Key might be missing. Ensure VITE_API_KEY is set.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const analyzeBankStatement = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const model = "gemini-2.5-flash";
    
    // We use a pipe-delimited text format instead of JSON to save output tokens.
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
            text: `Analyze this bank statement document and extract all transaction rows.
            
            OUTPUT FORMAT:
            - Pure PIPE-DELIMITED text.
            - One transaction per line.
            - NO headers, NO markdown code blocks, NO intro/outro text.
            - Ensure exactly 8 columns per line. Use "NULL" for empty fields.
            
            Columns:
            Date | Narration | Name | ReferenceNo | ValueDate | WithdrawalAmount | DepositAmount | ClosingBalance

            RULES:
            1. **Date**: DD/MM/YY or DD/MM/YYYY.
            2. **Narration**: Full description. Replace any pipes (|) in text with hyphens (-).
            3. **Name**: Extract payee/merchant name (e.g., "AMAZON", "JOHN DOE"). If unsure, use "NULL".
            4. **ReferenceNo**: Chq/Ref No. If empty, use "NULL".
            5. **ValueDate**: If empty, use "NULL".
            6. **Withdrawal/Deposit/Balance**: Numbers only. Remove commas. If 0 or empty, use "0".
            
            IMPORTANT:
            - If a transaction takes multiple lines of text in the PDF, merge them into ONE line.
            - Do not output table headers.
            - Do not output page numbers.
            `
          },
        ],
      },
      config: {
        temperature: 0.0,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("No data received from AI service.");
    }

    const transactions: Transaction[] = [];
    const lines = rawText.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Filter out code blocks and headers
      if (trimmedLine.startsWith('```')) continue;
      if (trimmedLine.toLowerCase().includes('date|narration')) continue;

      const parts = trimmedLine.split('|').map(p => p.trim());
      
      // Robust Parsing: Allow 7 or 8 columns.
      // Sometimes ValueDate or Ref is skipped by the model.
      if (parts.length < 6) continue; // Too few columns to be a valid transaction

      let dateStr, narration, name, ref, valDate, withdrawalStr, depositStr, balanceStr;

      if (parts.length >= 8) {
         [dateStr, narration, name, ref, valDate, withdrawalStr, depositStr, balanceStr] = parts;
      } else if (parts.length === 7) {
         // Assuming ValueDate might be missing
         [dateStr, narration, name, ref, withdrawalStr, depositStr, balanceStr] = parts;
         valDate = undefined;
      } else {
         // Fallback for 6 columns (Missing Name and Ref/ValDate)
         [dateStr, narration, withdrawalStr, depositStr, balanceStr] = parts;
         name = undefined;
         ref = undefined;
      }

      const parseAmt = (str: string | undefined) => {
        if (!str || str === "NULL") return 0;
        const cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? 0 : val;
      };

      const cleanStr = (str: string | undefined) => {
        return (!str || str === "NULL") ? undefined : str;
      };

      const t: Transaction = {
        date: dateStr || '',
        narration: narration || '',
        name: cleanStr(name),
        referenceNo: cleanStr(ref),
        valueDate: cleanStr(valDate),
        withdrawalAmount: parseAmt(withdrawalStr),
        depositAmount: parseAmt(depositStr),
        closingBalance: parseAmt(balanceStr) || 0
      };

      // Validity check: Needs a date and at least one amount or balance
      if (t.date.length > 0 && (t.withdrawalAmount > 0 || t.depositAmount > 0 || t.closingBalance > 0)) {
        transactions.push(t);
      }
    }

    if (transactions.length === 0) {
      throw new Error("AI could not identify any valid transactions. Try cropping the header/footer or using a clearer image.");
    }

    const summary = transactions.reduce(
      (acc, curr) => ({
        totalDeposits: acc.totalDeposits + (curr.depositAmount || 0),
        totalWithdrawals: acc.totalWithdrawals + (curr.withdrawalAmount || 0),
        transactionCount: acc.transactionCount + 1,
        netMovement: 0, 
      }),
      { totalDeposits: 0, totalWithdrawals: 0, netMovement: 0, transactionCount: 0 }
    );
    summary.netMovement = summary.totalDeposits - summary.totalWithdrawals;

    return { transactions, summary };

  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    // Enhance error message for common failures
    if (error.message?.includes('400') || error.message?.includes('413')) {
      throw new Error("File is too large or complex for the API. Please try a smaller file (fewer pages).");
    }
    throw error;
  }
};

export const fileToGenerativePart = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve({
        data: base64String,
        mimeType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};