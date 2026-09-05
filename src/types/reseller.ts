export type ResellerStatus =
  | "Dalam Daftar"
  | "Pending"
  | "Proses Design"
  | "Pengerjaan"
  | "Pengiriman"
  | "Selesai"
  | "Trouble";

export interface ResellerOrder {
  id: string;
  created_at: string;
  order_date: string;
  completion_date: string | null;
  reseller_name: string;
  customer_name: string;
  frame_type: string;
  commission: number;
  status: ResellerStatus;
  assigned_to?: string | null;
  notes?: string | null;
}