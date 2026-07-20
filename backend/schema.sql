-- BuzzNa D74 Cloud Operating System
-- PostgreSQL Database Schema with Multi-Tenant RLS

-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally
ALTER SYSTEM SET row_security = on;

-- ==============================================================================
-- TENANT MANAGEMENT (Multi-Tenant Core)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS businesses (
  tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  industry VARCHAR(100),
  country VARCHAR(100),
  currency VARCHAR(3) DEFAULT 'KES',
  language VARCHAR(10) DEFAULT 'EN',
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  license_status VARCHAR(50) DEFAULT 'TRIAL_ACTIVE',
  license_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_businesses_created_at ON businesses(created_at);
CREATE INDEX idx_businesses_license_status ON businesses(license_status);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business" ON businesses
  FOR SELECT USING (TRUE);

CREATE POLICY "Only system can insert" ON businesses
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Owners can update own business" ON businesses
  FOR UPDATE USING (TRUE);

-- ==============================================================================
-- BUSINESS SETTINGS & CONFIGURATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS business_settings (
  tenant_id UUID PRIMARY KEY REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  chosen_theme VARCHAR(50) DEFAULT 'retail',
  brand_color VARCHAR(20) DEFAULT '#2563EB',
  daily_revenue_target BIGINT DEFAULT 10000,
  weekly_revenue_target BIGINT DEFAULT 70000,
  monthly_revenue_target BIGINT DEFAULT 300000,
  daraja_paybill VARCHAR(20),
  daraja_till_number VARCHAR(20),
  daraja_api_key VARCHAR(255),
  eod_time VARCHAR(5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON business_settings
  FOR SELECT USING (TRUE);

-- ==============================================================================
-- USER MANAGEMENT & RBAC
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'CASHIER')),
  username VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  email_address VARCHAR(255),
  password VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, username)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant's users" ON users
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE user_id = auth.uid())
  );

-- ==============================================================================
-- INVENTORY MANAGEMENT
-- ==============================================================================

CREATE TABLE IF NOT EXISTS categories (
  category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, category_name)
);

CREATE INDEX idx_categories_tenant ON categories(tenant_id);

CREATE TABLE IF NOT EXISTS products (
  product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
  barcode VARCHAR(100),
  product_name VARCHAR(255) NOT NULL,
  cost_floor NUMERIC(10, 2) NOT NULL DEFAULT 0,
  retail_price NUMERIC(10, 2) NOT NULL,
  current_quantity BIGINT DEFAULT 0,
  is_serialized BOOLEAN DEFAULT FALSE,
  expiry_date DATE,
  supplier_id UUID,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, barcode)
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant's products" ON products
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS inventory_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'STOCK_ADD', 'SALE_DISPATCH', 'SPOILAGE', 'DAMAGE',
      'THEFT_LOSS', 'REFUND_RETURN', 'STOCK_CORRECTION'
    )
  ),
  quantity_delta BIGINT NOT NULL,
  reason_code VARCHAR(100),
  terminal_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_events_tenant ON inventory_events(tenant_id);
CREATE INDEX idx_inventory_events_product ON inventory_events(product_id);
CREATE INDEX idx_inventory_events_type ON inventory_events(event_type);

-- ==============================================================================
-- SALES & TRANSACTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS till_sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  opening_float NUMERIC(10, 2) NOT NULL,
  expected_cash_balance NUMERIC(10, 2),
  actual_cash_balance NUMERIC(10, 2),
  session_status VARCHAR(20) NOT NULL CHECK (session_status IN ('OPEN', 'CLOSED')),
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_till_sessions_tenant ON till_sessions(tenant_id);
CREATE INDEX idx_till_sessions_user ON till_sessions(user_id);
CREATE INDEX idx_till_sessions_status ON till_sessions(session_status);

CREATE TABLE IF NOT EXISTS sales_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES till_sessions(session_id) ON DELETE RESTRICT,
  customer_id UUID,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH', 'MPESA', 'DEBT', 'SPLIT')),
  payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED', 'FAILED')),
  gross_total NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  terminal_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_transactions_tenant ON sales_transactions(tenant_id);
CREATE INDEX idx_sales_transactions_session ON sales_transactions(session_id);
CREATE INDEX idx_sales_transactions_customer ON sales_transactions(customer_id);
CREATE INDEX idx_sales_transactions_payment_status ON sales_transactions(payment_status);
CREATE INDEX idx_sales_transactions_created_at ON sales_transactions(created_at);

CREATE TABLE IF NOT EXISTS sale_items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity BIGINT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sale_items_transaction ON sale_items(transaction_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

CREATE TABLE IF NOT EXISTS payment_allocations (
  allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
  allocated_method VARCHAR(20) NOT NULL CHECK (allocated_method IN ('CASH', 'MPESA', 'DEBT')),
  allocated_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_allocations_transaction ON payment_allocations(transaction_id);

-- ==============================================================================
-- CUSTOMER MANAGEMENT & CREDIT TRACKING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email_address VARCHAR(255),
  credit_limit NUMERIC(10, 2) DEFAULT 0,
  existing_debt NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_email ON customers(email_address);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant's customers" ON customers
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS customer_credit_ledger (
  ledger_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  transaction_id UUID,
  amount_delta NUMERIC(10, 2) NOT NULL,
  running_balance NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_ledger_tenant ON customer_credit_ledger(tenant_id);
CREATE INDEX idx_credit_ledger_customer ON customer_credit_ledger(customer_id);
CREATE INDEX idx_credit_ledger_created_at ON customer_credit_ledger(created_at);

-- ==============================================================================
-- EXPENSE TRACKING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  expense_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  expense_name VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (
    category IN ('RENT', 'SALARIES', 'STOCK', 'UTILITIES', 'OTHER')
  ),
  description TEXT,
  recorded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  incurred_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_incurred_date ON expenses(incurred_date);

-- ==============================================================================
-- SYNC QUEUE (Offline-First Architecture)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sync_queue (
  queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL CHECK (
    entity_type IN ('sale', 'inventory_event', 'customer', 'customer_credit', 'expense', 'till_session')
  ),
  entity_id UUID,
  payload JSONB NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SUCCESS', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX idx_sync_queue_tenant ON sync_queue(tenant_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(sync_status);
CREATE INDEX idx_sync_queue_entity_type ON sync_queue(entity_type);

-- ==============================================================================
-- ERROR & ACTIVITY LOGGING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  user_id UUID,
  tenant_id UUID,
  user_agent TEXT,
  url TEXT,
  severity VARCHAR(20) DEFAULT 'error',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_error_logs_tenant ON error_logs(tenant_id);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS activity_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES businesses(tenant_id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;