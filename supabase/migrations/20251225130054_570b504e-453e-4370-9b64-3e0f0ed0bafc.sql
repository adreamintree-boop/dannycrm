-- Create strategy_reports table to store generated reports
CREATE TABLE public.strategy_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES public.company_surveys(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  product_name TEXT,
  target_regions TEXT[],
  credit_cost INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategy_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reports"
ON public.strategy_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
ON public.strategy_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
ON public.strategy_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_strategy_reports_user_id ON public.strategy_reports(user_id);
CREATE INDEX idx_strategy_reports_created_at ON public.strategy_reports(created_at DESC);