-- R R R CMS schema for the existing Supabase project
-- Run once in Supabase SQL Editor, then create an Auth user for the site owner.

create extension if not exists pgcrypto;

create table if not exists public.rrr_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.rrr_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rrr_admin_users where user_id = auth.uid()
  );
$$;

create table if not exists public.rrr_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rrr_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.rrr_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text,
  short_description text,
  description text,
  price_label text,
  image_url text,
  datasheet_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rrr_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.rrr_products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.rrr_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  location text,
  summary text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rrr_project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.rrr_projects(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.rrr_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  description text,
  logo_url text,
  website_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rrr_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  description text,
  logo_url text,
  website_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rrr_company_profile (
  id text primary key default 'main',
  company_name text not null default 'شركة آر آر آر للتجارة',
  headline text,
  about text,
  vision text,
  mission text,
  values_text text,
  phone text,
  whatsapp text,
  address text,
  email text,
  updated_at timestamptz not null default now()
);

create or replace function public.rrr_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['rrr_categories','rrr_products','rrr_projects','rrr_clients','rrr_suppliers','rrr_company_profile']
  loop
    execute format('drop trigger if exists rrr_set_updated_at on public.%I', t);
    execute format('create trigger rrr_set_updated_at before update on public.%I for each row execute function public.rrr_set_updated_at()', t);
  end loop;
end $$;

insert into public.rrr_company_profile (
  id, company_name, headline, about, vision, mission, values_text, phone, whatsapp, address
) values (
  'main',
  'شركة آر آر آر للتجارة',
  'مواد موثوقة. توريد يواكب مشروعك.',
  'متخصصون في توريد الجبس بورد وبدائل الرخام والخشب ومواد التشطيب للمشاريع والمقاولين.',
  'أن نكون خيارًا موثوقًا للمشاريع والمقاولين في المدينة المنورة.',
  'تبسيط رحلة طلب مواد التشطيب من تحديد الاحتياج إلى تنسيق التوريد.',
  'الوضوح في التعامل، الاحترام في التواصل، والعناية بالتفاصيل.',
  '+966 55 461 0355',
  '966554610355',
  'المدينة المنورة - حي العروة'
) on conflict (id) do nothing;

alter table public.rrr_admin_users enable row level security;
alter table public.rrr_categories enable row level security;
alter table public.rrr_products enable row level security;
alter table public.rrr_product_images enable row level security;
alter table public.rrr_projects enable row level security;
alter table public.rrr_project_images enable row level security;
alter table public.rrr_clients enable row level security;
alter table public.rrr_suppliers enable row level security;
alter table public.rrr_company_profile enable row level security;

drop policy if exists "rrr admins see themselves" on public.rrr_admin_users;
create policy "rrr admins see themselves" on public.rrr_admin_users
for select to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['rrr_categories','rrr_products','rrr_projects','rrr_clients','rrr_suppliers','rrr_company_profile']
  loop
    execute format('drop policy if exists "public reads active %s" on public.%I', t, t);
    if t = 'rrr_company_profile' then
      execute format('create policy "public reads active %s" on public.%I for select using (true)', t, t);
    else
      execute format('create policy "public reads active %s" on public.%I for select using (is_active = true or public.rrr_is_admin())', t, t);
    end if;
    execute format('drop policy if exists "admins insert %s" on public.%I', t, t);
    execute format('create policy "admins insert %s" on public.%I for insert to authenticated with check (public.rrr_is_admin())', t, t);
    execute format('drop policy if exists "admins update %s" on public.%I', t, t);
    execute format('create policy "admins update %s" on public.%I for update to authenticated using (public.rrr_is_admin()) with check (public.rrr_is_admin())', t, t);
    execute format('drop policy if exists "admins delete %s" on public.%I', t, t);
    execute format('create policy "admins delete %s" on public.%I for delete to authenticated using (public.rrr_is_admin())', t, t);
  end loop;
end $$;

drop policy if exists "public reads active product images" on public.rrr_product_images;
create policy "public reads active product images" on public.rrr_product_images
for select using (
  public.rrr_is_admin() or exists (
    select 1 from public.rrr_products p
    where p.id = product_id and p.is_active = true
  )
);

drop policy if exists "admins manage product images" on public.rrr_product_images;
create policy "admins manage product images" on public.rrr_product_images
for all to authenticated using (public.rrr_is_admin()) with check (public.rrr_is_admin());

drop policy if exists "public reads active project images" on public.rrr_project_images;
create policy "public reads active project images" on public.rrr_project_images
for select using (
  public.rrr_is_admin() or exists (
    select 1 from public.rrr_projects p
    where p.id = project_id and p.is_active = true
  )
);

drop policy if exists "admins manage project images" on public.rrr_project_images;
create policy "admins manage project images" on public.rrr_project_images
for all to authenticated using (public.rrr_is_admin()) with check (public.rrr_is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rrr-assets',
  'rrr-assets',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads rrr assets" on storage.objects;
create policy "public reads rrr assets" on storage.objects
for select using (bucket_id = 'rrr-assets');

drop policy if exists "admins upload rrr assets" on storage.objects;
create policy "admins upload rrr assets" on storage.objects
for insert to authenticated with check (bucket_id = 'rrr-assets' and public.rrr_is_admin());

drop policy if exists "admins update rrr assets" on storage.objects;
create policy "admins update rrr assets" on storage.objects
for update to authenticated using (bucket_id = 'rrr-assets' and public.rrr_is_admin());

drop policy if exists "admins delete rrr assets" on storage.objects;
create policy "admins delete rrr assets" on storage.objects
for delete to authenticated using (bucket_id = 'rrr-assets' and public.rrr_is_admin());

-- After creating the admin in Authentication > Users, run:
-- insert into public.rrr_admin_users (user_id) values ('ADMIN_USER_UUID');
