-- Optional alternative to a Supabase secret/service role key.
-- Generate SUPABASE_DEMO_KEY as 32 cryptographic random bytes, keep it only in
-- server environment, and substitute SHA256_HEX_OF_SERVER_DEMO_KEY below.
-- Apply after schema.sql. This hash is deployment-specific, never a default key.
-- The app sends the secret ONLY server-to-Supabase, in x-demo-key.
grant select, insert, update on public.demo_sessions to anon;

create policy server_capability_select on public.demo_sessions for select to anon
using (encode(extensions.digest(coalesce(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-demo-key', ''), 'sha256'), 'hex') = 'SHA256_HEX_OF_SERVER_DEMO_KEY');
create policy server_capability_insert on public.demo_sessions for insert to anon
with check (encode(extensions.digest(coalesce(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-demo-key', ''), 'sha256'), 'hex') = 'SHA256_HEX_OF_SERVER_DEMO_KEY');
create policy server_capability_update on public.demo_sessions for update to anon
using (encode(extensions.digest(coalesce(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-demo-key', ''), 'sha256'), 'hex') = 'SHA256_HEX_OF_SERVER_DEMO_KEY')
with check (encode(extensions.digest(coalesce(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-demo-key', ''), 'sha256'), 'hex') = 'SHA256_HEX_OF_SERVER_DEMO_KEY');
-- No DELETE privilege; no authenticated role grants; browser publishable key
-- alone sees zero rows and cannot insert or update financial state.
