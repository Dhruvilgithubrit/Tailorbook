-- ==============================================================================
-- TailorBook Database Schema
-- Run this directly in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. TAILOR PROFILES (handled by Supabase Auth)
create table if not exists tailor_profiles (
  id uuid references auth.users on delete cascade primary key,
  shop_name text,
  owner_name text,
  phone text,
  address text,
  upi_id text,
  logo_url text,
  created_at timestamptz default now()
);

-- 2. CUSTOMERS
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  tailor_id uuid references auth.users on delete cascade,
  name text not null,
  phone text,
  whatsapp text,
  address text,
  created_at timestamptz default now()
);

-- 3. MEASUREMENTS
create table if not exists measurements (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers on delete cascade,
  item_type text, -- shirt/pant/suit/kurta/blouse/coat
  chest numeric,
  shoulder numeric,
  sleeve numeric,
  length numeric,
  collar numeric,
  waist numeric,
  hip numeric,
  thigh numeric,
  bottom numeric,
  notes text,
  created_at timestamptz default now()
);

-- 4. FABRICS
create table if not exists fabrics (
  id uuid default gen_random_uuid() primary key,
  tailor_id uuid references auth.users on delete cascade,
  color_name text,
  color_hex text,
  fabric_name text,
  price_per_meter numeric default 0,
  stock_meters numeric default 0,
  low_stock_alert_at numeric default 2.0,
  image_url text,
  created_at timestamptz default now()
);

-- 5. ORDERS
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  tailor_id uuid references auth.users on delete cascade,
  customer_id uuid references customers on delete set null,
  status text default 'received',
  -- received/cutting/first_fitting/alteration/ready/delivered
  advance_paid numeric default 0,
  payment_mode text,
  delivery_date date,
  is_urgent boolean default false,
  urgent_charge numeric default 0,
  notes text,
  bill_number serial,
  created_at timestamptz default now()
);

-- 6. ORDER ITEMS
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references orders on delete cascade,
  item_type text, -- shirt/pant/suit/kurta/blouse/coat
  fabric_source text default 'inventory', -- inventory/customer
  fabric_id uuid references fabrics on delete set null,
  customer_fabric_name text,
  fabric_meters numeric default 0,
  fabric_price numeric default 0,
  stitching_price numeric default 0,
  total_price numeric default 0,
  notes text
);

-- 7. STITCHING PRICES
create table if not exists stitching_prices (
  id uuid default gen_random_uuid() primary key,
  tailor_id uuid references auth.users on delete cascade,
  item_type text,
  price numeric default 0
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - ISOLATION PER TAILOR
-- ==============================================================================

alter table tailor_profiles enable row level security;
alter table customers enable row level security;
alter table measurements enable row level security;
alter table fabrics enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table stitching_prices enable row level security;

-- Tailor Profiles
create policy "Tailor can access own profile"
  on tailor_profiles for all
  using (auth.uid() = id);

-- Customers
create policy "Tailor can access own customers"
  on customers for all
  using (auth.uid() = tailor_id);

-- Measurements (linked through customer -> tailor_id)
create policy "Tailor can access customer measurements"
  on measurements for all
  using (
    exists (
      select 1 from customers c
      where c.id = measurements.customer_id
        and c.tailor_id = auth.uid()
    )
  );

-- Fabrics
create policy "Tailor can access own fabrics"
  on fabrics for all
  using (auth.uid() = tailor_id);

-- Orders
create policy "Tailor can access own orders"
  on orders for all
  using (auth.uid() = tailor_id);

-- Order Items (linked through order -> tailor_id)
create policy "Tailor can access own order items"
  on order_items for all
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.tailor_id = auth.uid()
    )
  );

-- Stitching Prices
create policy "Tailor can access own stitching prices"
  on stitching_prices for all
  using (auth.uid() = tailor_id);

