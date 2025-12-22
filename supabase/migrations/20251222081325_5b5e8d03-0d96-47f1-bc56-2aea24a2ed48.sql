-- Create enum for search types
CREATE TYPE public.bl_search_type AS ENUM ('bl', 'product', 'hs_code', 'importer', 'exporter');

-- Create bl_search_history table
CREATE TABLE public.bl_search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  search_type public.bl_search_type NOT NULL,
  keyword TEXT NOT NULL DEFAULT '',
  date_from DATE,
  date_to DATE,
  filters_json JSONB DEFAULT '[]'::jsonb,
  query_hash TEXT NOT NULL,
  last_opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  result_total_count INTEGER DEFAULT 0,
  last_viewed_page INTEGER DEFAULT 1,
  viewed_row_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Ensure unique query per user
  CONSTRAINT unique_user_query UNIQUE (user_id, query_hash)
);

-- Create index for faster lookups
CREATE INDEX idx_bl_search_history_user_id ON public.bl_search_history(user_id);
CREATE INDEX idx_bl_search_history_last_opened ON public.bl_search_history(user_id, last_opened_at DESC);

-- Enable RLS
ALTER TABLE public.bl_search_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see/modify their own history
CREATE POLICY "Users can view their own search history"
ON public.bl_search_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
ON public.bl_search_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search history"
ON public.bl_search_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
ON public.bl_search_history
FOR DELETE
USING (auth.uid() = user_id);