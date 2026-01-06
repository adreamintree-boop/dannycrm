-- Add new columns to strategy_reports table for structured JSON output
ALTER TABLE public.strategy_reports
ADD COLUMN IF NOT EXISTS model text DEFAULT 'grok-4-1-fast-reasoning',
ADD COLUMN IF NOT EXISTS report_json jsonb;