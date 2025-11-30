import { GoogleGenAI } from "@google/genai";
import { Transaction, AnalysisResult } from "../types";

// Initialize Gemini Client
// Using type assertion to handle the hybrid environment check safely
const apiKey = (import.meta as any).env?.VITE_API_KEY || (process as any).env?.API_KEY;

if (!apiKey) {
  console.warn("API Key might be missing. Ensure VITE_API_KEY is set.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Helper to retry functions (e.g., API calls)
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = error.toString().toLowerCase();
      // Retry on network errors, 503s, or the specific XHR/RPC error code 6
      const isRetryable = 
        msg.includes("xhr error") || 
        msg.includes("fetch failed") || 
        msg.includes("503") || 
        msg.includes("error code: 6");
        
      if (!isRetryable) throw error;

      console.warn(`Attempt ${i + 1} failed. Retrying...`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

export const analyzeBankStatement = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    // Use gemini-2.5-flash for speed and cost efficiency
    const model = "gemini-2.5-flash";
    
    // Retry the API call to handle transient network/RPC errors
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
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
              
              CONTEXT:
              This is likely a bank statement (e.g., HDFC) with columns: Date, Narration, Chq/Ref, Value Dt, Withdrawal, Deposit, Closing Balance.
              
              TASK:
              Extract all transactions into a structured PIPE-DELIMITED format.
              You MUST extract the 'Counterparty Name' from the Narration into a new separate column.
              
              OUTPUT FORMAT:
              Date | Narration | Name | ReferenceNo | ValueDate | WithdrawalAmount | DepositAmount | ClosingBalance
              
              RULES:
              1. **Date**: DD/MM/YY or DD/MM/YYYY.
              2. **Narration**: The full description text. Remove any pipes (|) or newlines within the text.
              3. **Name**: Extract the Merchant/Person name from the narration (e.g., "AMAZON", "JOHN DOE", "UPI-12345-USER"). If unsure, put "NULL".
              4. **ReferenceNo**: The Check or Reference Number. If empty, use "NULL".
              5. **ValueDate**: The value date column. If empty, use "NULL".
              6. **Amounts**: Withdrawal, Deposit, Closing Balance. Numbers only. NO commas. If 0 or blank, write "0".
              
              CRITICAL:
              - Output ONLY the pipe-delimited rows. No markdown block markers (like \`\`\`csv). No headers.
              - Ensure every line has exactly 8 columns.
              - Merge multi-line transactions into a single line.
              `
            },
          ],
        },
        config: {
          temperature: 0.0,
        },
      });
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
      
      // Clean up markdown or header artifacts
      if (trimmedLine.startsWith('```')) continue;
      if (trimmedLine.toLowerCase().includes('date|narration')) continue;

      // Split by pipe
      const parts = trimmedLine.split('|').map(p => p.trim());
      
      // We expect 8 columns, but the AI might sometimes output 7 (missing Name) or skip others.
      // We try to intelligently map them.
      if (parts.length < 5) continue; 

      let dateStr, narration, name, ref, valDate, withdrawalStr, depositStr, balanceStr;

      if (parts.length >= 8) {
         // Ideal case
         [dateStr, narration, name, ref, valDate, withdrawalStr, depositStr, balanceStr] = parts;
      } else if (parts.length === 7) {
         // Likely missing the extra "Name" column we asked for, or missing ValueDate
         // Heuristic: If part[2] looks like a Ref number (digits), then Name is missing.
         // PDF structure: Date | Narration | Ref | ValDate | With | Dep | Bal
         [dateStr, narration, ref, valDate, withdrawalStr, depositStr, balanceStr] = parts;
         name = "NULL"; 
      } else {
         // Fallback for messy lines
         continue;
      }

      // Helper to clean numbers
      const parseAmt = (str: string | undefined) => {
        if (!str || str === "NULL" || str === "") return 0;
        // Remove commas, standardizing 1,000.00 -> 1000.00
        const cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? 0 : val;
      };

      const cleanStr = (str: string | undefined) => {
        return (!str || str === "NULL" || str === "0") ? undefined : str;
      };

      // Basic Date Validation
      if (!dateStr || dateStr.length < 6) continue;

      const t: Transaction = {
        date: dateStr,
        narration: narration || '',
        name: cleanStr(name),
        referenceNo: cleanStr(ref),
        valueDate: cleanStr(valDate),
        withdrawalAmount: parseAmt(withdrawalStr),
        depositAmount: parseAmt(depositStr),
        closingBalance: parseAmt(balanceStr) || 0
      };

      // Filter out empty rows (sometimes page numbers are caught)
      if (t.withdrawalAmount === 0 && t.depositAmount === 0 && t.closingBalance === 0) {
        continue;
      }

      transactions.push(t);
    }

    if (transactions.length === 0) {
      throw new Error("Could not parse any transactions. The file might be blurry or format unrecognized.");
    }

    // Calculate summary
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
    
    // User-friendly error mapping
    const errMsg = error.message || error.toString();
    
    if (errMsg.includes('xhr error') || errMsg.includes('error code: 6')) {
        throw new Error("Network Error: The file might be too large for the browser to upload. Please try splitting the PDF or using a smaller file.");
    }
    if (errMsg.includes('400')) {
        throw new Error("Bad Request: The file format or content could not be processed.");
    }
    
    throw error;
  }
};

export const fileToGenerativePart = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Get the base64 part
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
