-- BuzzNa D74 Enterprise Operating System
-- Complete Supabase PostgreSQL Schema
-- Deploy this SQL on your Supabase dashboard

-- ============================================
-- TABLE: businesses (Tenant Master Records)
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
  tenant_id UUID PRIMARY KEY,
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  industry VARCHAR(100),
  country VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'KES',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  license_status VARCHAR(50) DEFAULT 'TRIAL_ACTIVE',
  license_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: business_settings (Operational Config)
-- ============================================
CREATE TABLE IF NOT EXISTS business_settings (
  tenant_id UUID PRIMARY KEY REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  chosen_theme VARCHAR(50),
  brand_color VARCHAR(50),
  daily_revenue_target NUMERIC(12, 2) DEFAULT 0,
  weekly_revenue_target NUMERIC(12, 2) DEFAULT 0,
  monthly_revenue_target NUMERIC(12, 2) DEFAULT 0,
  daraja_paybill VARCHAR(50),
  daraja_till_number VARCHAR(50),
  daraja_api_key VARCHAR(255),
  eod_time VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: users (Staff Access Control)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'CASHIER',
  username VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email_address VARCHAR(255),
  password VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, username)
);

-- ============================================
-- TABLE: product_categories (Catalog Organization)
-- ============================================
CREATE TABLE IF NOT EXISTS product_categories (
  category_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  category_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, category_name)
);

-- ============================================
-- TABLE: products (Inventory Master)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  product_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(category_id) ON DELETE SET NULL,
  barcode VARCHAR(100),
  product_name VARCHAR(255) NOT NULL,
  cost_floor NUMERIC(12, 2) NOT NULL,
  retail_price NUMERIC(12, 2) NOT NULL,
  current_quantity NUMERIC(12, 2) DEFAULT 0,
  is_serialized BOOLEAN DEFAULT FALSE,
  expiry_date DATE,
  supplier_id VARCHAR(255),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, barcode)
);

-- ============================================
-- TABLE: inventory_events (Event Sourcing)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_events (
  event_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  quantity_delta NUMERIC(12, 2) NOT NULL,
  reason_code VARCHAR(100),
  terminal_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: till_sessions (POS Shift Management)
-- ============================================
CREATE TABLE IF NOT EXISTS till_sessions (
  session_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  opening_float NUMERIC(12, 2) DEFAULT 0,
  expected_cash_balance NUMERIC(12, 2) DEFAULT 0,
  actual_cash_balance NUMERIC(12, 2),
  session_status VARCHAR(50) DEFAULT 'OPEN',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: sales_transactions (POS Checkouts)
-- ============================================
CREATE TABLE IF NOT EXISTS sales_transactions (
  transaction_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES till_sessions(session_id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  gross_total NUMERIC(12, 2) NOT NULL,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  terminal_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: sale_items (Transaction Line Items)
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
  item_id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: payment_allocations (Split Payments)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  allocation_id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
  allocated_method VARCHAR(50) NOT NULL,
  allocated_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: customers (Customer Master)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email_address VARCHAR(255),
  credit_limit NUMERIC(12, 2) DEFAULT 0,
  existing_debt NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: customer_credit_ledger (Debt Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_credit_ledger (
  ledger_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES sales_transactions(transaction_id) ON DELETE SET NULL,
  amount_delta NUMERIC(12, 2) NOT NULL,
  running_balance NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: expenses (Operational Expenses)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  expense_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  expense_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  recorded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  incurred_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: buzzna_records (Unified Sync Cache)
-- ============================================
CREATE TABLE IF NOT EXISTS buzzna_records (
  id VARCHAR(255) PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  tenant_id UUID,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_events_tenant_id ON inventory_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_events_product_id ON inventory_events(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_tenant_id ON sales_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_session_id ON sales_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_created_at ON sales_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_transaction_id ON sale_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_credit_ledger_customer_id ON customer_credit_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_till_sessions_tenant_id ON till_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_till_sessions_status ON till_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buzzna_records_table_name ON buzzna_records(table_name);
CREATE INDEX IF NOT EXISTS idx_buzzna_records_tenant_id ON buzzna_records(tenant_id);

-- ============================================
-- ROW LEVEL SECURITY (Multi-Tenant Isolation)
-- ============================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE till_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE buzzna_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VIEWS (Business Intelligence)
-- ============================================
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT
  st.tenant_id,
  DATE(st.created_at) as sale_date,
  COUNT(DISTINCT st.transaction_id) as transaction_count,
  SUM(st.gross_total) as total_revenue,
  SUM(st.tax_amount) as total_tax,
  SUM(st.discount_amount) as total_discounts,
  AVG(st.gross_total) as avg_transaction_value
FROM sales_transactions st
GROUP BY st.tenant_id, DATE(st.created_at)
ORDER BY sale_date DESC;

CREATE OR REPLACE VIEW product_stock_status AS
SELECT
  p.product_id,
  p.tenant_id,
  p.product_name,
  p.current_quantity,
  p.retail_price,
  p.cost_floor,
  (p.retail_price - p.cost_floor) as margin,
  CASE
    WHEN p.current_quantity = 0 THEN 'OUT_OF_STOCK'
    WHEN p.current_quantity < 5 THEN 'LOW_STOCK'
    WHEN p.expiry_date < CURRENT_DATE THEN 'EXPIRED'
    ELSE 'IN_STOCK'
  END as stock_status
FROM products p;

CREATE OR REPLACE VIEW customer_aging AS
SELECT
  c.customer_id,
  c.tenant_id,
  c.customer_name,
  c.existing_debt,
  c.credit_limit,
  MAX(ccl.created_at) as last_transaction_date,
  AGE(CURRENT_DATE, MAX(ccl.created_at)::DATE) as days_since_last_tx
FROM customers c
LEFT JOIN customer_credit_ledger ccl ON c.customer_id = ccl.customer_id
GROUP BY c.customer_id, c.tenant_id, c.customer_name, c.existing_debt, c.credit_limit;