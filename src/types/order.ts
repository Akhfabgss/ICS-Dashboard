export type OrderStatus = 'Proses Design' | 'Pengerjaan' | 'Pengiriman' | 'Selesai' | 'Trouble';

export interface Order {
  discount_amount(discount_amount: number): unknown;
  discount_amount: number;
  shipping_fee: number;
  id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  phone_number: string;
  address: string;
  product_name: string;
  category: string;
  order_source: string;
  add_ons: string[];
  frame_price: number;
  addons_price: number;
  total_price: number;
  dp_amount: number;
  repayment_amount: number;
  remaining_payment: number;
  is_paid_off: boolean;
  design_data?: string;
  shipping_method?: string;
  notes?: string;
  status: OrderStatus;
  design_time?: string;
  assembly_time?: string;
  created_at: string;
}