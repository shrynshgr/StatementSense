export interface Transaction {
  date: string;
  narration: string;
  name?: string;
  referenceNo?: string;
  valueDate?: string;
  withdrawalAmount: number;
  depositAmount: number;
  closingBalance?: number;
}

export interface AnalysisResult {
  transactions: Transaction[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    netMovement: number;
    transactionCount: number;
  };
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}