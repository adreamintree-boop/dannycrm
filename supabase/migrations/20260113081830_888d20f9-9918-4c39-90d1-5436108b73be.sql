-- Create table for buyer enrichment runs (audit trail)
CREATE TABLE public.buyer_enrichment_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  buyer_id UUID REFERENCES public.crm_buyers(id) ON DELETE CASCADE,
  input_json JSONB NOT NULL,
  output_json JSONB NOT NULL,
  enrichment_summary TEXT,
  confidence_level TEXT,
  evidence JSONB,
  credit_cost INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_enrichment_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own enrichment runs" 
ON public.buyer_enrichment_runs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enrichment runs" 
ON public.buyer_enrichment_runs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_buyer_enrichment_runs_user_id ON public.buyer_enrichment_runs(user_id);
CREATE INDEX idx_buyer_enrichment_runs_buyer_id ON public.buyer_enrichment_runs(buyer_id);
CREATE INDEX idx_buyer_enrichment_runs_created_at ON public.buyer_enrichment_runs(created_at DESC);