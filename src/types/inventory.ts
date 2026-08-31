export interface InventoryItem {
  id: string;
  date: string;
  item_name: string;
  stock_in: number;
  stock_out: number;
  remaining_stock: number;
  vendor: string;
  category: 'Bingkai' | 'Packing' | 'Merchandise';
  created_at: string;
}