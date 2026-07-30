-- Optional X @handle from OAuth userinfo (preferred_username / screen_name)
alter table "user" add column if not exists "username" text;
