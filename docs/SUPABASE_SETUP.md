# Supabase Setup - Step by Step

Follow these steps in order to connect a brand new Supabase project to this app.

## 1) Create your Supabase project
1. Open https://supabase.com and click New project.
2. Choose your organization.
3. Set project name (example: habesha-audit-platform).
4. Set a strong database password and save it.
5. Choose a region near Ethiopia if possible.
6. Wait for provisioning to complete.

## 2) Copy project API credentials
1. Open Project Settings > API.
2. Copy Project URL.
3. Copy the anon public key.

## 3) Add environment variables to the app
1. In project root, copy .env.example to .env.
2. Set values:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3. Save the file.

Example:
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

## 4) Create database schema
1. In Supabase, go to SQL Editor.
2. Open and run the SQL in supabase/bootstrap.sql.
3. Confirm all tables are created in Table Editor.

## 5) Create required storage bucket
1. Go to Storage > Buckets.
2. Create bucket named audit-photos.
3. Set the bucket to Public (for current app behavior).

## 6) Create auth users for initial roles
1. Go to Authentication > Users.
2. Add users manually for at least:
   - supervisor@habesha.local
   - enumerator@habesha.local
3. Set passwords you can remember.

## 7) Insert role profiles linked to auth users
1. In SQL Editor, run this query to view user IDs:
   select id, email from auth.users order by created_at desc;
2. Copy each user id.
3. Insert linked role records in profiles:

insert into public.profiles (id, full_name, role, assigned_zone)
values
  ('<SUPERVISOR_USER_ID>', 'Hiwot Tesfaye', 'supervisor', 'AA-C'),
  ('<ENUMERATOR_USER_ID>', 'Yonas Girma', 'enumerator', 'AA-C')
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  assigned_zone = excluded.assigned_zone;

## 8) Seed a few outlets for dashboard data
Run this sample insert in SQL Editor:

insert into public.outlets (name, outlet_type, zone, sub_city, address_text, lat, lng, owner_name, owner_phone)
values
  ('Tej Bet Desta', 'tej_house', 'AA-C', 'Kirkos', 'Bole Road', 9.010800, 38.761200, 'Ato Desta Hailu', '+251911234501'),
  ('Addis Bar & Restaurant', 'bar_restaurant', 'AA-N', 'Arada', 'Piazza Area', 9.034000, 38.746900, 'W/ro Almaz Bekele', '+251911234502'),
  ('Kazanchis Night Spot', 'nightclub', 'AA-C', 'Bole', 'Kazanchis', 9.017100, 38.760900, 'Ato Samuel Girma', '+251911234503')
on conflict do nothing;

## 9) Start the app locally
Run from app root:

npm install
npm run dev

## 10) Verify login and supervisor page
1. Login with your created supervisor user.
2. Open /supervisor.
3. If schema and profiles are configured correctly, the dashboard badge shows Live Supabase.

## Notes
- If environment keys are missing, login uses local demo credentials.
- If live data fetch fails, supervisor page automatically falls back to demo data and shows an error banner.
- We will connect real-time updates and advanced escalation messaging in the next phase.
