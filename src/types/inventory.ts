export interface InventoryItem {
  id: string;
  date: string;
  item_name: string;
  stock_in: number;
  stock_out: number;
  remaining_stock: number;
  vendor: string;
  category: 'Bingkai' | 'Packaging' | 'Merchandise';
  created_at: string;
}