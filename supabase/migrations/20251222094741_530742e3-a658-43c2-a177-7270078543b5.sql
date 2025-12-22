-- Add BL metadata columns to crm_buyers table
ALTER TABLE public.crm_buyers
ADD COLUMN IF NOT EXISTS address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS website text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_phone text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_email text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS linkedin_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bl_destination_country text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bl_origin_country text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bl_hs_code text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bl_product_desc text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bl_row_fingerprint text DEFAULT NULL;

-- Add new credit action type for AI enrichment
ALTER TYPE public.credit_action_type ADD VALUE IF NOT EXISTS 'AI_ENRICH';