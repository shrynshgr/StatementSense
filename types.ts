
export interface Transaction {
  date: string;
  narration: string;
  name?: string;
  category: string;
  referenceNo?: string;
  valueDate?: string;
  withdrawalAmount: number;
  depositAmount: number;
  closingBalance: number;
}

export interface AnalysisResult {
  transactions: Transaction[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    netMovement: number;
    transactionCount: number;
    startDate?: string;
    endDate?: string;
    categories: Record<string, number>;
  };
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
