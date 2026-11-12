export interface LabInventoryItem {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  status: "Aman" | "Menipis" | "Habis";
  vendor?: string; // Teks nama supplier atau URL Link Pembelian (opsional)
}

export interface StockMutation {
  id: string;
  item_id: string;
  item_sku: string;
  item_name: string;
  type: "IN" | "OUT";
  quantity: number;
  reference_no: string;
  notes: string;
  created_at: string;
}