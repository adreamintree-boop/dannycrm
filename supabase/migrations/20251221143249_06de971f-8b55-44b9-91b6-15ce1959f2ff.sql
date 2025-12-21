-- Add new editable profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role_position text,
ADD COLUMN IF NOT EXISTS email_local text,
ADD COLUMN IF NOT EXISTS email_domain text,
ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '+82',
ADD COLUMN IF NOT EXISTS phone_number text;