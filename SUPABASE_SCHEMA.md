# TailorBook — Supabase Schema & Setup

Paste this SQL into your **Supabase SQL Editor** (Dashboard → SQL Editor → New Query).

```sql
-- ══════════════════════════════════════════
--  TailorBook Database Schema
--  Run this in Supabase SQL Editor
-- ══════════════════════════════════════════

-- 1. Tailor Profiles (extends auth.users)
create table if not exists tailor_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  shop_name   text not null,
  owner_name  text not null,
  phone       text,
  email       text,
  address     text,
  upi_id      text,
  logo_url    text,
  created_at  timestamptz default now()
);

-- 2. Customers
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  tailor_id   uuid not null references tailor_profiles(id) on delete cascade,
  name        text not null,
  phone       text,
  whatsapp    text,
  address     text,
  created_at  timestamptz default now()
);

-- 3. Measurements (one row per customer per item type)
create table if not exists measurements (
  id          uuid primary key default gen_random_uuid(),
  tailor_id   uuid not null references tailor_profiles(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  item_type   text not null,   -- Shirt | Pant | Suit | Kurta | Blouse | Coat
  fields      jsonb default '{}',
  updated_at  timestamptz default now(),
  unique (customer_id, item_type)
);

-- 4. Fabrics
create table if not exists fabrics (
  id                uuid primary key default gen_random_uuid(),
  tailor_id         uuid not null references tailor_profiles(id) on delete cascade,
  name              text not null,
  color_name        text,
  color_hex         text default '#6366f1',
  price_per_meter   numeric(10,2) default 0,
  stock_meters      numeric(10,2) default 0,
  photo_url         text,
  created_at        timestamptz default now()
);

-- 5. Orders
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  tailor_id         uuid not null references tailor_profiles(id) on delete cascade,
  customer_id       uuid not null references customers(id),
  status            text not null default 'Received',
    -- Received | Cutting | First Fitting | Alteration | Ready | Delivered
  delivery_date     date,
  total_amount      numeric(10,2) default 0,
  advance_paid      numeric(10,2) default 0,
  remaining_balance numeric(10,2) default 0,
  payment_mode      text default 'Cash',
  is_urgent         boolean default false,
  urgent_charge     numeric(10,2) default 0,
  notes             text,
  bill_number       serial,
  created_at        timestamptz default now()
);

-- 6. Order Items
create table if not exists order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id) on delete cascade,
  item_type             text not null,
  fabric_source         text default 'inventory',  -- inventory | customer
  fabric_id             uuid references fabrics(id),
  fabric_name           text,
  fabric_meters         numeric(10,2) default 0,
  fabric_price_per_meter numeric(10,2) default 0,
  stitching_price       numeric(10,2) default 0
);

-- 7. Stitching Prices (master defaults per tailor)
create table if not exists stitching_prices (
  id          uuid primary key default gen_random_uuid(),
  tailor_id   uuid not null references tailor_profiles(id) on delete cascade,
  item_type   text not null,
  price       numeric(10,2) default 0,
  unique (tailor_id, item_type)
);

-- ══════════════════════════════════════════
--  Row Level Security (RLS)
-- ══════════════════════════════════════════

alter table tailor_profiles  enable row level security;
alter table customers        enable row level security;
alter table measurements     enable row level security;
alter table fabrics          enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table stitching_prices enable row level security;

-- tailor_profiles: user can only read/write their own row
create policy "own profile" on tailor_profiles
  for all using (auth.uid() = id);

-- customers: tailor only sees their own
create policy "own customers" on customers
  for all using (auth.uid() = tailor_id);

-- measurements
create policy "own measurements" on measurements
  for all using (auth.uid() = tailor_id);

-- fabrics
create policy "own fabrics" on fabrics
  for all using (auth.uid() = tailor_id);

-- orders
create policy "own orders" on orders
  for all using (auth.uid() = tailor_id);

-- order_items: access via parent order's tailor_id
create policy "own order_items" on order_items
  for all using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.tailor_id = auth.uid()
    )
  );

-- stitching_prices
create policy "own stitching_prices" on stitching_prices
  for all using (auth.uid() = tailor_id);
```

> [!IMPORTANT]
> After running the SQL, go to **Authentication → URL Configuration** in your Supabase dashboard and set:
> - **Site URL**: `http://localhost:5173` (dev) → your production URL later
> - **Redirect URLs**: add `http://localhost:5173/**`

## Getting your `.env` values

1. Go to your Supabase project → **Settings → API**
2. Copy **Project URL** → paste as `VITE_SUPABASE_URL`
3. Copy **anon public** key → paste as `VITE_SUPABASE_ANON_KEY`

