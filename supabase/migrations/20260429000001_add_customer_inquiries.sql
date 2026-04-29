create extension if not exists pgcrypto;

create table if not exists public.customer_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  contact_channel text not null,
  contact_value text not null,
  service_type text not null,
  route text not null default 'TH-MM',
  weight_kg numeric(10, 2),
  billable_weight_kg numeric(10, 2),
  rate_per_kg numeric(10, 2),
  estimated_cargo_fee numeric(12, 2),
  product_cost_thb numeric(12, 2),
  shopping_commission numeric(12, 2),
  estimated_total_thb numeric(12, 2),
  item_description text,
  pickup_address text,
  delivery_address text,
  notes text,
  status text not null default 'new',
  converted_shipment_id uuid references public.shipments(id) on delete set null,
  converted_shopping_order_id uuid references public.shopping_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_inquiries_contact_channel_check check (
    contact_channel in ('phone', 'facebook', 'line', 'telegram', 'email', 'other')
  ),
  constraint customer_inquiries_service_type_check check (
    service_type in ('air_cargo', 'land_cargo', 'shopping_proxy', 'hybrid')
  ),
  constraint customer_inquiries_route_check check (route in ('TH-MM', 'MM-TH')),
  constraint customer_inquiries_status_check check (
    status in ('new', 'contacted', 'quoted', 'converted', 'cancelled')
  ),
  constraint customer_inquiries_nonnegative_amounts_check check (
    coalesce(weight_kg, 0) >= 0
    and coalesce(billable_weight_kg, 0) >= 0
    and coalesce(rate_per_kg, 0) >= 0
    and coalesce(estimated_cargo_fee, 0) >= 0
    and coalesce(product_cost_thb, 0) >= 0
    and coalesce(shopping_commission, 0) >= 0
    and coalesce(estimated_total_thb, 0) >= 0
  )
);

alter table public.customer_inquiries enable row level security;

revoke all on public.customer_inquiries from anon;
revoke all on public.customer_inquiries from authenticated;

grant insert (
  customer_name,
  contact_channel,
  contact_value,
  service_type,
  route,
  weight_kg,
  billable_weight_kg,
  rate_per_kg,
  estimated_cargo_fee,
  product_cost_thb,
  shopping_commission,
  estimated_total_thb,
  item_description,
  pickup_address,
  delivery_address,
  notes
) on public.customer_inquiries to anon, authenticated;

grant select, update on public.customer_inquiries to authenticated;

drop policy if exists "Public can create customer inquiries" on public.customer_inquiries;
create policy "Public can create customer inquiries"
  on public.customer_inquiries
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and converted_shipment_id is null
    and converted_shopping_order_id is null
  );

drop policy if exists "Staff can view customer inquiries" on public.customer_inquiries;
create policy "Staff can view customer inquiries"
  on public.customer_inquiries
  for select
  to authenticated
  using (public.can_view_shipments() = true);

drop policy if exists "Staff can update customer inquiries" on public.customer_inquiries;
create policy "Staff can update customer inquiries"
  on public.customer_inquiries
  for update
  to authenticated
  using (public.can_view_shipments() = true)
  with check (public.can_view_shipments() = true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_inquiries_set_updated_at on public.customer_inquiries;
create trigger customer_inquiries_set_updated_at
  before update on public.customer_inquiries
  for each row
  execute function public.set_updated_at();

create index if not exists idx_customer_inquiries_status
  on public.customer_inquiries(status);

create index if not exists idx_customer_inquiries_created_at
  on public.customer_inquiries(created_at desc);

create index if not exists idx_customer_inquiries_contact
  on public.customer_inquiries(contact_channel, contact_value);

create index if not exists idx_customer_inquiries_converted_shipment_id
  on public.customer_inquiries(converted_shipment_id);

create index if not exists idx_customer_inquiries_converted_shopping_order_id
  on public.customer_inquiries(converted_shopping_order_id);

create index if not exists idx_customer_inquiries_open_queue
  on public.customer_inquiries(created_at desc)
  where status in ('new', 'contacted', 'quoted');
