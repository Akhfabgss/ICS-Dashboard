export type CashFlowType = 'income' | 'expense';

export type FinanceCategory =
  | 'Pemasukan Submisi'
  | 'Pembelian Stok Slab'
  | 'Pengadaan Chip NFC & Security'
  | 'Gaji & Operasional Lab'
  | 'Utilitas & Pemeliharaan Mesin'
  | 'Lainnya';

export interface CashFlowTransaction {
  id: string;
  date: string;
  ref_id: string; // e.g. SUB-240101 or NOTA-INV-001
  category: FinanceCategory | string;
  description: string;
  amount: number;
  type: CashFlowType;
  created_at?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalReceivables: number; // Piutang/Sisa Tagihan
}

