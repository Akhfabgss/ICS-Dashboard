create table public.card_registry (
  id uuid not null default gen_random_uuid (),
  cert_number character varying(30) not null,
  submission_id uuid null,
  card_name text not null,
  set_name text not null,
  card_number text null,
  language text null default 'Japanese'::text,
  tcg_type text null default 'OTHER'::text,
  final_grade numeric(3, 1) not null,
  grade_label text not null,
  sub_centering numeric(3, 1) not null,
  sub_corners numeric(3, 1) not null,
  sub_edges numeric(3, 1) not null,
  sub_surface numeric(3, 1) not null,
  grader_notes text null,
  front_image_url text not null,
  back_image_url text not null,
  nfc_uid character varying(100) null,
  is_encapsulated boolean null default true,
  is_frozen boolean null default false,
  created_at timestamp with time zone null default now(),
  collector_id uuid null,
  points integer not null default 0,
  constraint card_registry_pkey primary key (id),
  constraint card_registry_cert_number_key unique (cert_number),
  constraint card_registry_nfc_uid_key unique (nfc_uid),
  constraint card_registry_collector_id_fkey foreign KEY (collector_id) references collectors (id) on delete set null,
  constraint card_registry_submission_id_fkey foreign KEY (submission_id) references submissions (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_card_registry_collector_id on public.card_registry using btree (collector_id) TABLESPACE pg_default;

create table public.cash_flows (
  id uuid not null default gen_random_uuid (),
  date date not null default CURRENT_DATE,
  ref_id text not null,
  category text not null,
  description text null,
  amount numeric not null default 0,
  type text not null,
  created_at timestamp with time zone null default now(),
  constraint cash_flows_pkey primary key (id)
) TABLESPACE pg_default;

create table public.collectors (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  username text not null,
  display_name text not null,
  whatsapp_no text null,
  location text null default 'Indonesia'::text,
  bio text null,
  avatar_bg text not null default 'from-indigo-500 to-purple-600'::text,
  manual_points integer not null default 0,
  sets_completed integer not null default 0,
  badge text not null default 'Rookie Collector'::text,
  join_date date not null default CURRENT_DATE,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint collectors_pkey primary key (id),
  constraint collectors_username_key unique (username),
  constraint collectors_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create table public.lab_inventory (
  id uuid not null default gen_random_uuid (),
  sku text not null,
  name text not null,
  vendor text null,
  current_stock integer not null default 0,
  min_stock integer not null default 10,
  unit_cost numeric null default 0,
  status text null default 'Aman'::text,
  created_at timestamp with time zone null default now(),
  constraint lab_inventory_pkey primary key (id),
  constraint lab_inventory_sku_key unique (sku)
) TABLESPACE pg_default;

create table public.product_categories (
  id uuid not null default gen_random_uuid (),
  name text not null,
  slug text not null,
  status text null default 'Active'::text,
  created_at timestamp with time zone null default now(),
  sub_types text[] not null default array['OTHER'::text],
  constraint product_categories_pkey primary key (id),
  constraint product_categories_slug_key unique (slug)
) TABLESPACE pg_default;

create table public.product_recipes (
  id uuid not null default gen_random_uuid (),
  product_id uuid null,
  inventory_id uuid null,
  quantity_required integer not null default 1,
  created_at timestamp with time zone null default now(),
  constraint product_recipes_pkey primary key (id),
  constraint product_recipes_inventory_id_fkey foreign KEY (inventory_id) references lab_inventory (id) on delete CASCADE,
  constraint product_recipes_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.product_recipes (
  id uuid not null default gen_random_uuid (),
  product_id uuid null,
  inventory_id uuid null,
  quantity_required integer not null default 1,
  created_at timestamp with time zone null default now(),
  constraint product_recipes_pkey primary key (id),
  constraint product_recipes_inventory_id_fkey foreign KEY (inventory_id) references lab_inventory (id) on delete CASCADE,
  constraint product_recipes_product_id_fkey foreign KEY (product_id) references products (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null,
  username text null,
  full_name text null,
  whatsapp_no text null,
  role text null default 'COLLECTOR'::text,
  created_at timestamp with time zone null default now(),
  is_profile_completed boolean null default false,
  address text null,
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profiles_role_check check (
    (
      role = any (
        array[
          'OWNER'::text,
          'ADMIN'::text,
          'SENIOR_GRADER'::text,
          'OPERATOR'::text,
          'COLLECTOR'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;


create table public.stock_mutations (
  id uuid not null default gen_random_uuid (),
  item_id uuid null,
  item_sku text not null,
  item_name text not null,
  type text not null,
  quantity integer not null,
  reference_no text null,
  notes text null,
  created_at timestamp with time zone null default now(),
  constraint stock_mutations_pkey primary key (id),
  constraint stock_mutations_item_id_fkey foreign KEY (item_id) references lab_inventory (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.submissions (
  id uuid not null default gen_random_uuid (),
  order_no character varying(20) not null,
  total_cards integer not null default 1,
  total_price numeric(12, 2) not null,
  payment_status text null default 'UNPAID'::text,
  status public.submission_status null default 'PENDING_RECEIPT'::submission_status,
  courier_service text null,
  assigned_grader_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  address text null,
  phone_number text null,
  collector_name text null,
  subtotal numeric(12, 2) null default 0,
  shipping_cost numeric(12, 2) null default 0,
  discount_amount numeric(12, 2) null default 0,
  product_id uuid null,
  category_name text null,
  dp_amount numeric(12, 2) null default 0,
  repayment_amount numeric(12, 2) null default 0,
  constraint submissions_pkey primary key (id),
  constraint submissions_order_no_key unique (order_no),
  constraint submissions_assigned_grader_id_fkey foreign KEY (assigned_grader_id) references profiles (id),
  constraint submissions_product_id_fkey foreign KEY (product_id) references products (id) on delete set null,
  constraint submissions_payment_status_check check (
    (
      payment_status = any (array['UNPAID'::text, 'DP'::text, 'PAID'::text])
    )
  )
) TABLESPACE pg_default;

create trigger trg_sync_submission_cashflow
after INSERT
or DELETE
or
update OF payment_status,
total_price,
dp_amount,
collector_name on submissions for EACH row
execute FUNCTION fn_sync_submission_cashflow ();