-- Run this in your Supabase project's SQL Editor (Supabase dashboard > SQL Editor > New query)

-- 1. Create the table that stores every posted outfit
create table if not exists outfits (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  title text not null,
  price text not null,
  image_url text not null,
  links jsonb not null default '[]'::jsonb,
  author text
);

-- 2. Allow anyone to read and insert posts (fine for an MVP with no login system yet)
alter table outfits enable row level security;

create policy "Anyone can view outfits"
  on outfits for select
  using (true);

create policy "Anyone can post outfits"
  on outfits for insert
  with check (true);

-- 3. Create a public storage bucket for outfit photos
-- Go to Storage in the Supabase dashboard, click "New bucket", name it exactly: outfit-images
-- Toggle "Public bucket" ON when creating it.
-- Then run this to allow uploads to that bucket:

create policy "Anyone can upload outfit images"
  on storage.objects for insert
  with check (bucket_id = 'outfit-images');

create policy "Anyone can view outfit images"
  on storage.objects for select
  using (bucket_id = 'outfit-images');
