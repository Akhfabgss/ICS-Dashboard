-- 1. TABEL PRODUK / STOK
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  sku VARCHAR UNIQUE NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 5, -- Batas indikator 'Low Stock'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABEL PEMESANAN (ORDERS)
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR UNIQUE NOT NULL,
  customer_name VARCHAR NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABEL DETAIL ITEM PESANAN
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  qty INT NOT NULL,
  price NUMERIC(12, 2) NOT NULL, -- Harga jual saat transaksi
  subtotal NUMERIC(12, 2) NOT NULL
);

-- 4. TABEL INVOICE
CREATE TYPE invoice_status AS ENUM ('unpaid', 'paid', 'overdue');

CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  invoice_number VARCHAR UNIQUE NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABEL PENGELUARAN (EXPENSES)
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category VARCHAR NOT NULL, -- cth: Operasional, Restock, Gaji
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABEL ARUS KAS TERPUSAT (CASH FLOWS)
CREATE TYPE cash_type AS ENUM ('income', 'expense');

CREATE TABLE cash_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type cash_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description VARCHAR NOT NULL,
  reference_id UUID, -- Menghubungkan ke order_id atau expense_id
  created_at TIMESTAMPTZ DEFAULT now()
);