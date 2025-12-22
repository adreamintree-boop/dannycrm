-- Create ai_requests table for logging all AI enrichment requests
CREATE TABLE public.ai_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  buyer_id UUID REFERENCES public.crm_buyers(id) ON DELETE SET NULL,
  credit_cost INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  input_json JSONB,
  output_json JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_requests
CREATE POLICY "Users can view their own ai_requests"
ON public.ai_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai_requests"
ON public.ai_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai_requests"
ON public.ai_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_ai_requests_user_id ON public.ai_requests(user_id);
CREATE INDEX idx_ai_requests_buyer_id ON public.ai_requests(buyer_id);
CREATE INDEX idx_ai_requests_created_at ON public.ai_requests(created_at DESC);